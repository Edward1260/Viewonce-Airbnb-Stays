import { Injectable } from '@nestjs/common';
import { HealthCheckService, HealthIndicatorResult } from '@nestjs/terminus';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Property } from '../entities/property.entity';
import { User } from '../entities/user.entity';
import { Booking } from '../entities/booking.entity';

@Injectable()
export class HealthService {
  constructor(
    private health: HealthCheckService,
    @InjectRepository(Property)
    private propertyRepository: Repository<Property>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Booking)
    private bookingRepository: Repository<Booking>,
  ) {}

  async getHealthStatus() {
    const healthCheck = await this.health.check([
      () => this.checkDatabase(),
      () => this.checkMemory(),
      () => this.checkDiskSpace(),
      () => this.checkServices(),
    ]);

    return {
      status: healthCheck.status,
      timestamp: new Date().toISOString(),
      checks: healthCheck.details,
      uptime: process.uptime(),
      version: process.version,
    };
  }

  private async checkDatabase(): Promise<HealthIndicatorResult> {
    try {
      // Test database connectivity
      await this.userRepository.count();
      await this.propertyRepository.count();
      await this.bookingRepository.count();

      return {
        database: {
          status: 'up',
          message: 'Database connection is healthy',
        },
      };
    } catch (error) {
      return {
        database: {
          status: 'down',
          message: `Database connection failed: ${error.message}`,
        },
      };
    }
  }

  private async checkMemory(): Promise<HealthIndicatorResult> {
    const memUsage = process.memoryUsage();
    const totalMemory = memUsage.heapTotal / 1024 / 1024; // MB
    const usedMemory = memUsage.heapUsed / 1024 / 1024; // MB
    const memoryUsagePercent = (usedMemory / totalMemory) * 100;

    const status = memoryUsagePercent > 80 ? 'down' : 'up';

    return {
      memory: {
        status,
        message: `Memory usage: ${usedMemory.toFixed(2)}MB / ${totalMemory.toFixed(2)}MB (${memoryUsagePercent.toFixed(2)}%)`,
        details: {
          used: usedMemory,
          total: totalMemory,
          percentage: memoryUsagePercent,
        },
      },
    };
  }

  private async checkDiskSpace(): Promise<HealthIndicatorResult> {
    // Simulate disk space check (in real implementation, use fs.statvfs or similar)
    const diskUsage = {
      used: 45.2, // GB
      total: 100, // GB
      percentage: 45.2,
    };

    const status = diskUsage.percentage > 90 ? 'down' : 'up';

    return {
      disk: {
        status,
        message: `Disk usage: ${diskUsage.used}GB / ${diskUsage.total}GB (${diskUsage.percentage}%)`,
        details: diskUsage,
      },
    };
  }

  private async checkServices(): Promise<HealthIndicatorResult> {
    // Check if critical services are running
    const services = {
      api: true,
      database: true,
      cache: true,
      email: false, // Simulate email service down
    };

    const allHealthy = Object.values(services).every(status => status);
    const status = allHealthy ? 'up' : 'down';

    return {
      services: {
        status,
        message: allHealthy ? 'All services are running' : 'Some services are down',
        details: services,
      },
    };
  }

  async getDetailedHealth() {
    const health = await this.getHealthStatus();

    // Add more detailed metrics
    const detailedMetrics = {
      ...health,
      system: {
        platform: process.platform,
        arch: process.arch,
        nodeVersion: process.version,
        uptime: process.uptime(),
        pid: process.pid,
      },
      process: {
        memory: process.memoryUsage(),
        cpuUsage: process.cpuUsage(),
      },
    };

    return detailedMetrics;
  }
}
