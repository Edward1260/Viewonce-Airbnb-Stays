import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Review } from '../entities/review.entity';

@Injectable()
export class ReviewsService {
  constructor(
    @InjectRepository(Review)
    private reviewRepository: Repository<Review>,
  ) {}

  async findAll(filters?: any): Promise<Review[]> {
    const query = this.reviewRepository.createQueryBuilder('review')
      .leftJoinAndSelect('review.user', 'user')
      .leftJoinAndSelect('review.property', 'property');

    // Property filter
    if (filters?.propertyId) {
      query.andWhere('review.propertyId = :propertyId', { propertyId: filters.propertyId });
    }

    // User filter
    if (filters?.userId) {
      query.andWhere('review.userId = :userId', { userId: filters.userId });
    }

    // Rating filter
    if (filters?.minRating) {
      query.andWhere('review.rating >= :minRating', { minRating: filters.minRating });
    }

    // Sorting
    const sortBy = filters?.sortBy || 'createdAt';
    const sortOrder = filters?.sortOrder === 'asc' ? 'ASC' : 'DESC';

    switch (sortBy) {
      case 'rating':
        query.orderBy('review.rating', sortOrder);
        break;
      case 'createdAt':
      default:
        query.orderBy('review.createdAt', sortOrder);
        break;
    }

    // Pagination
    const page = parseInt(filters?.page) || 1;
    const limit = parseInt(filters?.limit) || 10;
    const offset = (page - 1) * limit;

    query.skip(offset).take(limit);

    return query.getMany();
  }

  async findOne(id: string): Promise<Review> {
    const review = await this.reviewRepository.findOne({
      where: { id },
      relations: ['user', 'property']
    });
    if (!review) {
      throw new NotFoundException('Review not found');
    }
    return review;
  }

  async create(reviewData: Partial<Review>): Promise<Review> {
    const review = this.reviewRepository.create(reviewData);
    return this.reviewRepository.save(review);
  }

  async update(id: string, reviewData: Partial<Review>): Promise<Review> {
    await this.reviewRepository.update(id, reviewData);
    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    const result = await this.reviewRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException('Review not found');
    }
  }

  async findByProperty(propertyId: string): Promise<Review[]> {
    return this.reviewRepository.find({
      where: { propertyId },
      relations: ['user'],
      order: { createdAt: 'DESC' }
    });
  }

  async findByUser(userId: string): Promise<Review[]> {
    return this.reviewRepository.find({
      where: { userId },
      relations: ['property'],
      order: { createdAt: 'DESC' }
    });
  }
}
