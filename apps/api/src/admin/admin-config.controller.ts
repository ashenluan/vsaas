import { Controller, Get, Patch, Param, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { AdminService } from './admin.service';

@Controller('admin/config')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SUPER_ADMIN')
export class AdminConfigController {
  constructor(private readonly adminService: AdminService) {}

  @Get('providers')
  listProviders() {
    return this.adminService.listProviderConfigs();
  }

  @Patch('providers/:id')
  updateProvider(
    @Param('id') id: string,
    @Body() body: { isEnabled?: boolean; config?: any },
  ) {
    return this.adminService.updateProviderConfig(id, body);
  }
}
