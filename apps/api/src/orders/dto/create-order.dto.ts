import {
  IsString,
  IsOptional,
  IsEnum,
  IsArray,
  ValidateNested,
  IsInt,
  IsUUID,
  Min,
  IsBoolean,
} from 'class-validator';
import { Type } from 'class-transformer';
import { OrderType, OrderStatus } from '@bolena/shared';

class CreateOrderItemDto {
  @IsUUID()
  menuItemId: string;

  @IsInt()
  @Min(1)
  quantity: number;

  @IsOptional()
  @IsString()
  note?: string;

  @IsOptional()
  @IsBoolean()
  isComplimentary?: boolean;

  @IsOptional()
  selectedOptions?: unknown;
}

export class CreateOrderDto {
  @IsOptional()
  @IsUUID()
  tableId?: string;

  @IsOptional()
  @IsEnum(OrderType)
  orderType?: OrderType;

  @IsOptional()
  @IsString()
  note?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items: CreateOrderItemDto[];
}

export class AddOrderItemDto {
  @IsUUID()
  menuItemId: string;

  @IsInt()
  @Min(1)
  quantity: number;

  @IsOptional()
  @IsString()
  note?: string;

  @IsOptional()
  @IsBoolean()
  isComplimentary?: boolean;

  @IsOptional()
  selectedOptions?: unknown;
}

export class UpdateOrderStatusDto {
  @IsEnum(OrderStatus)
  status: OrderStatus;
}

export class UpdateOrderItemDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  quantity?: number;

  @IsOptional()
  @IsBoolean()
  isComplimentary?: boolean;

  @IsOptional()
  @IsString()
  note?: string;
}

export class UpdateOrderDiscountDto {
  @IsInt()
  @Min(0)
  discountCents: number;
}
