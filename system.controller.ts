import { Controller, Patch, Body, UseGuards } from '@nestjs/common';
import { SystemService } from './system.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@Controller('system')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SystemController {
  constructor(private readonly systemService: SystemService) {}

  @Patch('settings')
  @Roles('super_admin')
  async updateSettings(@Body() settings: { autoFix: boolean }) {
    if (settings.autoFix) {
      const results = await this.systemService.runAutoCorrection();
      return { 
        message: 'Database auto-optimization sequence completed', 
        details: results 
      };
    }
    return { message: 'System settings updated' };
  }
}