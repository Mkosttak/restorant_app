import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTableDto } from './dto/create-table.dto';
import { UpdateTableDto } from './dto/update-table.dto';

@Injectable()
export class TablesService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.table.findMany({
      where: { isActive: true },
      orderBy: { number: 'asc' },
    });
  }

  async findOne(id: string) {
    const table = await this.prisma.table.findUnique({
      where: { id },
      include: {
        orders: {
          where: {
            status: { in: ['PENDING', 'PREPARING', 'READY', 'SERVED'] },
          },
          include: { items: { include: { menuItem: true } } },
        },
      },
    });
    if (!table) throw new NotFoundException('Masa bulunamadi');
    return table;
  }

  create(dto: CreateTableDto) {
    return this.prisma.table.create({ data: dto });
  }

  async update(id: string, dto: UpdateTableDto) {
    await this.findOne(id);
    return this.prisma.table.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.table.update({
      where: { id },
      data: { isActive: false },
    });
  }
}
