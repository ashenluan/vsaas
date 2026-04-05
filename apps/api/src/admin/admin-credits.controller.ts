import { Controller, Post, Body, UseGuards, UseInterceptors, Req } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { AdminService } from './admin.service';
import { AdjustCreditsDto } from './dto/adjust-credits.dto';
import { AdminAuditInterceptor } from '../common/interceptors/admin-audit.interceptor';

@Controller('admin/credits')
@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(AdminAuditInterceptor)
@Roles('ADMIN', 'SUPER_ADMIN')
export class AdminCreditsController {
  constructor(private readonly adminService: AdminService) {}

  @Post('adjust')
  adjustCredits(
    @Req() req: any,
    @Body() body: AdjustCreditsDto,
  ) {
    return this.adminService.adjustCredits(
      body.userId,
      body.amount,
      body.description,
      req.user.sub,
    );
  }
}
