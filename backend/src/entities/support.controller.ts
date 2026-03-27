import { Controller, Get, Post, Put, Delete, Body, Param, Query, Request, UseGuards } from '@nestjs/common';
import { SupportService } from './support.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../entities/user.entity';

@Controller('support')
export class SupportController {
  constructor(private readonly supportService: SupportService) {}

  @Get('tickets')
  findAll(@Query() filters: any) {
    return this.supportService.findAll(filters);
  }

  @Get('stats')
  getStats() {
    return this.supportService.getStats();
  }

  @Get('tickets/:id')
  findOne(@Param('id') id: string) {
    return this.supportService.findOne(id);
  }

  @UseGuards(JwtAuthGuard)
  @Post('tickets/:id/comments')
  addComment(@Param('id') id: string, @Body() commentData: any, @Request() req: any) {
    return this.supportService.addComment(id, req.user.id, commentData);
  }

  @Post('tickets')
  create(@Body() createDto: any) {
    return this.supportService.create(createDto);
  }

  @Put('tickets/:id')
  update(@Param('id') id: string, @Body() updateDto: any) {
    return this.supportService.update(id, updateDto);
  }

  @Delete('tickets/:id')
  remove(@Param('id') id: string) {
    return this.supportService.remove(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPPORT, UserRole.ADMIN)
  @Put('hosts/:id/propose-phone')
  proposeHostPhone(@Param('id') id: string, @Body('phone') phone: string, @Request() req: any) {
    return this.supportService.proposeHostPhoneUpdate(id, phone, req.user.id);
  }
}