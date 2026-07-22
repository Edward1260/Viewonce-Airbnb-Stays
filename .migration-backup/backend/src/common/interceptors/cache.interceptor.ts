import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Inject } from '@nestjs/common';
import { Observable, from } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager';
import { Reflector } from '@nestjs/core';
import { CACHE_KEY_METADATA, CACHE_TTL_METADATA, CACHE_SKIP_METADATA } from '../decorators/cache.decorator';

@Injectable()
export class HttpCacheInterceptor implements NestInterceptor {
  constructor(
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private reflector: Reflector,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const method = request.method;

    // Only cache GET requests
    if (method !== 'GET') {
      return next.handle();
    }

    // Check if caching should be skipped
    const skipCache = this.reflector.get<boolean>(CACHE_SKIP_METADATA, context.getHandler());
    if (skipCache) {
      return next.handle();
    }

    // Get custom cache key or generate default
    const customKey = this.reflector.get<string>(CACHE_KEY_METADATA, context.getHandler());
    const cacheKey = customKey || this.generateCacheKey(request);

    // Get custom TTL or use default
    const customTtl = this.reflector.get<number>(CACHE_TTL_METADATA, context.getHandler());

    // Try to get from cache - convert Promise to Observable using from()
    return from(this.cacheManager.get(cacheKey)).pipe(
      switchMap(async (cachedData) => {
        if (cachedData) {
          // Return cached data if available
          return cachedData;
        }
        // Otherwise, execute the handler and cache the result
        const data = await next.handle().toPromise();
        if (data) {
          const ttl = customTtl || 300; // Default 5 minutes
          await this.cacheManager.set(cacheKey, data, ttl * 1000);
        }
        return data;
      }),
    );
  }

  private generateCacheKey(request: any): string {
    // Generate a unique cache key based on URL and query params
    const url = request.url;
    const query = JSON.stringify(request.query);
    return `http:${url}:${query}`;
  }
}
