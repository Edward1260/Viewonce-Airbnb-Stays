import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Property } from '../entities/property.entity';

@Injectable()
export class PropertiesService {
  constructor(
    @InjectRepository(Property)
    private readonly propertiesRepository: Repository<Property>,
  ) {}

  async findByHost(hostId: string): Promise<Property[]> {
    return this.propertiesRepository.find({
      where: { hostId },
      order: { createdAt: 'DESC' },
    });
  }
}