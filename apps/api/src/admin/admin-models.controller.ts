import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { AdminService } from './admin.service';
import { UpdateModelConfigDto } from './dto/update-model-config.dto';

@Controller('admin/models')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'SUPER_ADMIN')
export class AdminModelsController {
  constructor(private readonly adminService: AdminService) {}

  @Get()
  listModels() {
    return this.adminService.listModelConfigs();
  }

  @Patch(':provider/:modelId')
  updateModel(
    @Param('provider') provider: string,
    @Param('modelId') modelId: string,
    @Body() data: UpdateModelConfigDto,
  ) {
    return this.adminService.updateModelConfig(provider, modelId, data);
  }
}
