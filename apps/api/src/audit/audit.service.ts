import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  PaginationQueryDto,
  paginate,
  createPaginatedResult,
} from '../common/dto/pagination.dto';

@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) {}

  async findAll(
    filters?: { entity?: string; userId?: string },
    pagination?: PaginationQueryDto,
  ) {
    const where: Record<string, unknown> = {};
    if (filters?.entity) where.entity = filters.entity;
    if (filters?.userId) where.userId = filters.userId;

    const page = pagination?.page || 1;
    const limit = pagination?.limit || 50;

    const [data, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        include: { user: { select: { id: true, name: true, email: true } } },
        orderBy: { createdAt: 'desc' },
        ...paginate(page, limit),
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return createPaginatedResult(data, total, page, limit);
  }

  async log(
    userId: string,
    action: string,
    entity: string,
    entityId?: string,
    details?: unknown,
  ) {
    return this.prisma.auditLog.create({
      data: {
        userId,
        action,
        entity,
        entityId,
        details: details as object,
      },
    });
  }
}
