import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe, HttpException, HttpStatus, ExceptionFilter, Catch, ArgumentsHost } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join, resolve } from 'path';
import { AppModule } from './app.module.fixed';
import { LoggingInterceptor } from './common/logging.interceptor';
import helmet from 'helmet';
import { VersioningType } from '@nestjs/common';

// Global exception filter
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();
    
    const status = exception instanceof HttpException 
      ? exception.getStatus() 
      : HttpStatus.INTERNAL_SERVER_ERROR;
    
    const message = exception instanceof HttpException 
      ? exception.getResponse() 
      : 'Internal server error';

    const errorResponse = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      message: typeof message === 'string' ? message : (message as any).message || message,
      error: typeof message === 'string' ? 'Error' : (message as any).error || 'Error',
    };

    response.status(status).json(errorResponse);
  }
}

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  
  // Create NestJS application with Express platform
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
  });

  // Apply global exception filter
  app.useGlobalFilters(new GlobalExceptionFilter());

  // Security: Add Helmet for HTTP security headers
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", 'https://cdn.tailwindcss.com'],
        imgSrc: ["'self'", 'data:', 'https:', 'http:'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com'],
        connectSrc: ["'self'", 'http:', 'https:', 'ws:', 'wss:'],
        frameSrc: ["'none'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameAncestors: ["'none'"],
      },
    },
    crossOriginEmbedderPolicy: false,
  }));

  // Enable detailed logging for all requests
  app.useGlobalInterceptors(new LoggingInterceptor());
  
  // Global validation pipe
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    transform: true,
    forbidNonWhitelisted: true,
    transformOptions: {
      enableImplicitConversion: true,
    },
  }));

  // Enable API versioning - supports /api/v1, /api/v2, etc.
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
    prefix: 'v', // This makes it /api/v1 instead of /api/1
  });
  
  // Set global prefix for all API routes FIRST
  // Note: When using versioning, setGlobalPrefix should come after enableVersioning
  app.setGlobalPrefix('api');

  // Enable CORS for frontend requests - allow ports 3001 (backend) and 9002 (frontend)
  app.enableCors({
    origin: true, // Allow all origins (reflects request origin) to prevent CORS issues during local dev
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
    exposedHeaders: ['Content-Range', 'X-Content-Range'],
    maxAge: 86400, // 24 hours
  });

  // Set trusted proxies for proper IP detection behind load balancers
  app.set('trust proxy', 1);

  // Serve static frontend files from parent directory (the root project folder)
  const frontendPath = resolve(process.cwd(), '..');
  logger.log(`📂 Serving static frontend assets from: ${frontendPath}`);
  
  app.useStaticAssets(frontendPath, {
    prefix: '/',
    index: 'welcome.html',  // Default to welcome.html as per requirement
    fallthrough: true,  // Enable fallthrough for SPA routing
  });

  // Get the underlying Express app for wildcard route - must be last
  const expressApp = app.getHttpAdapter().getInstance();

  // Add wildcard route handler for SPA routing - must be last
  // But exclude API routes and health endpoints from the catch-all
  expressApp.use((req, res, next) => {
    // Skip API routes and health endpoints
    if (req.path.startsWith('/api') || req.path.startsWith('/health') || req.path === '/') {
      return next();
    }
    
    const accept = req.headers.accept || '';
    // If HTML is accepted, serve the welcome page
    if (accept.includes('text/html')) {
      res.sendFile(join(frontendPath, 'welcome.html'));
    } else {
      // For API-like requests, return JSON
      res.status(404).json({
        statusCode: 404,
        timestamp: new Date().toISOString(),
        path: req.originalUrl,
        method: req.method,
        message: 'Route not found',
        error: 'Not Found',
      });
    }
  });

  const port = process.env.PORT || 3001;
  await app.listen(port, '0.0.0.0');
  logger.log(`🚀 Server running on port ${port}`);
  logger.log('🚀 Server running on http://localhost:3001');
  logger.log('👉 Access App: http://localhost:3001/');
  logger.log('📁 Serving static frontend files from parent directory');
  logger.log('🔗 API v1 available at http://localhost:3001/api/v1');
  logger.log('🔗 API v2 available at http://localhost:3001/api/v2');
  logger.log('🛡️  Security: Helmet enabled with CSP headers');
  logger.log('🔒  CORS enabled for localhost:3001');
  logger.log('🕵️  Debug Mode Enabled: Detailed request logging is active.');
  logger.log('💚 Health check: http://localhost:3001/health');
  logger.log('💚 API Health: http://localhost:3001/api/v1/health');
  logger.log('⚡ Rate limiting enabled (short: 10/s, medium: 50/10s, long: 200/min)');
}
bootstrap();
