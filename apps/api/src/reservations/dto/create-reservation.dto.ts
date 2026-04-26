import {
  IsUUID,
  IsString,
  IsOptional,
  IsInt,
  IsDateString,
  Min,
  IsEnum,
} from 'class-validator';
import { ReservationStatus } from '@bolena/shared';

export class CreateReservationDto {
  @IsUUID()
  tableId: string;

  @IsString()
  customerName: string;

  @IsOptional()
  @IsString()
  customerPhone?: string;

  @IsInt()
  @Min(1)
  guestCount: number;

  @IsDateString()
  reservedAt: string;

  @IsOptional()
  @IsString()
  note?: string;
}

export class UpdateReservationStatusDto {
  @IsEnum(ReservationStatus)
  status: ReservationStatus;
}
