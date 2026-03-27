import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Building } from '../entities/building.entity';
import { Unit } from '../entities/unit.entity';
import { CreateBuildingDto } from './dto/create-building.dto';
import { UpdateBuildingDto } from './dto/update-building.dto';
import { CreateUnitDto } from './dto/create-unit.dto';

@Injectable()
export class BuildingsService {
  constructor(
    @InjectRepository(Building)
    private buildingsRepository: Repository<Building>,
    @InjectRepository(Unit)
    private unitsRepository: Repository<Unit>,
  ) {}

  async create(createBuildingDto: CreateBuildingDto): Promise<Building> {
    const building = this.buildingsRepository.create(createBuildingDto);
    return await this.buildingsRepository.save(building);
  }

  async findAll(): Promise<Building[]> {
    return await this.buildingsRepository.find({ relations: ['host', 'units'] });
  }

  async findOne(id: string): Promise<Building> {
    const building = await this.buildingsRepository.findOne({
      where: { id },
      relations: ['host', 'units'],
    });
    if (!building) {
      throw new NotFoundException(`Building with ID ${id} not found`);
    }
    return building;
  }

  async update(id: string, updateBuildingDto: UpdateBuildingDto): Promise<Building> {
    await this.findOne(id); // Validate exists
    await this.buildingsRepository.update(id, updateBuildingDto);
    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    const building = await this.findOne(id);
    await this.buildingsRepository.remove(building);
  }

  // Additional methods per TODO.md
  async getHostBuildings(hostId: string): Promise<Building[]> {
    return await this.buildingsRepository.find({
      where: { hostId },
      relations: ['units'],
    });
  }

  async createUnits(buildingId: string, createUnitDtos: CreateUnitDto[]): Promise<Unit[]> {
    // Verify building exists
    await this.findOne(buildingId);
    
    const units = createUnitDtos.map(dto => this.unitsRepository.create({ ...dto, buildingId }));
    return await this.unitsRepository.save(units, { reload: true });
  }
}
