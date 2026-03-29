import { Controller, Post, Body, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { AdminService } from './admin.service';

@Controller('admin/credits')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'SUPER_ADMIN')
export class AdminCreditsController {
  constructor(private readonly adminService: AdminService) {}

  @Post('adjust')
  adjustCredits(
    @Req() req: any,
    @Body() body: { userId: string; amount: number; description: string },
  ) {
    return this.adminService.adjustCredits(
      body.userId,
      body.amount,
      body.description,
      req.user.sub,
    );
  }
}
