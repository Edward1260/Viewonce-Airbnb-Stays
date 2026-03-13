import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { DataSource } from 'typeorm';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly dataSource: DataSource,
  ) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('health')
  async getHealth() {
    try {
      if (this.dataSource.isInitialized) {
        // Execute simple query to verify connection
        await this.dataSource.query('SELECT 1');
        return { status: 'ok', timestamp: new Date().toISOString(), database: 'connected' };
      }
      return { status: 'error', timestamp: new Date().toISOString(), database: 'disconnected' };
    } catch (error) {
      return { status: 'error', timestamp: new Date().toISOString(), error: error.message };
    }
  }
}
