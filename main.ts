import { NestFactory, Reflector } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';
import { HttpCacheInterceptor } from './common/interceptors/cache.interceptor';
import { ResponseInterceptor } from './backend/src/common/response.interceptor';
import { ThrottlerGuard } from '@nestjs/throttler';
import { WsAdapter } from '@nestjs/platform-ws';
import { ConfigService } from '@nestjs/config';
import { JwtAuthGuard } from './backend/src/auth/jwt-auth.guard';
import { RolesGuard } from './backend/src/auth/roles.guard';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    rawBody: true,
  });
  const configService = app.get(ConfigService);

  // Enable CORS
  app.enableCors({
    origin: configService.get<string>('CORS_ORIGIN', 'http://localhost:3000'),
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  // Set global prefix for API versioning
  app.setGlobalPrefix('api/v1');

  // Apply global validation pipe
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }));

  // Apply global exception filter
  app.useGlobalFilters(new AllExceptionsFilter());

  // Apply global HTTP cache interceptor
  // The HttpCacheInterceptor should be provided in CustomCacheModule and injected here
  app.useGlobalInterceptors(app.get(HttpCacheInterceptor));

  // Apply global response standardization
  app.useGlobalInterceptors(new ResponseInterceptor());

  // Apply global guards in order: Throttling -> Authentication -> Authorization
  const reflector = app.get(Reflector);
  app.useGlobalGuards(
    new ThrottlerGuard(),
    new JwtAuthGuard(reflector),
    new RolesGuard(reflector),
  );

  // Configure WebSocket adapter
  app.useWebSocketAdapter(new WsAdapter(app));

  const port = configService.get<number>('PORT', 3001);
  await app.listen(port);
  console.log(`Application is running on: ${await app.getUrl()}`);
}
bootstrap();