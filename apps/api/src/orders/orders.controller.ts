import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { OrdersService } from './orders.service';
import {
  CreateOrderDto,
  AddOrderItemDto,
  UpdateOrderStatusDto,
  UpdateOrderItemDto,
} from './dto/create-order.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { PaginationQueryDto } from '../common/dto/pagination.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('orders')
export class OrdersController {
  constructor(private ordersService: OrdersService) {}

  @Get()
  findAll(
    @Query('status') status?: string,
    @Query('tableId') tableId?: string,
    @Query('orderType') orderType?: string,
    @Query('date') date?: string,
    @Query() pagination?: PaginationQueryDto,
  ) {
    return this.ordersService.findAll(
      { status, tableId, orderType, date },
      pagination,
    );
  }

  @Get('active')
  findActive() {
    return this.ordersService.findActive();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.ordersService.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateOrderDto, @CurrentUser('id') userId: string) {
    return this.ordersService.create(dto, userId);
  }

  @Post(':id/items')
  addItem(@Param('id') id: string, @Body() dto: AddOrderItemDto) {
    return this.ordersService.addItem(id, dto);
  }

  @Patch(':id/status')
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateOrderStatusDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.ordersService.updateStatus(id, dto.status, userId);
  }

  @Patch(':id/items/:itemId')
  updateItem(
    @Param('id') id: string,
    @Param('itemId') itemId: string,
    @Body() dto: UpdateOrderItemDto,
  ) {
    return this.ordersService.updateItem(id, itemId, dto);
  }

  @Patch(':id/discount')
  updateDiscount(
    @Param('id') id: string,
    @Body('discountCents') discountCents: number,
    @CurrentUser('id') userId: string,
  ) {
    return this.ordersService.updateDiscount(id, discountCents, userId);
  }

  @Patch(':id/table')
  transferTable(
    @Param('id') id: string,
    @Body('tableId') tableId: string,
    @CurrentUser('id') userId: string,
  ) {
    if (!tableId) {
      throw new Error('tableId gereklidir');
    }
    return this.ordersService.transferTable(id, tableId, userId);
  }

  @Delete(':id/items/:itemId')
  removeItem(@Param('id') id: string, @Param('itemId') itemId: string) {
    return this.ordersService.removeItem(id, itemId);
  }
}
