import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import { join } from 'path';
import { AppModule } from './app.module.fixed';
import { ResponseInterceptor } from './common/response.interceptor';
import { LoggingInterceptor } from './common/logging.interceptor';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const configService = app.get(ConfigService);

  // Security headers with Helmet
  app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        imgSrc: ["'self'", "data:", "https:", "http:"],
        scriptSrc: ["'self'"],
        connectSrc: ["'self'", "https:", "http:"],
      },
    },
  }));

  // Enable CORS with environment-based configuration
  const corsOrigins = configService.get<string>('CORS_ORIGINS', 'http://localhost:3000,http://localhost:3001,http://localhost:9002');
  const allowedOrigins = corsOrigins.split(',').map(origin => origin.trim());

  app.enableCors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, curl, etc.)
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error('Not allowed by CORS'), false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  });

  // Global validation pipe with enhanced security
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    transform: true,
    forbidNonWhitelisted: true, // Reject unknown properties
    transformOptions: {
      enableImplicitConversion: true,
    },
  }));

  // Global interceptors
  app.useGlobalInterceptors(new ResponseInterceptor(), new LoggingInterceptor());

  // API Versioning
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });

  // Set global prefix for all routes
  app.setGlobalPrefix('api');

  // Swagger/OpenAPI Documentation - Temporarily disabled due to version conflicts
  // TODO: Re-enable Swagger once package versions are aligned
  console.log('📝 API Documentation: Temporarily disabled due to version conflicts');
  console.log('🔧 To enable: Resolve @nestjs/common and @nestjs/swagger version compatibility');

  const port = configService.get<number>('PORT', 3001);
  await app.listen(port);

  console.log(`🚀 Application is running on: http://localhost:${port}/api/v1`);
  console.log(`📚 API Documentation available at: http://localhost:${port}/api/docs`);
}
bootstrap();
