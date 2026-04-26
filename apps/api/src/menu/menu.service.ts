import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMenuItemDto } from './dto/create-menu-item.dto';
import { UpdateMenuItemDto } from './dto/update-menu-item.dto';
import { CreateMenuItemOptionDto } from './dto/create-menu-item-option.dto';
import { UpdateMenuItemOptionDto } from './dto/update-menu-item-option.dto';

@Injectable()
export class MenuService {
  constructor(private prisma: PrismaService) {}

  findAll(categoryId?: string) {
    return this.prisma.menuItem.findMany({
      where: {
        deletedAt: null,
        ...(categoryId ? { categoryId } : {}),
      },
      include: { category: true, options: { where: { isActive: true } } },
      orderBy: [{ sortOrder: 'asc' }, { nameTr: 'asc' }],
    });
  }

  async findOne(id: string) {
    const item = await this.prisma.menuItem.findFirst({
      where: { id, deletedAt: null },
      include: { category: true, options: true },
    });
    if (!item) throw new NotFoundException('Menu ogesi bulunamadi');
    return item;
  }

  create(dto: CreateMenuItemDto) {
    return this.prisma.menuItem.create({
      data: {
        ...dto,
        campaignEndsAt: dto.campaignEndsAt
          ? new Date(dto.campaignEndsAt)
          : undefined,
      },
      include: { category: true },
    });
  }

  async update(id: string, dto: UpdateMenuItemDto) {
    await this.findOne(id);
    return this.prisma.menuItem.update({
      where: { id },
      data: {
        ...dto,
        campaignEndsAt: dto.campaignEndsAt
          ? new Date(dto.campaignEndsAt)
          : undefined,
      },
      include: { category: true },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.menuItem.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  findOptionsByItem(menuItemId: string) {
    return this.prisma.menuItemOption.findMany({
      where: {
        menuItemId,
        isActive: true,
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async createOption(menuItemId: string, dto: CreateMenuItemOptionDto) {
    // Ensure parent menu item exists and is not soft-deleted
    const menuItem = await this.prisma.menuItem.findFirst({
      where: { id: menuItemId, deletedAt: null },
    });
    if (!menuItem) {
      throw new NotFoundException('Menu ogesi bulunamadi');
    }

    return this.prisma.menuItemOption.create({
      data: {
        menuItemId,
        nameTr: dto.nameTr,
        nameEn: dto.nameEn,
        extraPriceCents: dto.extraPriceCents ?? 0,
        isActive: dto.isActive ?? true,
      },
    });
  }

  async updateOption(id: string, dto: UpdateMenuItemOptionDto) {
    const existing = await this.prisma.menuItemOption.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new NotFoundException('Menu opsiyonu bulunamadi');
    }

    return this.prisma.menuItemOption.update({
      where: { id },
      data: dto,
    });
  }

  async removeOption(id: string) {
    const existing = await this.prisma.menuItemOption.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new NotFoundException('Menu opsiyonu bulunamadi');
    }

    // Soft delete semantics via isActive flag
    return this.prisma.menuItemOption.update({
      where: { id },
      data: { isActive: false },
    });
  }
}
