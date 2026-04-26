import {
  IsInt,
  IsString,
  IsBoolean,
  IsOptional,
  Min,
  Max,
} from 'class-validator';

export class UpdateBusinessHoursDto {
  @IsInt()
  @Min(0)
  @Max(6)
  dayOfWeek: number;

  @IsOptional()
  @IsString()
  openTime?: string;

  @IsOptional()
  @IsString()
  closeTime?: string;

  @IsOptional()
  @IsBoolean()
  isClosed?: boolean;
}
