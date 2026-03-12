import { Controller, Post, Get, Body, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TermsAcceptanceService } from './terms-acceptance.service';
import { AcceptanceType } from '../entities/terms-acceptance.entity';

@Controller('terms-acceptance')
@UseGuards(JwtAuthGuard)
export class TermsAcceptanceController {
  constructor(private readonly termsAcceptanceService: TermsAcceptanceService) {}

  @Post()
  async recordAcceptance(
    @Body() body: { type: AcceptanceType; invitationToken?: string },
    @Request() req: any,
  ) {
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent');

    return this.termsAcceptanceService.recordAcceptance(
      req.user.id,
      body.type,
      ipAddress,
      userAgent,
      body.invitationToken,
    );
  }

  @Get()
  async getUserAcceptances(@Request() req: any) {
    return this.termsAcceptanceService.getUserAcceptances(req.user.id);
  }

  @Get('has-accepted')
  async hasAcceptedTerms(
    @Request() req: any,
    @Body() body?: { type?: AcceptanceType },
  ) {
    return {
      hasAccepted: await this.termsAcceptanceService.hasAcceptedTerms(
        req.user.id,
        body?.type,
      ),
    };
  }
}
