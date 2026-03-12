import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Request, BadRequestException, ForbiddenException } from '@nestjs/common';
import { ReviewsService } from './reviews.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../entities/user.entity';

@Controller('reviews')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Get()
  @Roles(UserRole.CUSTOMER, UserRole.HOST, UserRole.ADMIN)
  async findAll(@Query() filters: any) {
    return this.reviewsService.findAll(filters);
  }

  @Get(':id')
  @Roles(UserRole.CUSTOMER, UserRole.HOST, UserRole.ADMIN)
  async findOne(@Param('id') id: string) {
    return this.reviewsService.findOne(id);
  }

  @Get('property/:propertyId')
  @Roles(UserRole.CUSTOMER, UserRole.HOST, UserRole.ADMIN)
  async findByProperty(@Param('propertyId') propertyId: string) {
    return this.reviewsService.findByProperty(propertyId);
  }

  @Get('user/:userId')
  @Roles(UserRole.CUSTOMER, UserRole.HOST, UserRole.ADMIN)
  async findByUser(@Param('userId') userId: string) {
    return this.reviewsService.findByUser(userId);
  }

  @Post()
  @Roles(UserRole.CUSTOMER)
  async create(@Body() createReviewDto: any, @Request() req) {
    const reviewData = {
      ...createReviewDto,
      userId: req.user.userId
    };
    return this.reviewsService.create(reviewData);
  }

  @Put(':id')
  @Roles(UserRole.CUSTOMER)
  async update(@Param('id') id: string, @Body() updateReviewDto: any, @Request() req) {
    // Check if user owns the review
    const review = await this.reviewsService.findOne(id);
    if (review.userId !== req.user.userId) {
      throw new ForbiddenException('You can only update your own reviews');
    }
    return this.reviewsService.update(id, updateReviewDto);
  }

  @Delete(':id')
  @Roles(UserRole.CUSTOMER, UserRole.ADMIN)
  async remove(@Param('id') id: string, @Request() req) {
    // Check if user owns the review or is admin
    const review = await this.reviewsService.findOne(id);
    if (review.userId !== req.user.userId && req.user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('You can only delete your own reviews');
    }
    return this.reviewsService.remove(id);
  }
}
