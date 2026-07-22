import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
  BadRequestException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { HostInvitationService } from './host-invitation.service';
import { CreateHostInvitationDto } from './dto/create-host-invitation.dto';
import { HostInvitation } from '../entities/host-invitation.entity';

@Controller('properties/host-invitations')
@UseGuards(JwtAuthGuard)
export class HostInvitationController {
  constructor(private readonly invitationService: HostInvitationService) {}

  @Post()
  async createInvitation(
    @Body() dto: CreateHostInvitationDto,
    @Request() req: any,
  ): Promise<HostInvitation> {
    // Only admins can create invitations
    if (req.user.role !== 'admin') {
      throw new BadRequestException('Only administrators can create host invitations');
    }

    return this.invitationService.createInvitation(dto, req.user.id);
  }

  @Get()
  async getInvitations(@Request() req: any): Promise<HostInvitation[]> {
    // Only admins can view invitations
    if (req.user.role !== 'admin') {
      throw new BadRequestException('Only administrators can view invitations');
    }

    return this.invitationService.getInvitationsByAdmin(req.user.id);
  }

  @Get('stats')
  async getInvitationStats(@Request() req: any) {
    // Only admins can view stats
    if (req.user.role !== 'admin') {
      throw new BadRequestException('Only administrators can view invitation stats');
    }

    return this.invitationService.getInvitationStats(req.user.id);
  }

  @Delete(':id')
  async cancelInvitation(
    @Param('id') id: string,
    @Request() req: any,
  ): Promise<void> {
    // Only admins can cancel invitations
    if (req.user.role !== 'admin') {
      throw new BadRequestException('Only administrators can cancel invitations');
    }

    return this.invitationService.cancelInvitation(id, req.user.id);
  }
}

// Public endpoint for validating invitations (used by signup page)
@Controller('properties/host-invitations')
export class PublicHostInvitationController {
  constructor(private readonly invitationService: HostInvitationService) {}

  @Get('validate/:token')
  async validateInvitation(@Param('token') token: string): Promise<HostInvitation> {
    return this.invitationService.validateInvitation(token);
  }
}
