import {
  IsUUID,
  IsInt,
  IsEnum,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { PaymentMethod } from '@bolena/shared';

export class CreatePaymentDto {
  @IsUUID()
  orderId: string;

  @IsInt()
  @Min(0)
  amountCents: number;

  @IsEnum(PaymentMethod)
  method: PaymentMethod;

  @IsOptional()
  @IsString()
  note?: string;
}
