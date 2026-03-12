import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LiveTour } from '../entities/live-tour.entity';
import { CreateLiveTourDto } from './dto/create-live-tour.dto';
import { UpdateLiveTourDto } from './dto/update-live-tour.dto';

@Injectable()
export class LiveToursService {
  constructor(
    @InjectRepository(LiveTour)
    private liveTourRepository: Repository<LiveTour>,
  ) {}

  async create(createLiveTourDto: CreateLiveTourDto, adminId?: string): Promise<LiveTour> {
    const liveTour = this.liveTourRepository.create({
      ...createLiveTourDto,
      adminId,
    });
    return this.liveTourRepository.save(liveTour);
  }

  async findAll(): Promise<LiveTour[]> {
    return this.liveTourRepository.find({
      where: { status: 'active' },
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<LiveTour> {
    const liveTour = await this.liveTourRepository.findOne({
      where: { id },
    });
    if (!liveTour) {
      throw new NotFoundException(`Live tour with ID ${id} not found`);
    }
    return liveTour;
  }

  async update(id: string, updateLiveTourDto: UpdateLiveTourDto): Promise<LiveTour> {
    const liveTour = await this.findOne(id);
    Object.assign(liveTour, updateLiveTourDto);
    return this.liveTourRepository.save(liveTour);
  }

  async remove(id: string): Promise<void> {
    const liveTour = await this.findOne(id);
    await this.liveTourRepository.remove(liveTour);
  }

  async findActive(): Promise<LiveTour[]> {
    return this.liveTourRepository.find({
      where: { status: 'active' },
      order: { createdAt: 'DESC' },
    });
  }
}
