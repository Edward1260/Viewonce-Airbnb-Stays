import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
} from '@nestjs/common';
import { LiveToursService } from './live-tours.service';
import { CreateLiveTourDto } from './dto/create-live-tour.dto';
import { UpdateLiveTourDto } from './dto/update-live-tour.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../entities/user.entity';

@Controller('live-tours')
export class LiveToursController {
  constructor(private readonly liveToursService: LiveToursService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  create(@Body() createLiveTourDto: CreateLiveTourDto, @Request() req) {
    return this.liveToursService.create(createLiveTourDto, req.user.id);
  }

  @Get()
  findAll() {
    return this.liveToursService.findAll();
  }

  @Get('active')
  findActive() {
    return this.liveToursService.findActive();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.liveToursService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  update(@Param('id') id: string, @Body() updateLiveTourDto: UpdateLiveTourDto) {
    return this.liveToursService.update(id, updateLiveTourDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  remove(@Param('id') id: string) {
    return this.liveToursService.remove(id);
  }
}
