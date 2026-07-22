import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, MoreThanOrEqual } from 'typeorm';
import { Booking } from '../entities/booking.entity';
import { User } from '../entities/user.entity';
import { Property, PropertyStatus } from '../entities/property.entity';
import { Payout } from '../entities/payout.entity';

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectRepository(Booking)
    private bookingRepository: Repository<Booking>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Property)
    private propertyRepository: Repository<Property>,
    @InjectRepository(Payout)
    private payoutRepository: Repository<Payout>,
  ) {}

  async getDashboardStats() {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    // User stats
    const totalUsers = await this.userRepository.count();
    const activeHosts = await this.userRepository.count({
      where: { role: 'host', status: 'active' }
    });
    const activeCustomers = await this.userRepository.count({
      where: { role: 'customer', status: 'active' }
    });

    // Booking stats
    const totalBookings = await this.bookingRepository.count();
    const monthlyBookings = await this.bookingRepository.count({
      where: { createdAt: MoreThanOrEqual(startOfMonth) }
    });
    const completedBookings = await this.bookingRepository.count({
      where: { status: 'completed' }
    });
    const cancelledBookings = await this.bookingRepository.count({
      where: { status: 'cancelled' }
    });

    // Revenue stats
    const revenueResult = await this.bookingRepository
      .createQueryBuilder('booking')
      .select('SUM(booking.totalPrice)', 'total')
      .where('booking.status = :status', { status: 'completed' })
      .andWhere('booking.paymentStatus = :paymentStatus', { paymentStatus: 'paid' })
      .getRawOne();

    const monthlyRevenueResult = await this.bookingRepository
      .createQueryBuilder('booking')
      .select('SUM(booking.totalPrice)', 'total')
      .where('booking.status = :status', { status: 'completed' })
      .andWhere('booking.paymentStatus = :paymentStatus', { paymentStatus: 'paid' })
      .andWhere('booking.createdAt >= :startDate', { startDate: startOfMonth })
      .getRawOne();

    // Property stats
    const totalProperties = await this.propertyRepository.count();
    const activeProperties = await this.propertyRepository.count({
      where: { status: PropertyStatus.ACTIVE }
    });

    // Payout stats
    const totalPayouts = await this.payoutRepository.count();
    const completedPayouts = await this.payoutRepository.count({
      where: { status: 'completed' }
    });
    const pendingPayouts = await this.payoutRepository.count({
      where: { status: 'pending' }
    });

    const payoutAmountResult = await this.payoutRepository
      .createQueryBuilder('payout')
      .select('SUM(payout.netAmount)', 'total')
      .where('payout.status = :status', { status: 'completed' })
      .getRawOne();

    return {
      users: {
        total: totalUsers,
        activeHosts,
        activeCustomers,
      },
      bookings: {
        total: totalBookings,
        monthly: monthlyBookings,
        completed: completedBookings,
        cancelled: cancelledBookings,
        cancellationRate: totalBookings > 0 ? (cancelledBookings / totalBookings * 100).toFixed(2) : 0,
      },
      revenue: {
        total: parseFloat(revenueResult?.total || 0),
        monthly: parseFloat(monthlyRevenueResult?.total || 0),
      },
      properties: {
        total: totalProperties,
        active: activeProperties,
      },
      payouts: {
        total: totalPayouts,
        completed: completedPayouts,
        pending: pendingPayouts,
        totalAmount: parseFloat(payoutAmountResult?.total || 0),
      },
      kpis: {
        occupancyRate: await this.calculateOccupancyRate(),
        averageBookingValue: await this.calculateAverageBookingValue(),
        hostSatisfaction: await this.calculateHostSatisfaction(),
        customerRetention: await this.calculateCustomerRetention(),
      },
    };
  }

  async getRevenueChart(days: number = 30) {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - days);

    const revenueData = await this.bookingRepository
      .createQueryBuilder('booking')
      .select('DATE(booking.createdAt)', 'date')
      .addSelect('SUM(booking.totalPrice)', 'revenue')
      .where('booking.status = :status', { status: 'completed' })
      .andWhere('booking.paymentStatus = :paymentStatus', { paymentStatus: 'paid' })
      .andWhere('booking.createdAt BETWEEN :startDate AND :endDate', { startDate, endDate })
      .groupBy('DATE(booking.createdAt)')
      .orderBy('DATE(booking.createdAt)', 'ASC')
      .getRawMany();

    return revenueData.map(item => ({
      date: item.date,
      revenue: parseFloat(item.revenue),
    }));
  }

  async getBookingTrends(days: number = 30) {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - days);

    const bookingData = await this.bookingRepository
      .createQueryBuilder('booking')
      .select('DATE(booking.createdAt)', 'date')
      .addSelect('COUNT(*)', 'count')
      .addSelect('booking.status', 'status')
      .where('booking.createdAt BETWEEN :startDate AND :endDate', { startDate, endDate })
      .groupBy('DATE(booking.createdAt)')
      .addGroupBy('booking.status')
      .orderBy('DATE(booking.createdAt)', 'ASC')
      .getRawMany();

    // Group by date
    const trends = {};
    bookingData.forEach(item => {
      if (!trends[item.date]) {
        trends[item.date] = { date: item.date, total: 0, completed: 0, cancelled: 0, pending: 0 };
      }
      trends[item.date].total += parseInt(item.count);
      trends[item.date][item.status] = parseInt(item.count);
    });

    return Object.values(trends);
  }

  async getTopProperties(limit: number = 10) {
    const properties = await this.propertyRepository
      .createQueryBuilder('property')
      .leftJoin('property.bookings', 'booking')
      .leftJoin('property.reviews', 'review')
      .select('property.id', 'id')
      .addSelect('property.title', 'title')
      .addSelect('property.location', 'location')
      .addSelect('COUNT(DISTINCT booking.id)', 'bookingCount')
      .addSelect('AVG(review.rating)', 'averageRating')
      .addSelect('SUM(booking.totalPrice)', 'totalRevenue')
      .where('booking.status = :status', { status: 'completed' })
      .groupBy('property.id')
      .orderBy('totalRevenue', 'DESC')
      .limit(limit)
      .getRawMany();

    return properties.map(prop => ({
      ...prop,
      bookingCount: parseInt(prop.bookingCount),
      averageRating: parseFloat(prop.averageRating || 0),
      totalRevenue: parseFloat(prop.totalRevenue || 0),
    }));
  }

  async getTopHosts(limit: number = 10) {
    const hosts = await this.userRepository
      .createQueryBuilder('user')
      .leftJoin('user.properties', 'property')
      .leftJoin('property.bookings', 'booking')
      .select('user.id', 'id')
      .addSelect('user.firstName', 'firstName')
      .addSelect('user.lastName', 'lastName')
      .addSelect('COUNT(DISTINCT property.id)', 'propertyCount')
      .addSelect('COUNT(DISTINCT booking.id)', 'bookingCount')
      .addSelect('SUM(booking.totalPrice)', 'totalRevenue')
      .where('user.role = :role', { role: 'host' })
      .andWhere('booking.status = :status', { status: 'completed' })
      .groupBy('user.id')
      .orderBy('totalRevenue', 'DESC')
      .limit(limit)
      .getRawMany();

    return hosts.map(host => ({
      ...host,
      propertyCount: parseInt(host.propertyCount),
      bookingCount: parseInt(host.bookingCount),
      totalRevenue: parseFloat(host.totalRevenue || 0),
    }));
  }

  private async calculateOccupancyRate(): Promise<number> {
    // Simplified calculation - in real app, this would be more complex
    const totalBookings = await this.bookingRepository.count({
      where: { status: 'completed' }
    });
    const totalProperties = await this.propertyRepository.count({
      where: { status: PropertyStatus.ACTIVE }
    });

    if (totalProperties === 0) return 0;

    // Assume average 7-day booking per completed booking
    const totalBookedDays = totalBookings * 7;
    const totalAvailableDays = totalProperties * 30; // 30 days in month

    return Math.min((totalBookedDays / totalAvailableDays * 100), 100);
  }

  private async calculateAverageBookingValue(): Promise<number> {
    const result = await this.bookingRepository
      .createQueryBuilder('booking')
      .select('AVG(booking.totalPrice)', 'average')
      .where('booking.status = :status', { status: 'completed' })
      .getRawOne();

    return parseFloat(result?.average || 0);
  }

  private async calculateHostSatisfaction(): Promise<number> {
    // Simplified - in real app, this would come from host feedback surveys
    return 85.5; // Mock data
  }

  private async calculateCustomerRetention(): Promise<number> {
    // Simplified - calculate repeat customers
    const totalCustomers = await this.userRepository.count({
      where: { role: 'customer' }
    });

    const repeatCustomers = await this.bookingRepository
      .createQueryBuilder('booking')
      .select('booking.userId')
      .groupBy('booking.userId')
      .having('COUNT(booking.id) > 1')
      .getCount();

    if (totalCustomers === 0) return 0;

    return (repeatCustomers / totalCustomers * 100);
  }
}
