import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UiSettingsController } from './ui-settings.controller';
import { UiSettingsService } from './ui-settings.service';
import { UiSettings } from '../entities/ui-settings.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([UiSettings]),
  ],
  controllers: [UiSettingsController],
  providers: [UiSettingsService],
  exports: [UiSettingsService],
})
export class UiSettingsModule {}
