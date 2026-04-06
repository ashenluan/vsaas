import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ProviderConfigService } from '../provider/provider-config.service';
import { ProviderRegistry } from '../provider/provider.registry';
import { PricingService } from '../pricing/pricing.service';
import {
  DEFAULT_SYSTEM_CAPABILITIES,
  MIXCUT_GLOBAL_SPEECH_ENABLED_KEY,
  readBooleanSystemConfigValue,
  type SystemCapabilities,
} from '../common/system-config';

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);
  constructor(
    private readonly prisma: PrismaService,
    private readonly providerConfigs: ProviderConfigService,
    private readonly providers: ProviderRegistry,
    private readonly pricing: PricingService,
  ) {}

  private normalizeAmount(amount: unknown): number {
    if (typeof amount === 'number') return amount;
    if (typeof amount === 'string') return Number(amount);
    if (amount && typeof amount === 'object' && 'toString' in amount) {
      return Number(amount.toString());
    }
    return Number.NaN;
  }

  private async getBooleanSystemConfig(
    key: string,
    fallback = false,
  ): Promise<boolean> {
    const config = await this.prisma.systemConfig.findUnique({
      where: { key },
    });

    return readBooleanSystemConfigValue(config?.value, fallback);
  }

  private serializeOrder<T extends { amount: unknown }>(order: T): T & { amount: number } {
    return {
      ...order,
      amount: this.normalizeAmount(order.amount),
    };
  }

  async listUsers(query: { page?: number; pageSize?: number; search?: string; role?: string; status?: string }) {
    const { page = 1, pageSize = 20, search, role, status } = query;
    const where: any = {};
    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { displayName: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (role) where.role = role;
    if (status) where.status = status;

    const [items, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          displayName: true,
          role: true,
          status: true,
          creditBalance: true,
          createdAt: true,
          lastLoginAt: true,
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.user.count({ where }),
    ]);
    return { items, total, page, pageSize };
  }

  async getUserDetail(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        displayName: true,
        role: true,
        status: true,
        creditBalance: true,
        createdAt: true,
        lastLoginAt: true,
        _count: {
          select: { generations: true, orders: true },
        },
      },
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async updateUserStatus(userId: string, status: 'ACTIVE' | 'SUSPENDED') {
    return this.prisma.user.update({
      where: { id: userId },
      data: { status },
      select: { id: true, email: true, status: true },
    });
  }

  async updateUserRole(userId: string, role: 'USER' | 'ADMIN' | 'SUPER_ADMIN') {
    return this.prisma.user.update({
      where: { id: userId },
      data: { role },
      select: { id: true, email: true, role: true },
    });
  }

  async adjustCredits(userId: string, amount: number, description: string, performerId: string) {
    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({ where: { id: userId } });
      if (!user) throw new NotFoundException('User not found');

      // 防止负数调整导致余额为负
      if (amount < 0 && user.creditBalance + amount < 0) {
        throw new BadRequestException(
          `积分不足: 当前余额 ${user.creditBalance}，无法扣除 ${Math.abs(amount)}`,
        );
      }

      const updated = await tx.user.update({
        where: { id: userId },
        data: { creditBalance: { increment: amount } },
        select: { id: true, creditBalance: true },
      });

      await tx.creditTransaction.create({
        data: {
          userId,
          amount,
          type: 'ADMIN_ADJUSTMENT',
          description,
          balanceAfter: updated.creditBalance,
        },
      });

      await tx.auditLog.create({
        data: {
          performerId,
          targetId: userId,
          action: 'ADJUST_CREDITS',
          details: { amount, description, balanceAfter: updated.creditBalance },
        },
      });

      return updated;
    });
  }

  async listAllJobs(query: { page?: number; pageSize?: number; type?: string; status?: string; provider?: string }) {
    const { page = 1, pageSize = 20, type, status, provider } = query;
    const where: any = {};
    if (type) where.type = type;
    if (status) where.status = status;
    if (provider) where.provider = provider;

    const [items, total] = await Promise.all([
      this.prisma.generation.findMany({
        where,
        include: {
          user: { select: { id: true, email: true, displayName: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.generation.count({ where }),
    ]);
    return { items, total, page, pageSize };
  }

  async getStats() {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const [
      totalUsers,
      totalJobs,
      activeJobs,
      todayJobs,
      totalCreditsSpent,
      totalCreditsAdded,
      totalCreditsBalance,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.generation.count(),
      this.prisma.generation.count({ where: { status: { in: ['PENDING', 'PROCESSING'] } } }),
      this.prisma.generation.count({
        where: { createdAt: { gte: startOfToday } },
      }),
      this.prisma.creditTransaction.aggregate({
        where: { type: 'USAGE' },
        _sum: { amount: true },
      }),
      this.prisma.creditTransaction.aggregate({
        where: { amount: { gt: 0 } },
        _sum: { amount: true },
      }),
      this.prisma.user.aggregate({
        _sum: { creditBalance: true },
      }),
    ]);
    return {
      totalUsers,
      totalJobs,
      activeJobs,
      todayJobs,
      totalCreditsSpent: Math.abs(totalCreditsSpent._sum.amount ?? 0),
      totalCreditsAdded: totalCreditsAdded._sum.amount ?? 0,
      totalCreditsBalance: totalCreditsBalance._sum.creditBalance ?? 0,
    };
  }

  async listOrders(query: { page?: number; pageSize?: number; status?: string; userId?: string }) {
    const { page = 1, pageSize = 20, status, userId } = query;
    const where: any = {};
    if (status) where.status = status;
    if (userId) where.userId = userId;

    const [items, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        include: {
          user: { select: { id: true, email: true, displayName: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.order.count({ where }),
    ]);
    return { items: items.map((order) => this.serializeOrder(order)), total, page, pageSize };
  }

  async updateOrderStatus(id: string, status: string) {
    const validStatuses = ['PENDING', 'PAID', 'FAILED', 'REFUNDED'];
    if (!validStatuses.includes(status)) {
      throw new BadRequestException(`无效的订单状态，可选值: ${validStatuses.join(', ')}`);
    }

    return this.prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id },
      });

      if (!order) {
        throw new NotFoundException('Order not found');
      }

      if (order.status === status) {
        return this.serializeOrder(order);
      }

      if (order.status === 'PAID' && status !== 'PAID') {
        throw new BadRequestException('已入账订单暂不支持改为其他状态，请通过人工退款/积分调整处理');
      }

      if (status === 'PAID') {
        const updatedUser = await tx.user.update({
          where: { id: order.userId },
          data: { creditBalance: { increment: order.credits } },
          select: { creditBalance: true },
        });

        await tx.creditTransaction.create({
          data: {
            userId: order.userId,
            amount: order.credits,
            type: 'PURCHASE',
            description: `人工充值订单入账: ${order.id}`,
            referenceId: order.id,
            balanceAfter: updatedUser.creditBalance,
          },
        });
      }

      const updatedOrder = await tx.order.update({
        where: { id },
        data: {
          status: status as any,
          paidAt: status === 'PAID' ? new Date() : null,
        },
      });

      return this.serializeOrder(updatedOrder);
    });
  }

  async listCreditPackages() {
    const packages = await this.prisma.creditPackage.findMany({
      orderBy: [{ sortOrder: 'asc' }, { credits: 'asc' }],
    });

    return packages.map((pkg) => ({
      ...pkg,
      price: this.normalizeAmount(pkg.price),
    }));
  }

  async listModelConfigs() {
    const [models, diagnostics] = await Promise.all([
      this.pricing.listEditableModelCatalog(),
      this.providers.listAdminProviderDiagnostics(),
    ]);
    const diagnosticsByProvider = new Map(diagnostics.map((diagnostic) => [diagnostic.provider, diagnostic]));

    return models.map((model) => ({
      ...model,
      providerName: diagnosticsByProvider.get(model.provider)?.name ?? model.provider,
      available: diagnosticsByProvider.get(model.provider)?.available ?? false,
      reason: diagnosticsByProvider.get(model.provider)?.reason,
    }));
  }

  async updateModelConfig(
    provider: string,
    modelId: string,
    data: {
      displayName?: string;
      creditCost?: number;
      costUnit?: 'per_image' | 'per_second' | 'per_job';
      isActive?: boolean;
      capabilities?: Record<string, unknown>;
      maxDuration?: number;
      sortOrder?: number;
    },
  ) {
    return this.pricing.updateModelCatalogEntry(provider, modelId, data);
  }

  async getDailyStats(days: number = 30) {
    const since = new Date();
    since.setDate(since.getDate() - days);

    // 使用 SQL 聚合代替全量加载到内存
    const results: any[] = await this.prisma.$queryRaw`
      SELECT
        DATE(created_at) as date,
        COUNT(*)::int as count,
        COUNT(*) FILTER (WHERE type IN ('TEXT_TO_IMAGE', 'IMAGE_TO_IMAGE'))::int as images,
        COUNT(*) FILTER (WHERE type NOT IN ('TEXT_TO_IMAGE', 'IMAGE_TO_IMAGE'))::int as videos
      FROM generations
      WHERE created_at >= ${since}
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `;

    return results.map((r) => ({
      date: r.date instanceof Date ? r.date.toISOString().slice(0, 10) : String(r.date),
      count: r.count,
      images: r.images,
      videos: r.videos,
    }));
  }

  async getProviderUsageStats() {
    const results = await this.prisma.generation.groupBy({
      by: ['provider'],
      _count: { id: true },
      _sum: { creditsUsed: true },
    });
    return results.map((r) => ({
      provider: r.provider,
      count: r._count.id,
      totalCredits: r._sum.creditsUsed ?? 0,
    }));
  }

  async getSystemCapabilities(): Promise<SystemCapabilities> {
    return {
      mixcutGlobalSpeechEnabled: await this.getBooleanSystemConfig(
        MIXCUT_GLOBAL_SPEECH_ENABLED_KEY,
        DEFAULT_SYSTEM_CAPABILITIES.mixcutGlobalSpeechEnabled,
      ),
    };
  }

  async updateSystemCapabilities(data: {
    mixcutGlobalSpeechEnabled?: boolean;
  }): Promise<SystemCapabilities> {
    const writes: Promise<unknown>[] = [];

    if (data.mixcutGlobalSpeechEnabled !== undefined) {
      writes.push(
        this.prisma.systemConfig.upsert({
          where: { key: MIXCUT_GLOBAL_SPEECH_ENABLED_KEY },
          update: { value: data.mixcutGlobalSpeechEnabled },
          create: {
            key: MIXCUT_GLOBAL_SPEECH_ENABLED_KEY,
            value: data.mixcutGlobalSpeechEnabled,
          },
        }),
      );
    }

    if (writes.length > 0) {
      await Promise.all(writes);
    }

    return this.getSystemCapabilities();
  }

  async getCreditConsumptionStats(days: number = 30) {
    const since = new Date();
    since.setDate(since.getDate() - days);

    // 使用 SQL 聚合代替全量查询
    const results: any[] = await this.prisma.$queryRaw`
      SELECT
        DATE(created_at) as date,
        ABS(SUM(amount))::int as amount
      FROM credit_transactions
      WHERE created_at >= ${since} AND type = 'USAGE'
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `;

    return results.map((r) => ({
      date: r.date instanceof Date ? r.date.toISOString().slice(0, 10) : String(r.date),
      amount: r.amount,
    }));
  }

  async listProviderConfigs() {
    const [configs, diagnostics] = await Promise.all([
      this.providerConfigs.listAdminProviderConfigs(),
      this.providers.listAdminProviderDiagnostics(),
    ]);
    const diagnosticsByProvider = new Map(diagnostics.map((diagnostic) => [diagnostic.provider, diagnostic]));

    return configs.map((config) => ({
      ...config,
      available: diagnosticsByProvider.get(config.provider)?.available ?? false,
      reason: diagnosticsByProvider.get(config.provider)?.reason,
    }));
  }

  async updateProviderConfig(id: string, data: { isEnabled?: boolean; config?: any; apiKey?: string }) {
    if (data.apiKey !== undefined) {
      throw new BadRequestException('API keys remain environment-managed in this repair pass');
    }

    if (data.config && typeof data.config === 'object' && 'apiKey' in data.config) {
      throw new BadRequestException('config 仅支持非敏感运行配置，不能写入 API Key');
    }

    return this.prisma.providerConfig.update({
      where: { id },
      data: {
        ...(data.isEnabled !== undefined && { isEnabled: data.isEnabled }),
        ...(data.config && { config: data.config }),
      },
    });
  }
}
