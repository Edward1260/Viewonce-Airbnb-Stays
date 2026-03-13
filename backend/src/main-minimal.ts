import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModuleNoDb } from './app.module.no-db';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModuleNoDb);
  await app.listen(3001);
  console.log('🚀 Minimal server running on http://localhost:3001');
}
bootstrap();
