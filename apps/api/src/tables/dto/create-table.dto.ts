import { IsInt, IsOptional, IsString, IsBoolean, Min } from 'class-validator';

export class CreateTableDto {
  @IsInt()
  @Min(1)
  number: number;

  @IsOptional()
  @IsString()
  label?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  capacity?: number;

  @IsOptional()
  @IsInt()
  positionX?: number;

  @IsOptional()
  @IsInt()
  positionY?: number;
}
