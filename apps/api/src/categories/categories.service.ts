import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class CategoriesService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.category.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
      include: { _count: { select: { menuItems: true } } },
    });
  }

  async findOne(id: string) {
    const category = await this.prisma.category.findUnique({
      where: { id },
      include: { menuItems: { where: { deletedAt: null } } },
    });
    if (!category) throw new NotFoundException('Kategori bulunamadi');
    return category;
  }

  create(dto: CreateCategoryDto) {
    return this.prisma.category.create({ data: dto });
  }

  async update(id: string, dto: UpdateCategoryDto) {
    await this.findOne(id);
    return this.prisma.category.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    const category = await this.prisma.category.findUnique({
      where: { id },
      include: { _count: { select: { menuItems: true } } },
    });
    if (!category) throw new NotFoundException('Kategori bulunamadi');

    // FK kontrolu: icerisinde menu ogesi varsa soft-delete yap
    if (category._count.menuItems > 0) {
      return this.prisma.category.update({
        where: { id },
        data: { isActive: false },
      });
    }

    return this.prisma.category.delete({ where: { id } });
  }
}
