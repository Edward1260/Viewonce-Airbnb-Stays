import { Controller, Get, UseGuards, Request } from '@nestjs/common';
import { PropertiesService } from './properties.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../entities/user.entity';

@Controller('properties')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PropertiesController {
  constructor(private readonly propertiesService: PropertiesService) {}

  @Get('my')
  @Roles(UserRole.HOST, UserRole.ADMIN)
  async getMyProperties(@Request() req) {
    // Extract the host ID from the authenticated request user
    const hostId = req.user.id;
    return this.propertiesService.findByHost(hostId);
  }
}