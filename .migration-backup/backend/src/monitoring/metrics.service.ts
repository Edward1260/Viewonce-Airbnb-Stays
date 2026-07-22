import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { User } from '../entities/user.entity';
import { Property, PropertyStatus } from '../entities/property.entity';
import { Booking } from '../entities/booking.entity';

@Injectable()
export class MetricsService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Property)
    private propertyRepository: Repository<Property>,
    @InjectRepository(Booking)
    private bookingRepository: Repository<Booking>,
  ) {}

  async getSystemMetrics() {
    const now = new Date();
    const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // User metrics
    const totalUsers = await this.userRepository.count();
    const activeUsers24h = await this.userRepository.count({
      where: { lastLoginAt: MoreThan(last24Hours) },
    });
    const newUsers7d = await this.userRepository.count({
      where: { createdAt: MoreThan(last7Days) },
    });

    // Property metrics
    const totalProperties = await this.propertyRepository.count();
    const activeProperties = await this.propertyRepository.count({
      where: { status: PropertyStatus.ACTIVE },
    });

    // Booking metrics
    const totalBookings = await this.bookingRepository.count();
    const recentBookings = await this.bookingRepository.count({
      where: { createdAt: MoreThan(last24Hours) },
    });

    // Revenue calculation (simplified)
    const bookings = await this.bookingRepository.find({
      where: { createdAt: MoreThan(last7Days) },
      select: ['totalPrice'],
    });
    const revenue7d = bookings.reduce((sum, booking) => sum + (booking.totalPrice || 0), 0);

    return {
      users: {
        total: totalUsers,
        active24h: activeUsers24h,
        new7d: newUsers7d,
      },
      properties: {
        total: totalProperties,
        active: activeProperties,
      },
      bookings: {
        total: totalBookings,
        recent24h: recentBookings,
      },
      revenue: {
        last7d: revenue7d,
      },
      timestamp: now.toISOString(),
    };
  }

  async getPerformanceMetrics() {
    const memUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();

    return {
      memory: {
        used: memUsage.heapUsed / 1024 / 1024, // MB
        total: memUsage.heapTotal / 1024 / 1024, // MB
        external: memUsage.external / 1024 / 1024, // MB
        rss: memUsage.rss / 1024 / 1024, // MB
        usagePercent: (memUsage.heapUsed / memUsage.heapTotal) * 100,
      },
      cpu: {
        user: cpuUsage.user / 1000, // seconds
        system: cpuUsage.system / 1000, // seconds
      },
      process: {
        uptime: process.uptime(),
        pid: process.pid,
        platform: process.platform,
        arch: process.arch,
        nodeVersion: process.version,
      },
      timestamp: new Date().toISOString(),
    };
  }

  async getDatabaseMetrics() {
    try {
      // Get connection pool stats (simplified)
      const poolStats = {
        totalConnections: 10,
        activeConnections: 3,
        idleConnections: 7,
        waitingClients: 0,
      };

      // Query performance metrics (simplified)
      const queryStats = {
        slowQueries: 2,
        avgQueryTime: 45, // ms
        totalQueries: 15420,
      };

      return {
        pool: poolStats,
        queries: queryStats,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }

  async getApiMetrics() {
    // Simulate API metrics
    return {
      requests: {
        total: 45230,
        lastHour: 1234,
        last24Hours: 8765,
      },
      responseTimes: {
        avg: 145, // ms
        p95: 320, // ms
        p99: 580, // ms
      },
      errors: {
        total: 23,
        lastHour: 2,
        rate: 0.05, // 0.05%
      },
      endpoints: {
        mostUsed: '/api/properties',
        slowest: '/api/bookings/search',
      },
      timestamp: new Date().toISOString(),
    };
  }

  async getCacheMetrics() {
    // Simulate cache metrics
    return {
      hitRate: 0.87, // 87%
      hits: 15420,
      misses: 2340,
      size: 45.2, // MB
      items: 1234,
      timestamp: new Date().toISOString(),
    };
  }

  async getAllMetrics() {
    const [system, performance, database, api, cache] = await Promise.all([
      this.getSystemMetrics(),
      this.getPerformanceMetrics(),
      this.getDatabaseMetrics(),
      this.getApiMetrics(),
      this.getCacheMetrics(),
    ]);

    return {
      system,
      performance,
      database,
      api,
      cache,
      timestamp: new Date().toISOString(),
    };
  }
}
