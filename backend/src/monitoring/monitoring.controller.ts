import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { MonitoringService } from './monitoring.service';
import { MetricsService } from './metrics.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../entities/user.entity';

@Controller('monitoring')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class MonitoringController {
  constructor(
    private readonly monitoringService: MonitoringService,
    private readonly metricsService: MetricsService,
  ) {}

  @Get('health')
  async getHealth() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }

  @Get('metrics')
  async getMetrics() {
    return this.metricsService.getSystemMetrics();
  }

  @Get('performance')
  async getPerformanceMetrics() {
    return this.metricsService.getPerformanceMetrics();
  }

  @Post('remediate')
  async performRemediation(@Body() body: { action: string; target?: string }) {
    return this.monitoringService.performRemediation(body.action, body.target);
  }

  @Get('alerts')
  async getAlerts() {
    return this.monitoringService.getActiveAlerts();
  }

  @Post('clear-cache')
  async clearCache(@Body() body: { type: string }) {
    return this.monitoringService.clearCache(body.type);
  }

  @Post('restart-service')
  async restartService(@Body() body: { service: string }) {
    return this.monitoringService.restartService(body.service);
  }

  @Get('logs')
  async getLogs(@Body() body: { level?: string; limit?: number }) {
    return this.monitoringService.getLogs(body.level, body.limit);
  }
}
