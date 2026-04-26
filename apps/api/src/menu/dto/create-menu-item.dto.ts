import {
  IsString,
  IsInt,
  IsOptional,
  IsBoolean,
  IsUUID,
  IsDateString,
  Min,
} from 'class-validator';

export class CreateMenuItemDto {
  @IsUUID()
  categoryId: string;

  @IsString()
  nameTr: string;

  @IsString()
  nameEn: string;

  @IsOptional()
  @IsString()
  descriptionTr?: string;

  @IsOptional()
  @IsString()
  descriptionEn?: string;

  @IsInt()
  @Min(0)
  priceCents: number;

  @IsOptional()
  @IsString()
  imageUrl?: string;

  @IsOptional()
  @IsBoolean()
  isAvailable?: boolean;

  @IsOptional()
  @IsBoolean()
  stockTracking?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  stockCount?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  stockThreshold?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  campaignPriceCents?: number;

  @IsOptional()
  @IsDateString()
  campaignEndsAt?: string;

  @IsOptional()
  @IsInt()
  sortOrder?: number;

  @IsOptional()
  @IsBoolean()
  isGlutenFree?: boolean;
}
