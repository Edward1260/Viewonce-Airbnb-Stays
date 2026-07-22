import { Injectable, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from '@nestjs/cache-manager';

@Injectable()
export class CacheService {
  constructor(
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  /**
   * Get a value from cache
   */
  async get<T>(key: string): Promise<T | undefined> {
    return this.cacheManager.get<T>(key);
  }

  /**
   * Set a value in cache with TTL (time to live) in seconds
   */
  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    if (ttl) {
      await this.cacheManager.set(key, value, ttl * 1000);
    } else {
      await this.cacheManager.set(key, value);
    }
  }

  /**
   * Delete a value from cache
   */
  async del(key: string): Promise<void> {
    await this.cacheManager.del(key);
  }

  /**
   * Clear all cache - implementation depends on cache store
   */
  async reset(): Promise<void> {
    try {
      await this.cacheManager.reset();
    } catch (error) {
      console.error('Failed to reset cache:', error);
      // Fallback: if reset() is not supported by the store, handle gracefully
    }
  }

  /**
   * Get cache stats (for monitoring)
   */
  async getStats(): Promise<any> {
    return {
      type: 'cache',
    };
  }

  /**
   * Cache invalidation helpers for common patterns
   */

  /**
   * Invalidate user cache when user data changes
   */
  async invalidateUserCache(userId: string): Promise<void> {
    await this.del(`user:${userId}`);
    await this.del('users:all');
  }

  /**
   * Invalidate property cache when property data changes
   */
  async invalidatePropertyCache(propertyId: string): Promise<void> {
    await this.del(`property:${propertyId}`);
    await this.del('properties:all');
    await this.del('properties:latest');
    
    // Note: If using Redis, we would use a wildcard pattern here:
    // await this.cacheManager.store.keys('properties:public:*')
    
    // For standard cache-manager, we clear the main entry points
    // and rely on the PropertiesService to manage its specific list keys.
    await this.del('properties:public:{}'); 
  }

  /**
   * Invalidate booking cache when booking data changes
   */
  async invalidateBookingCache(bookingId: string, userId?: string, propertyId?: string): Promise<void> {
    await this.del(`booking:${bookingId}`);
    if (userId) {
      await this.del(`bookings:user:${userId}`);
    }
    if (propertyId) {
      await this.del(`bookings:property:${propertyId}`);
    }
  }

  /**
   * Invalidate search cache
   */
  async invalidateSearchCache(): Promise<void> {
    // Clear all search-related cache
    console.log('Search cache invalidation called');
  }
}
