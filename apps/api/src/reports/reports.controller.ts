import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@Controller('reports')
export class ReportsController {
  constructor(private reportsService: ReportsService) {}

  @Get('daily')
  getDailySummary(@Query('date') date: string) {
    return this.reportsService.getDailySummary(
      date || new Date().toISOString().split('T')[0],
    );
  }

  @Get('range')
  getDateRangeSummary(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.reportsService.getDateRangeSummary(startDate, endDate);
  }

  @Get('top-products')
  getTopProducts(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('limit') limit?: string,
  ) {
    return this.reportsService.getTopProducts(
      startDate,
      endDate,
      limit ? parseInt(limit) : 10,
    );
  }
}
