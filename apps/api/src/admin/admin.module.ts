import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { AdminUsersController } from './admin-users.controller';
import { AdminJobsController } from './admin-jobs.controller';
import { AdminCreditsController } from './admin-credits.controller';
import { AdminConfigController } from './admin-config.controller';
import { AdminOrdersController } from './admin-orders.controller';
import { AdminAnalyticsController } from './admin-analytics.controller';
import { AdminPricingController } from './admin-pricing.controller';
import { AdminModelsController } from './admin-models.controller';
import { AdminService } from './admin.service';
import { UserModule } from '../user/user.module';
import { AdminAuditInterceptor } from '../common/interceptors/admin-audit.interceptor';
import { ProviderModule } from '../provider/provider.module';
import { PricingModule } from '../pricing/pricing.module';

@Module({
  imports: [UserModule, ProviderModule, PricingModule],
  controllers: [
    AdminUsersController,
    AdminJobsController,
    AdminCreditsController,
    AdminConfigController,
    AdminOrdersController,
    AdminAnalyticsController,
    AdminPricingController,
    AdminModelsController,
  ],
  providers: [
    AdminService,
    AdminAuditInterceptor,
  ],
})
export class AdminModule {}
