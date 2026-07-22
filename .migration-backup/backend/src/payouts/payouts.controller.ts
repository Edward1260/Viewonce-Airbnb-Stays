import { Controller, Get, Post, Put, Param, Body, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../entities/user.entity';
import { PayoutsService } from './payouts.service';

@Controller('payouts')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PayoutsController {
  constructor(private readonly payoutsService: PayoutsService) {}

  @Get()
  @Roles(UserRole.ADMIN)
  async findAll(@Query() query: { status?: string; hostId?: string }) {
    return this.payoutsService.findAll(query);
  }

  @Get(':id')
  @Roles(UserRole.ADMIN)
  async findOne(@Param('id') id: string) {
    return this.payoutsService.findOne(id);
  }

  @Post(':bookingId/create')
  @Roles(UserRole.ADMIN)
  async createPayout(@Param('bookingId') bookingId: string) {
    return this.payoutsService.createPayout(bookingId);
  }

  @Put(':id/approve')
  @Roles(UserRole.ADMIN)
  async approvePayout(@Param('id') id: string) {
    return this.payoutsService.approvePayout(id);
  }

  @Put(':id/complete')
  @Roles(UserRole.ADMIN)
  async completePayout(@Param('id') id: string) {
    return this.payoutsService.completePayout(id);
  }

  @Put(':id/cancel')
  @Roles(UserRole.ADMIN)
  async cancelPayout(@Param('id') id: string, @Body() body: { reason?: string }) {
    return this.payoutsService.cancelPayout(id, body.reason);
  }

  @Put(':id/dispute')
  @Roles(UserRole.ADMIN)
  async disputePayout(@Param('id') id: string, @Body() body: { reason: string }) {
    return this.payoutsService.disputePayout(id, body.reason);
  }
}
