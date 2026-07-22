import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../entities/user.entity';

@Controller('analytics')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('dashboard')
  async getDashboardStats() {
    return this.analyticsService.getDashboardStats();
  }

  @Get('revenue-chart')
  async getRevenueChart(@Query('days') days?: string) {
    const daysNum = days ? parseInt(days) : 30;
    return this.analyticsService.getRevenueChart(daysNum);
  }

  @Get('booking-trends')
  async getBookingTrends(@Query('days') days?: string) {
    const daysNum = days ? parseInt(days) : 30;
    return this.analyticsService.getBookingTrends(daysNum);
  }

  @Get('top-properties')
  async getTopProperties(@Query('limit') limit?: string) {
    const limitNum = limit ? parseInt(limit) : 10;
    return this.analyticsService.getTopProperties(limitNum);
  }

  @Get('top-hosts')
  async getTopHosts(@Query('limit') limit?: string) {
    const limitNum = limit ? parseInt(limit) : 10;
    return this.analyticsService.getTopHosts(limitNum);
  }
}
