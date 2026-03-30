import { Injectable } from '@nestjs/common';
import { InjectRepository, Inject } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Review } from '../entities/review.entity';
import { Property } from '../entities/property.entity';
import { CreateReviewDto } from './dto/create-review.dto';

@Injectable()
export class ReviewsService {
  constructor(
    @InjectRepository(Review)
    private reviewsRepository: Repository<Review>,
    @InjectRepository(Property)
    private propertyRepository: Repository<Property>,
  ) {}

  async findByUserId(userId: string) {
    return this.reviewsRepository.find({
      where: { user: { id: userId } },
      relations: ['property'], // Ensures the property title is available for the UI
      order: { createdAt: 'DESC' },
    });
  }

  async create(userId: string, createReviewDto: CreateReviewDto): Promise<Review> {
    const { propertyId, rating, text } = createReviewDto;

    const review = this.reviewsRepository.create({
      userId,
      propertyId,
      rating,
      text,
    });

    const savedReview = await this.reviewsRepository.save(review);

    // Update property's rating and reviewCount
    const property = await this.propertyRepository.findOne({ where: { id: propertyId }, relations: ['reviews'] });
    if (property) {
      const allRatings = property.reviews.map(r => r.rating);
      property.rating = allRatings.reduce((sum, r) => sum + r, 0) / allRatings.length;
      property.reviewCount = property.reviews.length;
      await this.propertyRepository.save(property);
    }

    return savedReview;
  }

  async delete(reviewId: string, userId: string): Promise<void> {
    const review = await this.reviewsRepository.findOne({
      where: { id: reviewId, userId: userId },
      relations: ['property'],
    });

    if (!review) {
      throw new Error('Review not found or you do not have permission to delete it.');
    }

    await this.reviewsRepository.remove(review);

    // Update property's rating and reviewCount after deletion
    const property = await this.propertyRepository.findOne({ where: { id: review.propertyId }, relations: ['reviews'] });
    if (property) {
      const allRatings = property.reviews.map(r => r.rating);
      property.rating = allRatings.length > 0 ? allRatings.reduce((sum, r) => sum + r, 0) / allRatings.length : 0;
      property.reviewCount = allRatings.length;
      await this.propertyRepository.save(property);
    }
  }
}