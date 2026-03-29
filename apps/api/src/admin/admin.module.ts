import { Module } from '@nestjs/common';
import { AdminUsersController } from './admin-users.controller';
import { AdminJobsController } from './admin-jobs.controller';
import { AdminCreditsController } from './admin-credits.controller';
import { AdminConfigController } from './admin-config.controller';
import { AdminOrdersController } from './admin-orders.controller';
import { AdminAnalyticsController } from './admin-analytics.controller';
import { AdminService } from './admin.service';
import { UserModule } from '../user/user.module';

@Module({
  imports: [UserModule],
  controllers: [
    AdminUsersController,
    AdminJobsController,
    AdminCreditsController,
    AdminConfigController,
    AdminOrdersController,
    AdminAnalyticsController,
  ],
  providers: [AdminService],
})
export class AdminModule {}
