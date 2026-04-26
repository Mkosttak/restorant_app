import { Controller, Get, Put, Body, UseGuards } from '@nestjs/common';
import { BusinessHoursService } from './business-hours.service';
import { UpdateBusinessHoursDto } from './dto/update-business-hours.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@UseGuards(JwtAuthGuard)
@Controller('business-hours')
export class BusinessHoursController {
  constructor(private businessHoursService: BusinessHoursService) {}

  @Get()
  findAll() {
    return this.businessHoursService.findAll();
  }

  @Put()
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  update(@Body() dto: UpdateBusinessHoursDto) {
    return this.businessHoursService.update(dto);
  }
}
