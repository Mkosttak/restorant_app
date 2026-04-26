import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  async getDailySummary(date: string) {
    const start = new Date(date);
    const end = new Date(date);
    end.setDate(end.getDate() + 1);

    // SQL aggregation ile bellek yuku azaltildi
    const [orderAgg, paymentAgg, itemAgg, paymentMethods] = await Promise.all([
      this.prisma.order.aggregate({
        where: {
          createdAt: { gte: start, lt: end },
          status: { not: 'CANCELLED' },
        },
        _sum: { totalCents: true },
        _count: { id: true },
      }),
      this.prisma.payment.aggregate({
        where: { createdAt: { gte: start, lt: end } },
        _sum: { amountCents: true },
      }),
      this.prisma.orderItem.aggregate({
        where: {
          order: {
            createdAt: { gte: start, lt: end },
            status: { not: 'CANCELLED' },
          },
        },
        _sum: { quantity: true },
      }),
      this.prisma.payment.groupBy({
        by: ['method'],
        where: { createdAt: { gte: start, lt: end } },
        _sum: { amountCents: true },
      }),
    ]);

    const totalRevenue = orderAgg._sum.totalCents || 0;
    const totalPayments = paymentAgg._sum.amountCents || 0;
    const orderCount = orderAgg._count.id || 0;
    const itemCount = itemAgg._sum.quantity || 0;

    return {
      date,
      totalRevenue,
      totalPayments,
      unpaid: totalRevenue - totalPayments,
      orderCount,
      itemCount,
      avgOrderValue: orderCount > 0 ? Math.round(totalRevenue / orderCount) : 0,
      paymentMethods: paymentMethods.reduce(
        (acc, pm) => ({ ...acc, [pm.method]: pm._sum.amountCents || 0 }),
        {} as Record<string, number>,
      ),
    };
  }

  async getDateRangeSummary(startDate: string, endDate: string) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setDate(end.getDate() + 1);

    const [totalAgg, orders] = await Promise.all([
      this.prisma.order.aggregate({
        where: {
          createdAt: { gte: start, lt: end },
          status: { not: 'CANCELLED' },
        },
        _sum: { totalCents: true },
        _count: { id: true },
      }),
      this.prisma.order.findMany({
        where: {
          createdAt: { gte: start, lt: end },
          status: { not: 'CANCELLED' },
        },
        select: { createdAt: true, totalCents: true },
      }),
    ]);

    // Gunluk kirilim
    const dailyMap: Record<string, { revenue: number; orders: number }> = {};
    orders.forEach((o) => {
      const day = o.createdAt.toISOString().split('T')[0];
      if (!dailyMap[day]) dailyMap[day] = { revenue: 0, orders: 0 };
      dailyMap[day].revenue += o.totalCents;
      dailyMap[day].orders += 1;
    });

    return {
      startDate,
      endDate,
      totalRevenue: totalAgg._sum.totalCents || 0,
      orderCount: totalAgg._count.id || 0,
      dailyBreakdown: Object.entries(dailyMap)
        .map(([date, data]) => ({ date, ...data }))
        .sort((a, b) => a.date.localeCompare(b.date)),
    };
  }

  async getTopProducts(startDate?: string, endDate?: string, limit = 10) {
    const where: Record<string, unknown> = {};
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      end.setDate(end.getDate() + 1);
      where.order = {
        createdAt: { gte: start, lt: end },
        status: { not: 'CANCELLED' },
      };
    }

    const items = await this.prisma.orderItem.groupBy({
      by: ['menuItemId'],
      where,
      _sum: { quantity: true },
      orderBy: { _sum: { quantity: 'desc' } },
      take: limit,
    });

    // Urun isimlerini al
    const menuItemIds = items.map((i) => i.menuItemId);
    const menuItems = await this.prisma.menuItem.findMany({
      where: { id: { in: menuItemIds } },
      select: { id: true, nameTr: true, priceCents: true },
    });
    const menuMap = new Map(menuItems.map((m) => [m.id, m]));

    return items.map((item) => {
      const menu = menuMap.get(item.menuItemId);
      return {
        name: menu?.nameTr || 'Bilinmiyor',
        quantity: item._sum.quantity || 0,
        revenue: (item._sum.quantity || 0) * (menu?.priceCents || 0),
      };
    });
  }
}
