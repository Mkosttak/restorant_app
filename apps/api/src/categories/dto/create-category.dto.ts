import { IsString, IsOptional, IsInt, IsBoolean } from 'class-validator';

export class CreateCategoryDto {
  @IsString()
  nameTr: string;

  @IsString()
  nameEn: string;

  @IsOptional()
  @IsInt()
  sortOrder?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
