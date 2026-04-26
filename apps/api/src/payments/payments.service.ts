import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { OrderStatus } from '@bolena/shared';

@Injectable()
export class PaymentsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreatePaymentDto, userId: string) {
    return this.prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id: dto.orderId },
        include: { payments: true },
      });
      if (!order) throw new NotFoundException('Siparis bulunamadi');

      const totalPaid = order.payments.reduce(
        (sum, p) => sum + p.amountCents,
        0,
      );
      const remaining =
        Math.max(0, order.totalCents - (order.discountCents || 0)) - totalPaid;

      if (dto.amountCents > remaining) {
        throw new BadRequestException(
          `Kalan tutar ${remaining} kurus, fazla odeme yapilamaz`,
        );
      }

      const payment = await tx.payment.create({
        data: {
          orderId: dto.orderId,
          userId,
          amountCents: dto.amountCents,
          method: dto.method,
          note: dto.note,
        },
      });

      // Audit log
      await tx.auditLog.create({
        data: {
          userId,
          action: 'PAYMENT_RECEIVED',
          entity: 'payment',
          entityId: payment.id,
          details: {
            amountCents: dto.amountCents,
            method: dto.method,
            orderId: dto.orderId,
          },
        },
      });

      // Tam odeme yapildiysa siparisi tamamla
      if (
        totalPaid + dto.amountCents >=
        Math.max(0, order.totalCents - (order.discountCents || 0))
      ) {
        await tx.order.update({
          where: { id: dto.orderId },
          data: { status: OrderStatus.COMPLETED },
        });

        // Masayi bosalt
        if (order.tableId) {
          const activeOrders = await tx.order.count({
            where: {
              tableId: order.tableId,
              id: { not: order.id },
              status: {
                in: [
                  OrderStatus.PENDING,
                  OrderStatus.PREPARING,
                  OrderStatus.READY,
                  OrderStatus.SERVED,
                ],
              },
            },
          });
          if (activeOrders === 0) {
            await tx.table.update({
              where: { id: order.tableId },
              data: { status: 'AVAILABLE' },
            });
          }
        }
      }

      return payment;
    });
  }

  findByOrder(orderId: string) {
    return this.prisma.payment.findMany({
      where: { orderId },
      include: { user: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }
}
