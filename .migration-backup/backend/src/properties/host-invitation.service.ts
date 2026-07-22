import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HostInvitation, InvitationStatus } from '../entities/host-invitation.entity';
import { User } from '../entities/user.entity';
import { CreateHostInvitationDto } from './dto/create-host-invitation.dto';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class HostInvitationService {
  constructor(
    @InjectRepository(HostInvitation)
    private readonly invitationRepository: Repository<HostInvitation>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async createInvitation(
    dto: CreateHostInvitationDto,
    createdById: string,
  ): Promise<HostInvitation> {
    // Check if email already has a pending invitation
    const existingInvitation = await this.invitationRepository.findOne({
      where: { email: dto.email, status: InvitationStatus.PENDING },
    });

    if (existingInvitation) {
      throw new BadRequestException('An invitation is already pending for this email');
    }

    // Check if user already exists with this email
    const existingUser = await this.userRepository.findOne({
      where: { email: dto.email },
    });

    if (existingUser) {
      throw new BadRequestException('A user with this email already exists');
    }

    const expiresInHours = dto.expiresInHours || 24;
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + expiresInHours);

    const invitation = this.invitationRepository.create({
      token: uuidv4(),
      email: dto.email,
      phone: dto.phone,
      message: dto.message,
      expiresAt,
      createdById,
    });

    return this.invitationRepository.save(invitation);
  }

  async validateInvitation(token: string): Promise<HostInvitation> {
    const invitation = await this.invitationRepository.findOne({
      where: { token },
      relations: ['createdBy'],
    });

    if (!invitation) {
      throw new NotFoundException('Invitation not found');
    }

    if (!invitation.isValid()) {
      throw new BadRequestException('Invitation is expired or already used');
    }

    return invitation;
  }

  async useInvitation(token: string, userId: string): Promise<void> {
    const invitation = await this.invitationRepository.findOne({
      where: { token },
    });

    if (!invitation) {
      throw new NotFoundException('Invitation not found');
    }

    if (!invitation.isValid()) {
      throw new BadRequestException('Invitation is expired or already used');
    }

    invitation.status = InvitationStatus.USED;
    invitation.usedAt = new Date();
    invitation.usedById = userId;

    await this.invitationRepository.save(invitation);
  }

  async getInvitationsByAdmin(adminId: string): Promise<HostInvitation[]> {
    return this.invitationRepository.find({
      where: { createdById: adminId },
      relations: ['usedBy', 'createdBy'],
      order: { createdAt: 'DESC' },
    });
  }

  async cancelInvitation(id: string, adminId: string): Promise<void> {
    const invitation = await this.invitationRepository.findOne({
      where: { id, createdById: adminId },
    });

    if (!invitation) {
      throw new NotFoundException('Invitation not found');
    }

    if (invitation.status !== InvitationStatus.PENDING) {
      throw new BadRequestException('Only pending invitations can be cancelled');
    }

    invitation.status = InvitationStatus.CANCELLED;
    await this.invitationRepository.save(invitation);
  }

  async getInvitationStats(adminId: string): Promise<{
    total: number;
    pending: number;
    used: number;
    expired: number;
    cancelled: number;
  }> {
    const invitations = await this.invitationRepository.find({
      where: { createdById: adminId },
    });

    const stats = {
      total: invitations.length,
      pending: 0,
      used: 0,
      expired: 0,
      cancelled: 0,
    };

    invitations.forEach(invitation => {
      if (invitation.status === InvitationStatus.PENDING) {
        if (invitation.isExpired()) {
          stats.expired++;
        } else {
          stats.pending++;
        }
      } else if (invitation.status === InvitationStatus.USED) {
        stats.used++;
      } else if (invitation.status === InvitationStatus.CANCELLED) {
        stats.cancelled++;
      }
    });

    return stats;
  }
}
