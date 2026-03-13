import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UiSettings } from '../entities/ui-settings.entity';
import { CreateUiSettingsDto } from './dto/create-ui-settings.dto';
import { UpdateUiSettingsDto } from './dto/update-ui-settings.dto';

@Injectable()
export class UiSettingsService {
  constructor(
    @InjectRepository(UiSettings)
    private readonly uiSettingsRepository: Repository<UiSettings>,
  ) {}

  async create(createUiSettingsDto: CreateUiSettingsDto): Promise<UiSettings> {
    const uiSettings = this.uiSettingsRepository.create(createUiSettingsDto);
    return await this.uiSettingsRepository.save(uiSettings);
  }

  async findAll(): Promise<UiSettings[]> {
    return await this.uiSettingsRepository.find({
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<UiSettings> {
    const uiSettings = await this.uiSettingsRepository.findOne({ where: { id } });
    if (!uiSettings) {
      throw new NotFoundException(`UI Settings with ID ${id} not found`);
    }
    return uiSettings;
  }

  async findActive(): Promise<UiSettings | null> {
    return await this.uiSettingsRepository.findOne({
      where: { isActive: true },
      order: { updatedAt: 'DESC' },
    });
  }

  async findByUserId(userId: string): Promise<UiSettings | null> {
    return await this.uiSettingsRepository.findOne({
      where: { userId, isActive: true },
      order: { updatedAt: 'DESC' },
    });
  }

  async update(id: string, updateUiSettingsDto: UpdateUiSettingsDto): Promise<UiSettings> {
    const uiSettings = await this.findOne(id);
    Object.assign(uiSettings, updateUiSettingsDto);
    return await this.uiSettingsRepository.save(uiSettings);
  }

  async remove(id: string): Promise<void> {
    const uiSettings = await this.findOne(id);
    await this.uiSettingsRepository.remove(uiSettings);
  }

  async saveSettings(settings: CreateUiSettingsDto): Promise<UiSettings> {
    // Deactivate all existing settings for this user
    if (settings.userId) {
      await this.uiSettingsRepository.update(
        { userId: settings.userId },
        { isActive: false }
      );
    } else {
      // For global settings
      await this.uiSettingsRepository.update(
        { userId: null },
        { isActive: false }
      );
    }

    // Create new active settings
    const newSettings = this.uiSettingsRepository.create({
      ...settings,
      isActive: true,
    });

    return await this.uiSettingsRepository.save(newSettings);
  }
}
