import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { AdminService } from './admin.service';

@Controller('admin/pricing')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'SUPER_ADMIN')
export class AdminPricingController {
  constructor(private readonly adminService: AdminService) {}

  @Get('packages')
  listPackages() {
    return this.adminService.listCreditPackages();
  }
}
