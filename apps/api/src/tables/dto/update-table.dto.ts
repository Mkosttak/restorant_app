import { PartialType } from '@nestjs/mapped-types';
import { CreateTableDto } from './create-table.dto';
import { IsEnum, IsOptional } from 'class-validator';
import { TableStatus } from '@bolena/shared';

export class UpdateTableDto extends PartialType(CreateTableDto) {
  @IsOptional()
  @IsEnum(TableStatus)
  status?: TableStatus;
}
