import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { UiSettingsService } from './ui-settings.service';
import { CreateUiSettingsDto } from './dto/create-ui-settings.dto';
import { UpdateUiSettingsDto } from './dto/update-ui-settings.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../entities/user.entity';

@Controller('ui-settings')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class UiSettingsController {
  constructor(private readonly uiSettingsService: UiSettingsService) {}

  @Post()
  async create(@Body() createUiSettingsDto: CreateUiSettingsDto) {
    try {
      const settings = await this.uiSettingsService.create(createUiSettingsDto);
      return {
        success: true,
        data: settings,
        message: 'UI settings created successfully',
      };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to create UI settings',
        message: error.message,
      };
    }
  }

  @Get()
  async findAll() {
    try {
      const settings = await this.uiSettingsService.findAll();
      return {
        success: true,
        data: settings,
      };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to retrieve UI settings',
        message: error.message,
      };
    }
  }

  @Get('active')
  async findActive() {
    try {
      const settings = await this.uiSettingsService.findActive();
      return {
        success: true,
        data: settings,
      };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to retrieve active UI settings',
        message: error.message,
      };
    }
  }

  @Get('user/:userId')
  async findByUserId(@Param('userId') userId: string) {
    try {
      const settings = await this.uiSettingsService.findByUserId(userId);
      return {
        success: true,
        data: settings,
      };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to retrieve user UI settings',
        message: error.message,
      };
    }
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    try {
      const settings = await this.uiSettingsService.findOne(id);
      return {
        success: true,
        data: settings,
      };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to retrieve UI settings',
        message: error.message,
      };
    }
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() updateUiSettingsDto: UpdateUiSettingsDto) {
    try {
      const settings = await this.uiSettingsService.update(id, updateUiSettingsDto);
      return {
        success: true,
        data: settings,
        message: 'UI settings updated successfully',
      };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to update UI settings',
        message: error.message,
      };
    }
  }

  @Post('save')
  async saveSettings(@Body() createUiSettingsDto: CreateUiSettingsDto) {
    try {
      const settings = await this.uiSettingsService.saveSettings(createUiSettingsDto);
      return {
        success: true,
        data: settings,
        message: 'UI settings saved successfully',
      };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to save UI settings',
        message: error.message,
      };
    }
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    try {
      await this.uiSettingsService.remove(id);
      return {
        success: true,
        message: 'UI settings deleted successfully',
      };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to delete UI settings',
        message: error.message,
      };
    }
  }
}
