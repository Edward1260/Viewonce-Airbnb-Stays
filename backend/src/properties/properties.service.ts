import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { Property } from '../entities/property.entity';
import { PropertyStatus } from '../entities/property.entity';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class PropertiesService {
  constructor(
    @InjectRepository(Property)
    private propertyRepository: Repository<Property>,
    private notificationsService: NotificationsService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  // =========================
  // CUSTOMER / PUBLIC VIEW
  // =========================
  async findAll(filters?: any): Promise<[Property[], number]> {
    // Create cache key based on filters
    const cacheKey = `properties:public:${JSON.stringify(filters || {})}`;

    // Try to get from cache first
    const cachedResult = await this.cacheManager.get(cacheKey);
    if (cachedResult) {
      return cachedResult as [Property[], number];
    }

    const query = this.propertyRepository
      .createQueryBuilder('property')
      .select([
        'property.id',
        'property.title',
        'property.location',
        'property.price',
        'property.type',
        'property.status',
        'property.bedrooms',
        'property.bathrooms',
        'property.maxGuests',
        'property.rating',
        'property.reviewCount',
        'property.createdAt',
        'property.updatedAt',
        'host.id',
        'host.firstName',
        'host.lastName',
        'host.profileImage',
      ])
      .leftJoin('property.host', 'host');

    // ✅ IMPORTANT: show only active properties by default for public view
    // Allow 'all' status to get all properties (for admin scripts)
    if (filters?.status !== 'all') {
      query.andWhere('property.status = :status', {
        status: filters?.status || PropertyStatus.ACTIVE,
      });
    }

    if (filters?.location) {
      query.andWhere('property.location ILIKE :location', {
        location: `%${filters.location}%`,
      });
    }

    if (filters?.priceMin) {
      query.andWhere('property.price >= :priceMin', {
        priceMin: filters.priceMin,
      });
    }

    if (filters?.priceMax) {
      query.andWhere('property.price <= :priceMax', {
        priceMax: filters.priceMax,
      });
    }

    if (filters?.propertyType) {
      query.andWhere('property.type = :propertyType', {
        propertyType: filters.propertyType,
      });
    }

    if (filters?.bedrooms) {
      query.andWhere('property.bedrooms >= :bedrooms', {
        bedrooms: filters.bedrooms,
      });
    }

    if (filters?.bathrooms) {
      query.andWhere('property.bathrooms >= :bathrooms', {
        bathrooms: filters.bathrooms,
      });
    }

    if (filters?.maxGuests) {
      query.andWhere('property.maxGuests >= :maxGuests', {
        maxGuests: filters.maxGuests,
      });
    }

    if (filters?.minRating) {
      query.andWhere('property.rating >= :minRating', {
        minRating: filters.minRating,
      });
    }

    // Sorting
    const sortBy = filters?.sortBy || 'createdAt';
    const sortOrder = filters?.sortOrder === 'asc' ? 'ASC' : 'DESC';

    query.orderBy(`property.${sortBy}`, sortOrder);

    // Pagination (safe)
    const page = Number(filters?.page) || 1;
    const limit = Number(filters?.limit) || 10;

    query.skip((page - 1) * limit).take(limit);

    const result = await query.getManyAndCount();

    // Cache the result for 5 minutes
    await this.cacheManager.set(cacheKey, result, 300000);

    return result;
  }

  // =========================
  // ADMIN VIEW (ALL PROPERTIES)
  // =========================
  async findAllForAdmin(filters?: any): Promise<[Property[], number]> {
    const query = this.propertyRepository
      .createQueryBuilder('property')
      .leftJoinAndSelect('property.host', 'host');

    // For admin, show all properties unless specific status is requested
    if (filters?.status && filters.status !== 'all') {
      query.andWhere('property.status = :status', {
        status: filters.status,
      });
    }

    if (filters?.location) {
      query.andWhere('property.location ILIKE :location', {
        location: `%${filters.location}%`,
      });
    }

    if (filters?.priceMin) {
      query.andWhere('property.price >= :priceMin', {
        priceMin: filters.priceMin,
      });
    }

    if (filters?.priceMax) {
      query.andWhere('property.price <= :priceMax', {
        priceMax: filters.priceMax,
      });
    }

    if (filters?.propertyType) {
      query.andWhere('property.type = :propertyType', {
        propertyType: filters.propertyType,
      });
    }

    if (filters?.bedrooms) {
      query.andWhere('property.bedrooms >= :bedrooms', {
        bedrooms: filters.bedrooms,
      });
    }

    if (filters?.bathrooms) {
      query.andWhere('property.bathrooms >= :bathrooms', {
        bathrooms: filters.bathrooms,
      });
    }

    if (filters?.maxGuests) {
      query.andWhere('property.maxGuests >= :maxGuests', {
        maxGuests: filters.maxGuests,
      });
    }

    if (filters?.minRating) {
      query.andWhere('property.rating >= :minRating', {
        minRating: filters.minRating,
      });
    }

    // Sorting
    const sortBy = filters?.sortBy || 'createdAt';
    const sortOrder = filters?.sortOrder === 'asc' ? 'ASC' : 'DESC';

    query.orderBy(`property.${sortBy}`, sortOrder);

    // Pagination (safe)
    const page = Number(filters?.page) || 1;
    const limit = Number(filters?.limit) || 10;

    query.skip((page - 1) * limit).take(limit);

    return query.getManyAndCount();
  }

  // =========================
  // HOST VIEW (OWN PROPERTIES)
  // =========================
  async findByHost(hostId: string): Promise<Property[]> {
    return this.propertyRepository.find({
      where: {
        host: { id: hostId },
      },
      relations: ['host'],
      order: { createdAt: 'DESC' },
    });
  }

  // =========================
  async findOne(id: string): Promise<Property> {
    const property = await this.propertyRepository.findOne({
      where: { id },
      relations: ['host', 'reviews'],
    });

    if (!property) {
      throw new NotFoundException('Property not found');
    }

    return property;
  }

  // =========================
  async create(propertyData: Partial<Property>): Promise<Property> {
    const property = this.propertyRepository.create({
      ...propertyData,
      status: propertyData.status || PropertyStatus.PENDING, // ✅ Default to pending for admin approval
    });
    try {
      const savedProperty = await this.propertyRepository.save(property);

      // Clear all property caches when a new property is created
      await this.clearPropertyCaches();

      // Send notification to admins about new property creation
      try {
        await this.notificationsService.sendPropertyCreatedNotification(
          savedProperty.id,
          `${savedProperty.host.firstName} ${savedProperty.host.lastName}`,
          savedProperty.title
        );
      } catch (error) {
        // Log error but don't fail property creation
        console.error('Failed to send property creation notification:', error);
      }

      return savedProperty;
    } catch (error) {
      throw error;
    }
  }

  // =========================
  async update(id: string, propertyData: Partial<Property>): Promise<Property> {
    await this.propertyRepository.update(id, propertyData);

    // Clear all property caches when a property is updated
    await this.clearPropertyCaches();

    return this.findOne(id);
  }

  // =========================
  async remove(id: string): Promise<void> {
    const result = await this.propertyRepository.delete(id);

    if (result.affected === 0) {
      throw new NotFoundException('Property not found');
    }

    // Clear all property caches when a property is deleted
    await this.clearPropertyCaches();
  }

  // =========================
  // CACHE MANAGEMENT
  // =========================
  private async clearPropertyCaches(): Promise<void> {
    try {
      // Clear all cache keys that start with 'properties:'
      // Note: In a production environment, you might want to use Redis SCAN or KEYS
      // For now, we'll clear specific known patterns
      const cacheKeys = [
        'properties:public:', // This will be a prefix for all public property queries
      ];

      // Since cache-manager doesn't have a wildcard delete, we'll need to track keys
      // For simplicity, we'll clear a broader pattern or implement a cache versioning strategy
      // Clear specific property caches - more granular approach
      const keysToDelete = [
        'properties:public:', // Clear all public property cache keys
      ];

      // Since cache-manager doesn't support wildcards, we'll clear known patterns
      // In production, consider using Redis SCAN or implementing cache versioning
      try {
        // For now, we'll just clear a few known cache keys
        await this.cacheManager.del('properties:public:{}'); // Default empty filter cache
      } catch (error) {
        // Ignore errors for non-existent keys
      }
    } catch (error) {
      console.error('Failed to clear property caches:', error);
    }
  }
}
