import {
  Controller,
  Get,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { AdminService } from './admin.service';

@Controller('admin/analytics')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'SUPER_ADMIN')
export class AdminAnalyticsController {
  constructor(private readonly adminService: AdminService) {}

  @Get('daily')
  getDailyStats(@Query('days') days?: string) {
    const d = days ? Math.min(Math.max(parseInt(days, 10) || 30, 1), 365) : 30;
    return this.adminService.getDailyStats(d);
  }

  @Get('providers')
  getProviderStats() {
    return this.adminService.getProviderUsageStats();
  }

  @Get('credits')
  getCreditStats(@Query('days') days?: string) {
    const d = days ? Math.min(Math.max(parseInt(days, 10) || 30, 1), 365) : 30;
    return this.adminService.getCreditConsumptionStats(d);
  }
}
