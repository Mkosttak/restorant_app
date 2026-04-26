import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateReservationDto,
  UpdateReservationStatusDto,
} from './dto/create-reservation.dto';
import { ReservationStatus } from '@bolena/shared';

@Injectable()
export class ReservationsService {
  constructor(private prisma: PrismaService) {}

  findAll(date?: string) {
    const where: Record<string, unknown> = {};
    if (date) {
      const start = new Date(date);
      const end = new Date(date);
      end.setDate(end.getDate() + 1);
      where.reservedAt = { gte: start, lt: end };
    }

    return this.prisma.reservation.findMany({
      where,
      include: { table: true },
      orderBy: { reservedAt: 'asc' },
    });
  }

  async findOne(id: string) {
    const res = await this.prisma.reservation.findUnique({
      where: { id },
      include: { table: true },
    });
    if (!res) throw new NotFoundException('Rezervasyon bulunamadi');
    return res;
  }

  create(dto: CreateReservationDto) {
    return this.prisma.reservation.create({
      data: {
        ...dto,
        reservedAt: new Date(dto.reservedAt),
      },
      include: { table: true },
    });
  }

  async updateStatus(id: string, status: ReservationStatus) {
    return this.prisma.$transaction(async (tx) => {
      const res = await tx.reservation.findUnique({
        where: { id },
        include: { table: true },
      });
      if (!res) throw new NotFoundException('Rezervasyon bulunamadi');

      const updated = await tx.reservation.update({
        where: { id },
        data: { status },
        include: { table: true },
      });

      // Masaya oturtuldu -> masa durumunu guncelle
      if (status === ReservationStatus.SEATED) {
        await tx.table.update({
          where: { id: res.tableId },
          data: { status: 'OCCUPIED' },
        });
      }

      // Iptal veya gelmedi -> masayi bosalt (eger rezerve ise)
      if (
        [ReservationStatus.CANCELLED, ReservationStatus.NO_SHOW].includes(
          status,
        ) &&
        res.table.status === 'RESERVED'
      ) {
        await tx.table.update({
          where: { id: res.tableId },
          data: { status: 'AVAILABLE' },
        });
      }

      return updated;
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.reservation.delete({ where: { id } });
  }
}
