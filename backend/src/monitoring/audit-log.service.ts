import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog, AuditAction, AuditSeverity } from '../entities/audit-log.entity';
import { User } from '../entities/user.entity';

@Injectable()
export class AuditLogService {
  constructor(
    @InjectRepository(AuditLog)
    private readonly auditLogRepository: Repository<AuditLog>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async logAction(
    action: AuditAction,
    description: string,
    userId?: string,
    metadata?: Record<string, any>,
    severity: AuditSeverity = AuditSeverity.LOW,
    ipAddress?: string,
    userAgent?: string,
    service?: string,
    requiresMfa: boolean = false,
  ): Promise<AuditLog> {
    let user: User | undefined;
    if (userId) {
      user = await this.userRepository.findOne({ where: { id: userId } });
    }

    const auditLog = this.auditLogRepository.create({
      action,
      description,
      severity,
      metadata,
      ipAddress,
      userAgent,
      user,
      userId,
      service,
      requiresMfa,
    });

    return this.auditLogRepository.save(auditLog);
  }

  async getAuditStats(): Promise<{
    totalLogs: number;
    logsByAction: Record<string, number>;
    logsBySeverity: Record<string, number>;
    recentLogs: AuditLog[];
  }> {
    const totalLogs = await this.auditLogRepository.count();

    const logsByAction = await this.auditLogRepository
      .createQueryBuilder('log')
      .select('log.action', 'action')
      .addSelect('COUNT(*)', 'count')
      .groupBy('log.action')
      .getRawMany();

    const logsBySeverity = await this.auditLogRepository
      .createQueryBuilder('log')
      .select('log.severity', 'severity')
      .addSelect('COUNT(*)', 'count')
      .groupBy('log.severity')
      .getRawMany();

    const recentLogs = await this.auditLogRepository.find({
      order: { createdAt: 'DESC' },
      take: 10,
      relations: ['user'],
    });

    return {
      totalLogs,
      logsByAction: logsByAction.reduce((acc, item) => {
        acc[item.action] = parseInt(item.count);
        return acc;
      }, {}),
      logsBySeverity: logsBySeverity.reduce((acc, item) => {
        acc[item.severity] = parseInt(item.count);
        return acc;
      }, {}),
      recentLogs,
    };
  }

  async findAll(options?: {
    skip?: number;
    take?: number;
    action?: AuditAction;
    severity?: AuditSeverity;
    userId?: string;
  }): Promise<[AuditLog[], number]> {
    const query = this.auditLogRepository.createQueryBuilder('log')
      .leftJoinAndSelect('log.user', 'user');

    if (options?.action) {
      query.andWhere('log.action = :action', { action: options.action });
    }

    if (options?.severity) {
      query.andWhere('log.severity = :severity', { severity: options.severity });
    }

    if (options?.userId) {
      query.andWhere('log.userId = :userId', { userId: options.userId });
    }

    query.orderBy('log.createdAt', 'DESC');

    if (options?.skip) {
      query.skip(options.skip);
    }

    if (options?.take) {
      query.take(options.take);
    }

    return query.getManyAndCount();
  }

  async findOne(id: number): Promise<AuditLog | null> {
    return this.auditLogRepository.findOne({
      where: { id },
      relations: ['user'],
    });
  }
}
