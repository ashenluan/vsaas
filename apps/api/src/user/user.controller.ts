import {
  Controller,
  Get,
  Patch,
  Post,
  Body,
  UseGuards,
  Req,
  Query,
} from '@nestjs/common';
import { UserService } from './user.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('user')
@UseGuards(JwtAuthGuard)
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('profile')
  getProfile(@Req() req: any) {
    return this.userService.getProfile(req.user.sub);
  }

  @Patch('profile')
  updateProfile(
    @Req() req: any,
    @Body() body: { displayName?: string; avatar?: string },
  ) {
    return this.userService.updateProfile(req.user.sub, body);
  }

  @Post('change-password')
  changePassword(
    @Req() req: any,
    @Body() body: { currentPassword: string; newPassword: string },
  ) {
    return this.userService.changePassword(req.user.sub, body.currentPassword, body.newPassword);
  }

  @Get('credits')
  getCreditBalance(@Req() req: any) {
    return this.userService.getCreditBalance(req.user.sub);
  }

  @Get('credits/history')
  getCreditHistory(
    @Req() req: any,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.userService.getCreditHistory(
      req.user.sub,
      page ? parseInt(page, 10) : 1,
      pageSize ? parseInt(pageSize, 10) : 20,
    );
  }

  @Get('billing/packages')
  getCreditPackages() {
    return this.userService.listCreditPackages();
  }

  @Get('orders')
  getOrders(
    @Req() req: any,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.userService.getOrders(
      req.user.sub,
      page ? parseInt(page, 10) : 1,
      pageSize ? parseInt(pageSize, 10) : 20,
    );
  }

  @Post('orders')
  createOrder(
    @Req() req: any,
    @Body() body: { packageId?: string },
  ) {
    return this.userService.createManualTopUpOrder(req.user.sub, body.packageId ?? '');
  }
}
