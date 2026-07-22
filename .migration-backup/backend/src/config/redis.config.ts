import { CacheModuleOptions } from '@nestjs/cache-manager';
import { ConfigService } from '@nestjs/config';
import * as redisStore from 'cache-manager-redis-store';

export const redisConfig = (configService: ConfigService): CacheModuleOptions => {
  const useRedis = configService.get<string>('CACHE_DRIVER') === 'redis';

  if (useRedis) {
    return {
      isGlobal: true,
      store: redisStore,
      host: configService.get<string>('REDIS_HOST', 'localhost'),
      port: configService.get<number>('REDIS_PORT', 6379),
      ttl: 300,
    };
  }

  // Development/Default: Use in-memory cache
  return {
    isGlobal: true,
    store: 'memory',
    ttl: 300, // 5 minutes default TTL
    max: 100, // Maximum number of items in cache
  };
};
