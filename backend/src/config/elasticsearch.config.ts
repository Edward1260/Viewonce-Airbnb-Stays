import { ConfigService } from '@nestjs/config';

export const elasticsearchConfig = (configService: ConfigService) => {
  const isProduction = configService.get<string>('NODE_ENV') === 'production';

  return {
    node: configService.get<string>('ELASTICSEARCH_NODE', 'http://localhost:9200'),
    auth: {
      username: configService.get<string>('ELASTICSEARCH_USERNAME', 'elastic'),
      password: configService.get<string>('ELASTICSEARCH_PASSWORD', ''),
    },
    maxRetries: 5,
    requestTimeout: 60000,
    pingTimeout: 3000,
    sniffOnStart: true,
    sniffOnConnectionFault: true,
    sniffInterval: 30000,
    compression: true, // Use boolean 'true' for gzip compression
    tls: {
      rejectUnauthorized: isProduction,
    },
  };
};
