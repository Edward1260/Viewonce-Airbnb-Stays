import { 
  Controller, 
  Get, 
  Post, 
  Body, 
  Param, 
  Put, 
  Delete, 
  UseGuards,
  Req,
  ForbiddenException,
  ParseUUIDPipe 
} from '@nestjs/common';
import { BuildingsService } from './buildings.service';
import { CreateBuildingDto } from './dto/create-building.dto';
import { UpdateBuildingDto } from './dto/update-building.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../entities/user.entity';

@Controller('buildings')
@UseGuards(JwtAuthGuard, RolesGuard)
export class BuildingsController {
  constructor(private readonly buildingsService: BuildingsService) {}

  @Post()
  @Roles(UserRole.HOST, UserRole.ADMIN)
  create(@Body() createBuildingDto: CreateBuildingDto, @Req() req) {
    // Automatically assign the host ID from the authenticated user
    return this.buildingsService.create({
      ...createBuildingDto,
      hostId: req.user.role === UserRole.HOST ? req.user.id : createBuildingDto.hostId,
    });
  }

  @Get()
  @Roles(UserRole.ADMIN)
  findAll() {
    return this.buildingsService.findAll();
  }

  @Get(':id')
  @Roles(UserRole.HOST, UserRole.ADMIN)
  async findOne(@Param('id', ParseUUIDPipe) id: string, @Req() req) {
    const building = await this.buildingsService.findOne(id);
    
    // Ownership check for hosts
    if (req.user.role === UserRole.HOST && building.hostId !== req.user.id) {
      throw new ForbiddenException('You do not have access to this building');
    }
    
    return building;
  }

  @Put(':id')
  @Roles(UserRole.HOST, UserRole.ADMIN)
  async update(@Param('id', ParseUUIDPipe) id: string, @Body() updateBuildingDto: UpdateBuildingDto, @Req() req) {
    const building = await this.buildingsService.findOne(id);
    
    // Ownership check for hosts
    if (req.user.role === UserRole.HOST && building.hostId !== req.user.id) {
      throw new ForbiddenException('You do not have permission to update this building');
    }

    return this.buildingsService.update(id, updateBuildingDto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.buildingsService.remove(id);
  }

  @Post(':id/units')
  @Roles(UserRole.HOST, UserRole.ADMIN)
  async createUnits(
    @Param('id', ParseUUIDPipe) id: string, 
    @Body() createUnitDtos: CreateUnitDto[], 
    @Req() req
  ) {
    const building = await this.buildingsService.findOne(id);
    
    // Ownership check for hosts
    if (req.user.role === UserRole.HOST && building.hostId !== req.user.id) {
      throw new ForbiddenException('You do not have permission to add units to this building');
    }
    
    return this.buildingsService.createUnits(id, createUnitDtos);
  }

  @Get('host/:hostId')
  @Roles(UserRole.HOST, UserRole.ADMIN)
  async getHostBuildings(
    @Param('hostId', ParseUUIDPipe) hostId: string, 
    @Req() req
  ) {
    // Hosts can only see their own buildings
    if (req.user.role === UserRole.HOST && hostId !== req.user.id) {
      throw new ForbiddenException('You can only view your own buildings');
    }
    
    return this.buildingsService.getHostBuildings(hostId);
  }
}
