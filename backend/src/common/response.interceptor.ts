import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable()
export class ResponseInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const url = request.url;

    return next.handle().pipe(
      map(data => {
        return {
          success: true,
          data: data || {},
          message: 'Request successful',
          path: url,
          timestamp: new Date().toISOString(),
        };
      }),
    );
  }
}
