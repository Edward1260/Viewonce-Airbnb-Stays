import { NestFactory } from '@nestjs/core';
import { AppModuleNoDb } from './app.module.no-db';

async function bootstrap() {
  const app = await NestFactory.create(AppModuleNoDb);
  await app.listen(3001);
  console.log('🚀 No-DB server running on http://localhost:3001');
}
bootstrap();
