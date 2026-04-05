import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Interceptor that logs admin mutations to the audit_logs table.
 * Apply to admin controllers that modify data.
 */
@Injectable()
export class AdminAuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger('AdminAudit');

  constructor(private readonly prisma: PrismaService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    const { method, url, body } = req;
    const performerId = req.user?.sub;

    // Only audit mutations
    if (['GET', 'HEAD', 'OPTIONS'].includes(method)) {
      return next.handle();
    }

    const action = `${method} ${url}`;

    return next.handle().pipe(
      tap({
        next: (result) => {
          if (performerId) {
            this.prisma.auditLog.create({
              data: {
                performerId,
                action,
                details: {
                  body: this.sanitizeBody(body),
                  resultId: result?.id,
                },
              },
            }).catch((err) => {
              this.logger.warn(`Failed to write audit log: ${err.message}`);
            });
          }
        },
        error: (err) => {
          if (performerId) {
            this.prisma.auditLog.create({
              data: {
                performerId,
                action,
                details: {
                  body: this.sanitizeBody(body),
                  error: err.message,
                },
              },
            }).catch(() => {});
          }
        },
      }),
    );
  }

  private sanitizeBody(body: any): any {
    if (!body) return {};
    const sanitized = { ...body };
    // Strip sensitive fields
    delete sanitized.password;
    delete sanitized.apiKey;
    delete sanitized.secret;
    return sanitized;
  }
}
