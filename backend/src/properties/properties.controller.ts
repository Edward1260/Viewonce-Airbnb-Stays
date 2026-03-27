import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  BadRequestException,
  Req,
  ForbiddenException,
} from '@nestjs/common';
import { UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ImageClassificationService } from '../image-classification/image-classification.service';
import { PropertiesService } from './properties.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../entities/user.entity';
import { CreatePropertyDto } from './dto/create-property.dto';
import { UpdatePropertyDto } from './dto/update-property.dto';
import { PropertyOwnershipPipe } from './pipes/property-ownership.pipe';

@Controller('properties')
export class PropertiesController {
  constructor(
    private readonly propertiesService: PropertiesService,
    private readonly imageClassificationService: ImageClassificationService
  ) {}

  // =========================
  // CUSTOMER / PUBLIC VIEW
  // =========================
  @Get()
  async findAll(@Query() filters: any) {
    const [properties, total] = await this.propertiesService.findAll(filters);
    const page = filters.page || 1;
    const limit = filters.limit || 10;
    return {
      data: properties,
      total,
      page,
      limit,
      totalPages: Math.ceil(Number(total) / limit),
    };
  }

  // =========================
  // HOST DASHBOARD
  // =========================
  @Get('host/my-properties')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.HOST, UserRole.ADMIN)
  async findMyProperties(@Req() req) {
    return this.propertiesService.findByHost(req.user.id);
  }

  // =========================
  // ADMIN DASHBOARD
  // =========================
  @Get('admin/all')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async findAllForAdmin(@Query() filters: any) {
    const [properties, total] = await this.propertiesService.findAllForAdmin(filters);
    const page = Number(filters.page) || 1;
    const limit = Number(filters.limit) || 10;

    return {
      data: properties,
      total,
      page,
      limit,
      totalPages: Math.ceil(Number(total) / limit),
    };
  }

  // =========================
  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.CUSTOMER, UserRole.HOST, UserRole.ADMIN)
  async findOne(@Param('id') id: string) {
    return this.propertiesService.findOne(id);
  }

  // =========================
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.HOST, UserRole.ADMIN)
  async create(@Body() dto: CreatePropertyDto, @Req() req) {
    const property = await this.propertiesService.create({
      ...dto,
      hostId: req.user.id,
    });
    return this.mapPropertyResponse(property);
  }

  @Post('classify-image')
  @UseInterceptors(FileInterceptor('image'))
  async classifyImage(@UploadedFile() image: Express.Multer.File) {
    if (!image) {
      throw new BadRequestException('No image file provided');
    }
    //Adapt this code to your file structure, the code below is just an example
    const classification = await this.imageClassificationService.classifyImage(image.buffer);
    return classification;
  }

  // =========================
  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.HOST, UserRole.ADMIN)
  async update(
    @Param('id', PropertyOwnershipPipe) id: string,
    @Body() updatePropertyDto: UpdatePropertyDto,
  ) {
    const updated = await this.propertiesService.update(id, updatePropertyDto);
    return this.mapPropertyResponse(updated);
  }

  // =========================
  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.HOST, UserRole.ADMIN)
  async remove(@Param('id', PropertyOwnershipPipe) id: string) {
    return this.propertiesService.remove(id);
  }

  private mapPropertyResponse(property: any) {
    return {
      id: property.id,
      title: property.title,
      location: property.location,
      price: property.price,
      type: property.type,
      bedrooms: property.bedrooms,
      bathrooms: property.bathrooms,
      maxGuests: property.maxGuests,
      description: property.description,
      amenities: property.amenities,
      images: property.images,
      status: property.status,
      createdAt: property.createdAt,
      updatedAt: property.updatedAt,
    };
  }
}
