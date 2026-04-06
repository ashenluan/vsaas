import { Controller, Get, Patch, Param, Body, UseGuards, UseInterceptors } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { AdminService } from './admin.service';
import { UpdateProviderConfigDto } from './dto/update-provider-config.dto';
import { UpdateSystemCapabilitiesDto } from './dto/update-system-capabilities.dto';
import { AdminAuditInterceptor } from '../common/interceptors/admin-audit.interceptor';

@Controller('admin/config')
@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(AdminAuditInterceptor)
@Roles('SUPER_ADMIN')
export class AdminConfigController {
  constructor(private readonly adminService: AdminService) {}

  @Get('providers')
  async listProviders() {
    return this.adminService.listProviderConfigs();
  }

  @Get('system')
  async getSystemCapabilities() {
    return this.adminService.getSystemCapabilities();
  }

  @Patch('providers/:id')
  async updateProvider(
    @Param('id') id: string,
    @Body() body: UpdateProviderConfigDto,
  ) {
    return this.adminService.updateProviderConfig(id, body);
  }

  @Patch('system')
  async updateSystemCapabilities(@Body() body: UpdateSystemCapabilitiesDto) {
    return this.adminService.updateSystemCapabilities(body);
  }
}
