import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateOrderDto, AddOrderItemDto } from './dto/create-order.dto';
import { OrderStatus, OrderType } from '@bolena/shared';
import {
  PaginationQueryDto,
  paginate,
  createPaginatedResult,
} from '../common/dto/pagination.dto';

@Injectable()
export class OrdersService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  async findAll(
    filters?: {
      status?: string;
      tableId?: string;
      orderType?: string;
      date?: string;
    },
    pagination?: PaginationQueryDto,
  ) {
    const where: Record<string, unknown> = {};
    if (filters?.status) where.status = filters.status;
    if (filters?.tableId) where.tableId = filters.tableId;
    if (filters?.orderType) where.orderType = filters.orderType;
    if (filters?.date) {
      const start = new Date(filters.date);
      const end = new Date(filters.date);
      end.setDate(end.getDate() + 1);
      where.createdAt = { gte: start, lt: end };
    }

    const page = pagination?.page || 1;
    const limit = pagination?.limit || 20;

    const [data, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        include: {
          table: true,
          user: { select: { id: true, name: true } },
          items: { include: { menuItem: true } },
          payments: true,
        },
        orderBy: { createdAt: 'desc' },
        ...paginate(page, limit),
      }),
      this.prisma.order.count({ where }),
    ]);

    return createPaginatedResult(data, total, page, limit);
  }

  findActive() {
    return this.prisma.order.findMany({
      where: {
        status: {
          in: [
            OrderStatus.PENDING,
            OrderStatus.PREPARING,
            OrderStatus.READY,
            OrderStatus.SERVED,
          ],
        },
      },
      include: {
        table: true,
        user: { select: { id: true, name: true } },
        items: { include: { menuItem: true } },
        payments: true,
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async findOne(id: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        table: true,
        user: { select: { id: true, name: true, email: true } },
        items: { include: { menuItem: { include: { category: true } } } },
        payments: { include: { user: { select: { id: true, name: true } } } },
      },
    });
    if (!order) throw new NotFoundException('Siparis bulunamadi');
    return order;
  }

  async create(dto: CreateOrderDto, userId: string) {
    return this.prisma.$transaction(async (tx) => {
      // Fiyat snapshot'larini al
      const itemsWithPrices = await Promise.all(
        dto.items.map(async (item) => {
          const menuItem = await tx.menuItem.findFirst({
            where: { id: item.menuItemId, deletedAt: null },
            include: { options: { where: { isActive: true } } },
          });
          if (!menuItem)
            throw new BadRequestException(
              `Menu ogesi bulunamadi: ${item.menuItemId}`,
            );
          if (!menuItem.isAvailable)
            throw new BadRequestException(
              `${menuItem.nameTr} su an mevcut degil`,
            );

          // Stok kontrolu
          if (
            menuItem.stockTracking &&
            menuItem.stockCount !== null &&
            menuItem.stockCount < item.quantity
          ) {
            throw new BadRequestException(
              `${menuItem.nameTr} icin yeterli stok yok (kalan: ${menuItem.stockCount})`,
            );
          }

          const baseUnitPrice = item.isComplimentary
            ? 0
            : (menuItem.campaignPriceCents ?? menuItem.priceCents);

          // Opsiyonlardan gelen ekstra fiyatlari ekle
          let optionsExtraCents = 0;
          let normalizedOptions: unknown = item.selectedOptions;

          if (Array.isArray(item.selectedOptions)) {
            const selectedIds = item.selectedOptions.filter(
              (o): o is string => typeof o === 'string',
            );
            if (selectedIds.length > 0) {
              const validOptions = menuItem.options.filter((opt) =>
                selectedIds.includes(opt.id),
              );
              if (validOptions.length !== selectedIds.length) {
                throw new BadRequestException('Gecersiz menu opsiyonu secimi');
              }
              optionsExtraCents = validOptions.reduce(
                (sum, opt) => sum + opt.extraPriceCents,
                0,
              );
              normalizedOptions = validOptions.map((opt) => ({
                id: opt.id,
                nameTr: opt.nameTr,
                nameEn: opt.nameEn,
                extraPriceCents: opt.extraPriceCents,
              }));
            }
          }

          const unitPrice = baseUnitPrice + optionsExtraCents;

          // Atomik stok dusurme
          if (menuItem.stockTracking && menuItem.stockCount !== null) {
            const updated = await tx.menuItem.update({
              where: { id: item.menuItemId },
              data: {
                stockCount: { decrement: item.quantity },
              },
            });
            if (updated.stockCount !== null && updated.stockCount <= 0) {
              await tx.menuItem.update({
                where: { id: item.menuItemId },
                data: { isAvailable: false },
              });
            }
          }

          return {
            menuItemId: item.menuItemId,
            quantity: item.quantity,
            unitPriceCents: unitPrice,
            note: item.note,
            isComplimentary: item.isComplimentary || false,
            options: normalizedOptions as any,
          };
        }),
      );

      const totalCents = itemsWithPrices.reduce(
        (sum, item) => sum + item.unitPriceCents * item.quantity,
        0,
      );

      const order = await tx.order.create({
        data: {
          tableId: dto.tableId,
          userId,
          orderType: dto.orderType || OrderType.DINE_IN,
          note: dto.note,
          totalCents,
          items: { create: itemsWithPrices },
        },
        include: {
          table: true,
          items: { include: { menuItem: true } },
        },
      });

      // Masa durumunu guncelle
      if (dto.tableId) {
        await tx.table.update({
          where: { id: dto.tableId },
          data: { status: 'OCCUPIED' },
        });
      }

      // Audit log
      await tx.auditLog.create({
        data: {
          userId,
          action: 'ORDER_CREATED',
          entity: 'order',
          entityId: order.id,
          details: {
            totalCents,
            itemCount: itemsWithPrices.length,
            orderType: dto.orderType,
          },
        },
      });

      return order;
    });
  }

  async addItem(orderId: string, dto: AddOrderItemDto) {
    const order = await this.findOne(orderId);
    if (
      [OrderStatus.COMPLETED, OrderStatus.CANCELLED].includes(
        order.status as OrderStatus,
      )
    ) {
      throw new BadRequestException(
        'Tamamlanmis veya iptal edilmis siparise urun eklenemez',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const menuItem = await tx.menuItem.findFirst({
        where: { id: dto.menuItemId, deletedAt: null },
        include: { options: { where: { isActive: true } } },
      });
      if (!menuItem) throw new BadRequestException('Menu ogesi bulunamadi');

      const baseUnitPrice = dto.isComplimentary
        ? 0
        : (menuItem.campaignPriceCents ?? menuItem.priceCents);

      let optionsExtraCents = 0;
      let normalizedOptions: unknown = dto.selectedOptions;

      if (Array.isArray(dto.selectedOptions)) {
        const selectedIds = dto.selectedOptions.filter(
          (o): o is string => typeof o === 'string',
        );
        if (selectedIds.length > 0) {
          const validOptions = menuItem.options.filter((opt) =>
            selectedIds.includes(opt.id),
          );
          if (validOptions.length !== selectedIds.length) {
            throw new BadRequestException('Gecersiz menu opsiyonu secimi');
          }
          optionsExtraCents = validOptions.reduce(
            (sum, opt) => sum + opt.extraPriceCents,
            0,
          );
          normalizedOptions = validOptions.map((opt) => ({
            id: opt.id,
            nameTr: opt.nameTr,
            nameEn: opt.nameEn,
            extraPriceCents: opt.extraPriceCents,
          }));
        }
      }

      const unitPrice = baseUnitPrice + optionsExtraCents;

      const newItem = await tx.orderItem.create({
        data: {
          orderId,
          menuItemId: dto.menuItemId,
          quantity: dto.quantity,
          unitPriceCents: unitPrice,
          note: dto.note,
          isComplimentary: dto.isComplimentary || false,
          options: normalizedOptions as any,
        },
        include: { menuItem: true },
      });

      // Toplami guncelle
      const allItems = await tx.orderItem.findMany({ where: { orderId } });
      const newTotal = allItems.reduce(
        (sum, i) => sum + i.unitPriceCents * i.quantity,
        0,
      );
      const currentOrder = await tx.order.findUnique({
        where: { id: orderId },
      });
      await tx.order.update({
        where: { id: orderId },
        data: {
          totalCents: newTotal,
          discountCents: Math.min(currentOrder?.discountCents || 0, newTotal),
        },
      });

      // Atomik stok dusur
      if (menuItem.stockTracking && menuItem.stockCount !== null) {
        const updated = await tx.menuItem.update({
          where: { id: dto.menuItemId },
          data: { stockCount: { decrement: dto.quantity } },
        });
        if (updated.stockCount !== null && updated.stockCount <= 0) {
          await tx.menuItem.update({
            where: { id: dto.menuItemId },
            data: { isAvailable: false },
          });
        }
      }

      return newItem;
    });
  }

  async updateDiscount(id: string, discountCents: number, userId: string) {
    return this.prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id },
        include: { table: true },
      });
      if (!order) throw new NotFoundException('Siparis bulunamadi');
      if (
        [OrderStatus.COMPLETED, OrderStatus.CANCELLED].includes(
          order.status as OrderStatus,
        )
      ) {
        throw new BadRequestException(
          'Tamamlanmis veya iptal edilmis sipariste indirim yapilamaz',
        );
      }

      if (discountCents > order.totalCents) {
        throw new BadRequestException(
          'Indirim tutari toplam tutardan buyuk olamaz',
        );
      }

      const updated = await tx.order.update({
        where: { id },
        data: { discountCents },
        include: { table: true, items: { include: { menuItem: true } } },
      });

      await tx.auditLog.create({
        data: {
          userId,
          action: 'ORDER_DISCOUNT_APPLIED',
          entity: 'order',
          entityId: id,
          details: { discountCents, totalCents: order.totalCents },
        },
      });

      return updated;
    });
  }

  async transferTable(id: string, newTableId: string, userId: string) {
    return this.prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id },
        include: { table: true },
      });
      if (!order) throw new NotFoundException('Siparis bulunamadi');
      if (
        [OrderStatus.COMPLETED, OrderStatus.CANCELLED].includes(
          order.status as OrderStatus,
        )
      ) {
        throw new BadRequestException(
          'Tamamlanmis veya iptal edilmis siparis tasinamaz',
        );
      }

      if (order.tableId === newTableId) {
        throw new BadRequestException('Siparis zaten bu masada');
      }

      const newTable = await tx.table.findUnique({ where: { id: newTableId } });
      if (!newTable) throw new NotFoundException('Hedef masa bulunamadi');

      // Yeni masayi doldur
      await tx.table.update({
        where: { id: newTableId },
        data: { status: 'OCCUPIED' },
      });

      const updatedOrder = await tx.order.update({
        where: { id },
        data: { tableId: newTableId },
        include: { table: true, items: { include: { menuItem: true } } },
      });

      // Eski masayi gerekirse bosalt
      if (order.tableId) {
        const activeOrders = await tx.order.count({
          where: {
            tableId: order.tableId,
            id: { not: id },
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

      await tx.auditLog.create({
        data: {
          userId,
          action: 'ORDER_TRANSFERRED',
          entity: 'order',
          entityId: id,
          details: { fromTableId: order.tableId, toTableId: newTableId },
        },
      });

      return updatedOrder;
    });
  }

  async updateStatus(id: string, status: OrderStatus, userId?: string) {
    return this.prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id },
        include: { table: true },
      });
      if (!order) throw new NotFoundException('Siparis bulunamadi');

      const updated = await tx.order.update({
        where: { id },
        data: { status },
        include: { table: true, items: { include: { menuItem: true } } },
      });

      // Siparis tamamlandiginda veya iptal edildiginde masayi kontrol et
      if (
        [OrderStatus.COMPLETED, OrderStatus.CANCELLED].includes(status) &&
        order.tableId
      ) {
        const activeOrders = await tx.order.count({
          where: {
            tableId: order.tableId,
            id: { not: id },
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

      // Audit log
      if (userId) {
        await tx.auditLog.create({
          data: {
            userId,
            action: 'ORDER_STATUS_CHANGED',
            entity: 'order',
            entityId: id,
            details: { from: order.status, to: status },
          },
        });
      }

      return updated;
    });
  }

  async updateItem(
    orderId: string,
    itemId: string,
    dto: { quantity?: number; isComplimentary?: boolean; note?: string },
  ) {
    const order = await this.findOne(orderId);
    if (
      [OrderStatus.COMPLETED, OrderStatus.CANCELLED].includes(
        order.status as OrderStatus,
      )
    ) {
      throw new BadRequestException(
        'Tamamlanmis veya iptal edilmis sipariste urun guncellenemez',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const item = await tx.orderItem.findUnique({
        where: { id: itemId },
        include: { menuItem: true },
      });
      if (!item || item.orderId !== orderId)
        throw new NotFoundException('Siparis kalemi bulunamadi');

      const dataToUpdate: any = {};

      // Handle complimentary
      if (
        dto.isComplimentary !== undefined &&
        dto.isComplimentary !== item.isComplimentary
      ) {
        dataToUpdate.isComplimentary = dto.isComplimentary;
        dataToUpdate.unitPriceCents = dto.isComplimentary
          ? 0
          : (item.menuItem.campaignPriceCents ?? item.menuItem.priceCents);
      }

      // Handle quantity
      if (dto.quantity !== undefined && dto.quantity !== item.quantity) {
        dataToUpdate.quantity = dto.quantity;

        // Atomik stok guncelleme
        if (item.menuItem.stockTracking && item.menuItem.stockCount !== null) {
          const diff = dto.quantity - item.quantity;

          if (diff > 0 && item.menuItem.stockCount < diff) {
            throw new BadRequestException('Yetersiz stok');
          }

          const updatedMenu = await tx.menuItem.update({
            where: { id: item.menuItem.id },
            data: { stockCount: { decrement: diff } },
          });

          if (updatedMenu.stockCount !== null && updatedMenu.stockCount <= 0) {
            await tx.menuItem.update({
              where: { id: item.menuItem.id },
              data: { isAvailable: false },
            });
          }
        }
      }

      if (dto.note !== undefined) {
        dataToUpdate.note = dto.note;
      }

      const updatedItem = await tx.orderItem.update({
        where: { id: itemId },
        data: dataToUpdate,
      });

      // Toplami guncelle
      const allItems = await tx.orderItem.findMany({ where: { orderId } });
      const newTotal = allItems.reduce(
        (sum, i) => sum + i.unitPriceCents * i.quantity,
        0,
      );
      const currentOrder = await tx.order.findUnique({
        where: { id: orderId },
      });
      await tx.order.update({
        where: { id: orderId },
        data: {
          totalCents: newTotal,
          discountCents: Math.min(currentOrder?.discountCents || 0, newTotal),
        },
      });

      return updatedItem;
    });
  }

  async removeItem(orderId: string, itemId: string) {
    return this.prisma.$transaction(async (tx) => {
      const item = await tx.orderItem.findUnique({ where: { id: itemId } });
      if (!item || item.orderId !== orderId)
        throw new NotFoundException('Siparis kalemi bulunamadi');

      await tx.orderItem.delete({ where: { id: itemId } });

      // Toplami guncelle
      const remaining = await tx.orderItem.findMany({ where: { orderId } });
      const newTotal = remaining.reduce(
        (sum, i) => sum + i.unitPriceCents * i.quantity,
        0,
      );
      const currentOrder = await tx.order.findUnique({
        where: { id: orderId },
      });
      await tx.order.update({
        where: { id: orderId },
        data: {
          totalCents: newTotal,
          discountCents: Math.min(currentOrder?.discountCents || 0, newTotal),
        },
      });

      return { success: true };
    });
  }
}
