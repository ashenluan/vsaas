import { Controller, Get, Patch, Param, Query, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { AdminService } from './admin.service';

@Controller('admin/users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'SUPER_ADMIN')
export class AdminUsersController {
  constructor(private readonly adminService: AdminService) {}

  @Get()
  list(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('search') search?: string,
    @Query('role') role?: string,
    @Query('status') status?: string,
  ) {
    return this.adminService.listUsers({
      page: page ? parseInt(page, 10) : undefined,
      pageSize: pageSize ? parseInt(pageSize, 10) : undefined,
      search,
      role,
      status,
    });
  }

  @Get(':id')
  detail(@Param('id') id: string) {
    return this.adminService.getUserDetail(id);
  }

  @Patch(':id/status')
  updateStatus(@Param('id') id: string, @Body() body: { status: 'ACTIVE' | 'SUSPENDED' }) {
    return this.adminService.updateUserStatus(id, body.status);
  }

  @Patch(':id/role')
  @Roles('SUPER_ADMIN')
  updateRole(@Param('id') id: string, @Body() body: { role: 'USER' | 'ADMIN' | 'SUPER_ADMIN' }) {
    return this.adminService.updateUserRole(id, body.role);
  }
}
