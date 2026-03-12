import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AppConfigService {
  constructor(private configService: ConfigService) {}

  get port(): number {
    return parseInt(this.configService.get<string>('PORT', '3001'), 10);
  }

  get host(): string {
    return this.configService.get<string>('HOST', 'localhost');
  }

  get baseUrl(): string {
    return `http://${this.host}:${this.port}`;
  }

  get apiUrl(): string {
    return `${this.baseUrl}/api`;
  }

  get uploadsUrl(): string {
    return `${this.baseUrl}`;
  }
}
