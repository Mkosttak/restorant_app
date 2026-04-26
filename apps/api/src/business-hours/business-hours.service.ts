import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateBusinessHoursDto } from './dto/update-business-hours.dto';

@Injectable()
export class BusinessHoursService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.businessHours.findMany({
      orderBy: { dayOfWeek: 'asc' },
    });
  }

  async update(dto: UpdateBusinessHoursDto) {
    return this.prisma.businessHours.upsert({
      where: { dayOfWeek: dto.dayOfWeek },
      update: {
        openTime: dto.openTime,
        closeTime: dto.closeTime,
        isClosed: dto.isClosed,
      },
      create: {
        dayOfWeek: dto.dayOfWeek,
        openTime: dto.openTime || '09:00',
        closeTime: dto.closeTime || '22:00',
        isClosed: dto.isClosed || false,
      },
    });
  }
}
