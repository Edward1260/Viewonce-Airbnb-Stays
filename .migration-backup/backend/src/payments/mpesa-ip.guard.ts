import { Injectable, CanActivate, ExecutionContext, ForbiddenException, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SAFARICOM_IPS } from './mpesa.constants';
import { AuditLog, AuditAction, AuditSeverity } from '../entities/audit-log.entity';

@Injectable()
export class MpesaIpGuard implements CanActivate {
  constructor(
    @InjectRepository(AuditLog)
    private auditLogRepository: Repository<AuditLog>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    
    // Get IP, considering potential proxy headers (like Nginx)
    const clientIp = request.headers['x-forwarded-for']?.split(',')[0] || 
                     request.socket.remoteAddress || 
                     request.ip;

    // Clean IPv6 prefix for IPv4 addresses
    const cleanIp = clientIp.replace(/^.*:/, '');

    if (SAFARICOM_IPS.includes(cleanIp) || SAFARICOM_IPS.includes(clientIp)) {
      return true;
    }

    // Logging best practices: capture IP, user agent, and request details for forensic analysis
    await this.auditLogRepository.save({
      action: AuditAction.SYSTEM_ALERT,
      description: `Unauthorized M-Pesa callback attempt from IP: ${clientIp}`,
      severity: AuditSeverity.HIGH,
      ipAddress: clientIp,
      userAgent: request.headers['user-agent'],
      service: 'MpesaPaymentService',
      metadata: {
        path: request.url,
        method: request.method,
        headers: request.headers,
      },
    });

    console.warn(`Unauthorized M-Pesa callback attempt from IP: ${clientIp}`);
    throw new ForbiddenException('Unauthorized callback source');
  }
}