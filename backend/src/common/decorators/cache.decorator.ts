import { SetMetadata } from '@nestjs/common';

export const CACHE_KEY_METADATA = 'cacheKey';
export const CACHE_TTL_METADATA = 'cacheTtl';
export const CACHE_SKIP_METADATA = 'cacheSkip';

/**
 * Custom decorator to specify cache key for an endpoint
 */
export const CacheKey = (key: string) => SetMetadata(CACHE_KEY_METADATA, key);

/**
 * Custom decorator to specify cache TTL (time to live) in seconds
 */
export const CacheTtl = (ttl: number) => SetMetadata(CACHE_TTL_METADATA, ttl);

/**
 * Custom decorator to skip caching for an endpoint
 */
export const CacheSkip = () => SetMetadata(CACHE_SKIP_METADATA, true);

/**
 * Predefined cache durations
 */
export const CacheDurations = {
  SHORT: 60,        // 1 minute
  MEDIUM: 300,      // 5 minutes
  LONG: 3600,       // 1 hour
  VERY_LONG: 86400, // 24 hours
} as const;

/**
 * Cache key prefixes for different entities
 */
export const CacheKeys = {
  USER: 'user',
  USERS: 'users',
  PROPERTY: 'property',
  PROPERTIES: 'properties',
  BOOKING: 'booking',
  BOOKINGS: 'bookings',
  REVIEW: 'review',
  REVIEWS: 'reviews',
  SEARCH: 'search',
  HEALTH: 'health',
} as const;
