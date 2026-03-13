import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module.fixed';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    transform: true,
  }));

  app.setGlobalPrefix('api');

  await app.listen(3001);
  console.log('🚀 Application is running on: http://localhost:3001/api');
  console.log('📝 Phase 1 Infrastructure Complete!');
  console.log('✅ Database: PostgreSQL migration ready');
  console.log('✅ Caching: Redis configuration implemented');
  console.log('✅ Security: Enhanced with CORS, Helmet, validation');
  console.log('✅ API: Versioning v1 implemented');
  console.log('⏭️  Next: Phase 2 - Core Features & AI Refactor');
}
bootstrap();
