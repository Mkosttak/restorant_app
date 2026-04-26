import {
  IsUUID,
  IsString,
  IsInt,
  IsOptional,
  Min,
  IsBoolean,
} from 'class-validator';

export class CreateMenuItemOptionDto {
  @IsUUID()
  menuItemId: string;

  @IsString()
  nameTr: string;

  @IsString()
  nameEn: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  extraPriceCents?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
