import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { AppModule } from './app.module';
import helmet from 'helmet';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const logger = new Logger('Bootstrap');

  // Global pipes & middleware
  app.use(helmet());
  app.setGlobalPrefix('api/v1');
  app.enableCors({
    origin: true, // Reflects the request origin (fixes '*' + credentials issue)
    credentials: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
  });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  // Swagger if needed
  // setupSwagger(app);

  const port = process.env.PORT || 3001;
  await app.listen(port);

  logger.log(`🚀 Application is running on: http://localhost:${port}`);
  logger.log(`📚 AppModule loaded successfully`);

  // Graceful shutdown
  process.on('SIGTERM', async () => {
    logger.warn('SIGTERM received, shutting down gracefully');
    await app.close();
    process.exit(0);
  });

  process.on('SIGINT', async () => {
    logger.warn('SIGINT received, shutting down gracefully');
    await app.close();
    process.exit(0);
  });
}

bootstrap().catch((err) => {
  new Logger('Bootstrap').error(`❌ Application failed to start: ${err.message}`);
  process.exit(1);
});
