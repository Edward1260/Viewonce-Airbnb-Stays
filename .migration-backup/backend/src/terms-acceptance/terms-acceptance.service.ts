import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TermsAcceptance, AcceptanceType } from '../entities/terms-acceptance.entity';
import { User } from '../entities/user.entity';

@Injectable()
export class TermsAcceptanceService {
  constructor(
    @InjectRepository(TermsAcceptance)
    private readonly termsAcceptanceRepository: Repository<TermsAcceptance>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async recordAcceptance(
    userId: string,
    type: AcceptanceType,
    ipAddress?: string,
    userAgent?: string,
    invitationToken?: string,
  ): Promise<TermsAcceptance> {
    const acceptance = this.termsAcceptanceRepository.create({
      userId,
      type,
      ipAddress,
      userAgent,
      invitationToken,
    });

    return this.termsAcceptanceRepository.save(acceptance);
  }

  async getUserAcceptances(userId: string): Promise<TermsAcceptance[]> {
    return this.termsAcceptanceRepository.find({
      where: { userId },
      order: { acceptedAt: 'DESC' },
    });
  }

  async hasAcceptedTerms(userId: string, type?: AcceptanceType): Promise<boolean> {
    const where: any = { userId };
    if (type) {
      where.type = type;
    }

    const count = await this.termsAcceptanceRepository.count({ where });
    return count > 0;
  }
}
