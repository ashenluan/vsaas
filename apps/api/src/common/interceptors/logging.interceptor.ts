import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    const { method, url } = req;
    const userId = req.user?.sub || 'anonymous';
    const now = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const res = context.switchToHttp().getResponse();
          const duration = Date.now() - now;
          this.logger.log(
            `${method} ${url} ${res.statusCode} ${duration}ms [${userId}]`,
          );
        },
        error: (err) => {
          const duration = Date.now() - now;
          const status = err?.status || err?.getStatus?.() || 500;
          this.logger.warn(
            `${method} ${url} ${status} ${duration}ms [${userId}] ${err.message}`,
          );
        },
      }),
    );
  }
}
