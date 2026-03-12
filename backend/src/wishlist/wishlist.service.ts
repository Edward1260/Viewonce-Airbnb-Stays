import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Wishlist } from '../entities/wishlist.entity';

@Injectable()
export class WishlistService {
  constructor(
    @InjectRepository(Wishlist)
    private wishlistRepository: Repository<Wishlist>,
  ) {}

  async findAll(userId: string): Promise<Wishlist[]> {
    return this.wishlistRepository.find({
      where: { userId },
      relations: ['property', 'property.images', 'property.host'],
      order: { addedAt: 'DESC' },
    });
  }

  async findOne(id: string, userId: string): Promise<Wishlist> {
    const wishlist = await this.wishlistRepository.findOne({
      where: { id, userId },
      relations: ['property', 'property.images', 'property.host'],
    });
    
    if (!wishlist) {
      throw new NotFoundException('Wishlist item not found');
    }
    
    return wishlist;
  }

  async add(userId: string, propertyId: string): Promise<Wishlist> {
    // Check if already in wishlist
    const existing = await this.wishlistRepository.findOne({
      where: { userId, propertyId },
    });
    
    if (existing) {
      throw new ConflictException('Property already in wishlist');
    }
    
    const wishlist = this.wishlistRepository.create({
      userId,
      propertyId,
    });
    
    return this.wishlistRepository.save(wishlist);
  }

  async remove(id: string, userId: string): Promise<void> {
    const result = await this.wishlistRepository.delete({ id, userId });
    
    if (result.affected === 0) {
      throw new NotFoundException('Wishlist item not found');
    }
  }

  async checkIsInWishlist(userId: string, propertyId: string): Promise<boolean> {
    const item = await this.wishlistRepository.findOne({
      where: { userId, propertyId },
    });
    return !!item;
  }
}
