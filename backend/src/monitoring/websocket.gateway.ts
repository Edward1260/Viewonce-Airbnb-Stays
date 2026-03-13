import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import type { Server, Socket } from 'socket.io';
import { Injectable, Logger, UseGuards } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { MonitoringService } from './monitoring.service';
import { MetricsService } from './metrics.service';
import { AuditLogService } from './audit-log.service';
import { AuditAction, AuditSeverity } from '../entities/audit-log.entity';

type AuthenticatedSocket = Socket & {
  userId?: number;
  userRole?: string;
};

@WebSocketGateway({
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
    credentials: true,
  },
  namespace: '/monitoring',
})
@Injectable()
export class MonitoringGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(MonitoringGateway.name);
  private connectedClients = new Map<string, AuthenticatedSocket>();

  constructor(
    private readonly jwtService: JwtService,
    private readonly monitoringService: MonitoringService,
    private readonly metricsService: MetricsService,
    private readonly auditLogService: AuditLogService,
  ) {}

  async handleConnection(client: AuthenticatedSocket, ...args: any[]) {
    try {
      const token = client.handshake.auth.token || client.handshake.query.token as string;

      if (!token) {
        this.logger.warn(`WebSocket connection rejected: No token provided`);
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify(token);
      client.userId = payload.sub;
      client.userRole = payload.role;

      if (payload.role !== 'admin') {
        this.logger.warn(`WebSocket connection rejected: Non-admin user ${payload.sub}`);
        client.disconnect();
        return;
      }

      this.connectedClients.set(client.id, client);
      this.logger.log(`WebSocket client connected: ${client.id} (User: ${client.userId})`);

      // Send initial data
      await this.sendInitialData(client);

    } catch (error) {
      this.logger.error(`WebSocket connection failed: ${error.message}`);
      client.disconnect();
    }
  }

  handleDisconnect(client: AuthenticatedSocket) {
    this.connectedClients.delete(client.id);
    this.logger.log(`WebSocket client disconnected: ${client.id}`);
  }

  @SubscribeMessage('subscribe-dashboard')
  async handleSubscribeDashboard(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { dashboard: string },
  ) {
    this.logger.log(`Client ${client.id} subscribed to dashboard: ${data.dashboard}`);

    // Join dashboard room
    client.join(`dashboard-${data.dashboard}`);

    // Send current dashboard data
    await this.sendDashboardData(client, data.dashboard);
  }

  @SubscribeMessage('unsubscribe-dashboard')
  handleUnsubscribeDashboard(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { dashboard: string },
  ) {
    this.logger.log(`Client ${client.id} unsubscribed from dashboard: ${data.dashboard}`);
    client.leave(`dashboard-${data.dashboard}`);
  }

  @SubscribeMessage('request-update')
  async handleRequestUpdate(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { type: string },
  ) {
    this.logger.log(`Client ${client.id} requested update: ${data.type}`);

    switch (data.type) {
      case 'health':
        await this.broadcastHealthUpdate();
        break;
      case 'metrics':
        await this.broadcastMetricsUpdate();
        break;
      case 'alerts':
        await this.broadcastAlertsUpdate();
        break;
      case 'logs':
        await this.broadcastLogsUpdate();
        break;
      default:
        await this.sendDashboardData(client, 'all');
    }
  }

  private async sendInitialData(client: AuthenticatedSocket) {
    try {
      const [metrics, alerts] = await Promise.all([
        this.metricsService.getSystemMetrics(),
        this.monitoringService.getActiveAlerts(),
      ]);

      client.emit('initial-data', {
        metrics,
        alerts,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      this.logger.error(`Failed to send initial data: ${error.message}`);
    }
  }

  private async sendDashboardData(client: AuthenticatedSocket, dashboard: string) {
    try {
      let data: any = {};

      switch (dashboard) {
        case 'health':
          data.health = { status: 'ok', message: 'Health check not available' };
          break;
        case 'metrics':
          data.metrics = await this.metricsService.getSystemMetrics();
          data.performance = await this.metricsService.getPerformanceMetrics();
          break;
        case 'alerts':
          data.alerts = await this.monitoringService.getActiveAlerts();
          break;
        case 'logs':
          data.logs = await this.monitoringService.getLogs();
          data.auditStats = await this.auditLogService.getAuditStats();
          break;
        case 'all':
        default:
          data = await this.getAllDashboardData();
          break;
      }

      client.emit('dashboard-update', {
        dashboard,
        data,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      this.logger.error(`Failed to send dashboard data: ${error.message}`);
    }
  }

  private async getAllDashboardData() {
    const [metrics, performance, alerts, logs, auditStats] = await Promise.all([
      this.metricsService.getSystemMetrics(),
      this.metricsService.getPerformanceMetrics(),
      this.monitoringService.getActiveAlerts(),
      this.monitoringService.getLogs(),
      this.auditLogService.getAuditStats(),
    ]);

    return {
      health: { status: 'ok', message: 'Health check not available' },
      metrics,
      performance,
      alerts,
      logs,
      auditStats,
    };
  }

  // Broadcast methods for real-time updates
  async broadcastHealthUpdate() {
    try {
      const health = { status: 'ok', message: 'Health check not available' };
      this.server.to('dashboard-health').emit('health-update', {
        health,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      this.logger.error(`Failed to broadcast health update: ${error.message}`);
    }
  }

  async broadcastMetricsUpdate() {
    try {
      const metrics = await this.metricsService.getSystemMetrics();
      const performance = await this.metricsService.getPerformanceMetrics();

      this.server.to('dashboard-metrics').emit('metrics-update', {
        metrics,
        performance,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      this.logger.error(`Failed to broadcast metrics update: ${error.message}`);
    }
  }

  async broadcastAlertsUpdate() {
    try {
      const alerts = await this.monitoringService.getActiveAlerts();
      this.server.emit('alerts-update', {
        alerts,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      this.logger.error(`Failed to broadcast alerts update: ${error.message}`);
    }
  }

  async broadcastLogsUpdate() {
    try {
      const logs = await this.monitoringService.getLogs();
      const auditStats = await this.auditLogService.getAuditStats();

      this.server.to('dashboard-logs').emit('logs-update', {
        logs,
        auditStats,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      this.logger.error(`Failed to broadcast logs update: ${error.message}`);
    }
  }

  // Method to trigger updates from other services
  async notifyClients(event: string, data: any) {
    this.server.emit(event, {
      ...data,
      timestamp: new Date().toISOString(),
    });
  }

  // Get connected admin clients count
  getConnectedClientsCount(): number {
    return this.connectedClients.size;
  }

  // Send notification to specific user
  async sendNotificationToUser(userId: number, notification: any) {
    for (const [clientId, client] of this.connectedClients) {
      if (client.userId === userId) {
        client.emit('notification', notification);
      }
    }
  }

  // Broadcast system alert
  async broadcastSystemAlert(alert: {
    type: 'info' | 'warning' | 'error' | 'critical';
    title: string;
    message: string;
    metadata?: any;
  }) {
    this.server.emit('system-alert', {
      ...alert,
      timestamp: new Date().toISOString(),
    });

    // Log the alert
    await this.auditLogService.logAction(
      AuditAction.SYSTEM_ALERT,
      `System alert: ${alert.title} - ${alert.message}`,
      undefined, // system action
      alert.metadata,
      alert.type === 'critical' ? AuditSeverity.CRITICAL : alert.type === 'error' ? AuditSeverity.HIGH : AuditSeverity.MEDIUM,
      undefined,
      undefined,
      'monitoring',
      false,
    );
  }
}
