import { Controller, Get, Post, Delete, Param, UseGuards, Body, Request, HttpStatus, HttpException } from '@nestjs/common';
import { ReviewsService } from './reviews.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateReviewDto } from './dto/create-review.dto';

@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @UseGuards(JwtAuthGuard)
  @Get('user/:userId') // This endpoint is for fetching reviews by a specific user
  async getUserReviews(@Param('userId') userId: string) {
    return this.reviewsService.findByUserId(userId);
  }

  @UseGuards(JwtAuthGuard)
  @Post() // This endpoint is for submitting a new review
  async createReview(
    @Request() req, // Assuming req.user contains the authenticated user's data
    @Body() createReviewDto: CreateReviewDto,
  ) {
    return this.reviewsService.create(req.user.id, createReviewDto);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id') // New endpoint for deleting a review
  async deleteReview(@Param('id') reviewId: string, @Request() req) {
    try {
      await this.reviewsService.delete(reviewId, req.user.id);
      return { message: 'Review deleted successfully' };
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.FORBIDDEN);
    }
  }
}