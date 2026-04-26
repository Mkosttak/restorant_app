import { Test, TestingModule } from '@nestjs/testing';
import { OrdersService } from './orders.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('OrdersService', () => {
  let service: OrdersService;
  let prisma: Record<string, unknown>;

  const mockMenuItem = {
    id: 'menu-1',
    nameTr: 'Test Item',
    priceCents: 1500,
    isAvailable: true,
    stockTracking: true,
    stockCount: 10,
    campaignPriceCents: null,
    deletedAt: null,
    options: [],
  };

  const mockOrder = {
    id: 'order-1',
    tableId: 'table-1',
    userId: 'user-1',
    status: 'PENDING',
    totalCents: 3000,
    orderType: 'DINE_IN',
    createdAt: new Date(),
    table: { id: 'table-1', number: 1, status: 'OCCUPIED' },
    items: [
      {
        id: 'item-1',
        menuItemId: 'menu-1',
        quantity: 2,
        unitPriceCents: 1500,
        orderId: 'order-1',
      },
    ],
    user: { id: 'user-1', name: 'Test' },
  };

  beforeEach(async () => {
    const txMock = {
      menuItem: {
        findFirst: jest.fn().mockResolvedValue(mockMenuItem),
        update: jest.fn().mockResolvedValue({ ...mockMenuItem, stockCount: 8 }),
      },
      order: {
        create: jest.fn().mockResolvedValue(mockOrder),
        findUnique: jest.fn().mockResolvedValue(mockOrder),
        update: jest
          .fn()
          .mockResolvedValue({ ...mockOrder, status: 'PREPARING' }),
        count: jest.fn().mockResolvedValue(0),
      },
      table: {
        update: jest.fn().mockResolvedValue({}),
      },
      orderItem: {
        create: jest.fn().mockResolvedValue({ id: 'item-2' }),
        findMany: jest.fn().mockResolvedValue(mockOrder.items),
        findUnique: jest.fn().mockResolvedValue(mockOrder.items[0]),
        delete: jest.fn().mockResolvedValue({}),
      },
      auditLog: {
        create: jest.fn().mockResolvedValue({}),
      },
    };

    prisma = {
      $transaction: jest
        .fn()
        .mockImplementation((fn: (tx: typeof txMock) => Promise<unknown>) =>
          fn(txMock),
        ),
      order: {
        findMany: jest.fn().mockResolvedValue([mockOrder]),
        findUnique: jest.fn().mockResolvedValue(mockOrder),
        count: jest.fn().mockResolvedValue(1),
      },
    };

    const auditService = {
      log: jest.fn().mockResolvedValue({}),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuditService, useValue: auditService },
      ],
    }).compile();

    service = module.get<OrdersService>(OrdersService);
  });

  describe('create', () => {
    it('should create an order with transaction', async () => {
      const result = await service.create(
        {
          tableId: 'table-1',
          items: [{ menuItemId: 'menu-1', quantity: 2 }],
        },
        'user-1',
      );

      expect(result).toBeDefined();
      expect(result.id).toBe('order-1');
      expect(prisma.$transaction).toHaveBeenCalled();
    });

    it('should reject unavailable items', async () => {
      const txMock = {
        menuItem: {
          findFirst: jest
            .fn()
            .mockResolvedValue({ ...mockMenuItem, isAvailable: false }),
          update: jest.fn(),
        },
        order: { create: jest.fn(), count: jest.fn() },
        table: { update: jest.fn() },
        orderItem: { create: jest.fn(), findMany: jest.fn() },
        auditLog: { create: jest.fn() },
      };
      (prisma.$transaction as jest.Mock).mockImplementation(
        (fn: (tx: typeof txMock) => Promise<unknown>) => fn(txMock),
      );

      await expect(
        service.create(
          { items: [{ menuItemId: 'menu-1', quantity: 1 }] },
          'user-1',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject insufficient stock', async () => {
      const txMock = {
        menuItem: {
          findFirst: jest
            .fn()
            .mockResolvedValue({ ...mockMenuItem, stockCount: 1 }),
          update: jest.fn(),
        },
        order: { create: jest.fn(), count: jest.fn() },
        table: { update: jest.fn() },
        orderItem: { create: jest.fn(), findMany: jest.fn() },
        auditLog: { create: jest.fn() },
      };
      (prisma.$transaction as jest.Mock).mockImplementation(
        (fn: (tx: typeof txMock) => Promise<unknown>) => fn(txMock),
      );

      await expect(
        service.create(
          { items: [{ menuItemId: 'menu-1', quantity: 5 }] },
          'user-1',
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('findOne', () => {
    it('should return order by id', async () => {
      const result = await service.findOne('order-1');
      expect(result.id).toBe('order-1');
    });

    it('should throw if order not found', async () => {
      (prisma.order as { findUnique: jest.Mock }).findUnique.mockResolvedValue(
        null,
      );
      await expect(service.findOne('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('updateStatus', () => {
    it('should update order status in transaction', async () => {
      const result = await service.updateStatus(
        'order-1',
        'PREPARING' as never,
        'user-1',
      );
      expect(result).toBeDefined();
      expect(prisma.$transaction).toHaveBeenCalled();
    });
  });
});
