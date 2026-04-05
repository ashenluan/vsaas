import { beforeEach, describe, expect, it, vi, afterEach } from 'vitest';
import { AdminService } from './admin.service';

function createMockPrisma() {
  return {
    user: {
      count: vi.fn(),
      aggregate: vi.fn(),
      update: vi.fn(),
    },
    generation: {
      count: vi.fn(),
    },
    creditTransaction: {
      aggregate: vi.fn(),
      create: vi.fn(),
    },
    creditPackage: {
      findMany: vi.fn(),
    },
    modelConfig: {
      findMany: vi.fn(),
      update: vi.fn(),
    },
    order: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    $transaction: vi.fn(),
  };
}

describe('AdminService', () => {
  let prisma: ReturnType<typeof createMockPrisma>;
  let pricing: {
    listEditableModelCatalog: ReturnType<typeof vi.fn>;
    updateModelCatalogEntry: ReturnType<typeof vi.fn>;
  };
  let providers: {
    listAdminProviderDiagnostics: ReturnType<typeof vi.fn>;
  };
  let service: AdminService;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-06T08:30:00.000Z'));

    prisma = createMockPrisma();
    pricing = {
      listEditableModelCatalog: vi.fn(),
      updateModelCatalogEntry: vi.fn(),
    };
    providers = {
      listAdminProviderDiagnostics: vi.fn(),
    };
    service = new AdminService(prisma as any, {} as any, providers as any, pricing as any);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns complete dashboard stats for analytics pages', async () => {
    const expectedStartOfToday = new Date('2026-04-06T08:30:00.000Z');
    expectedStartOfToday.setHours(0, 0, 0, 0);

    prisma.user.count.mockResolvedValue(12);
    prisma.generation.count
      .mockResolvedValueOnce(345)
      .mockResolvedValueOnce(9)
      .mockResolvedValueOnce(27);
    prisma.creditTransaction.aggregate
      .mockResolvedValueOnce({ _sum: { amount: -880 } })
      .mockResolvedValueOnce({ _sum: { amount: 1240 } });
    prisma.user.aggregate.mockResolvedValue({ _sum: { creditBalance: 560 } });

    const stats = await service.getStats();

    expect(stats).toEqual({
      totalUsers: 12,
      totalJobs: 345,
      activeJobs: 9,
      todayJobs: 27,
      totalCreditsSpent: 880,
      totalCreditsAdded: 1240,
      totalCreditsBalance: 560,
    });

    expect(prisma.generation.count).toHaveBeenNthCalledWith(2, {
      where: { status: { in: ['PENDING', 'PROCESSING'] } },
    });
    expect(prisma.generation.count).toHaveBeenNthCalledWith(3, {
      where: {
        createdAt: {
          gte: expectedStartOfToday,
        },
      },
    });
    expect(prisma.creditTransaction.aggregate).toHaveBeenNthCalledWith(1, {
      where: { type: 'USAGE' },
      _sum: { amount: true },
    });
    expect(prisma.creditTransaction.aggregate).toHaveBeenNthCalledWith(2, {
      where: { amount: { gt: 0 } },
      _sum: { amount: true },
    });
    expect(prisma.user.aggregate).toHaveBeenCalledWith({
      _sum: { creditBalance: true },
    });
  });

  it('lists all credit packages for admin pricing screens', async () => {
    prisma.creditPackage.findMany.mockResolvedValue([
      {
        id: 'pkg-1',
        name: '专业包',
        credits: 1000,
        price: { toString: () => '99.90' },
        currency: 'CNY',
        isActive: false,
        sortOrder: 3,
      },
    ]);

    const packages = await service.listCreditPackages();

    expect(packages).toEqual([
      {
        id: 'pkg-1',
        name: '专业包',
        credits: 1000,
        price: 99.9,
        currency: 'CNY',
        isActive: false,
        sortOrder: 3,
      },
    ]);
    expect(prisma.creditPackage.findMany).toHaveBeenCalledWith({
      orderBy: [{ sortOrder: 'asc' }, { credits: 'asc' }],
    });
  });

  it('lists editable model configs with provider availability context', async () => {
    pricing.listEditableModelCatalog.mockResolvedValue([
      {
        id: 'qwen:qwen-image-2k',
        persistedId: 'cfg-qwen-2k',
        provider: 'qwen',
        modelId: 'qwen-image-2k',
        displayName: '通义万相 2K',
        type: 'TEXT_TO_IMAGE',
        creditCost: 7,
        costUnit: 'per_image',
        isActive: true,
        capabilities: { resolution: '2k' },
        maxDuration: null,
        sortOrder: 20,
      },
    ]);
    providers.listAdminProviderDiagnostics.mockResolvedValue([
      {
        provider: 'qwen',
        name: '通义万相',
        isEnabled: true,
        available: true,
      },
    ]);

    const models = await service.listModelConfigs();

    expect(models).toEqual([
      expect.objectContaining({
        id: 'qwen:qwen-image-2k',
        provider: 'qwen',
        modelId: 'qwen-image-2k',
        available: true,
      }),
    ]);
  });

  it('updates editable model config fields through the pricing catalog service', async () => {
    pricing.updateModelCatalogEntry.mockResolvedValue({
      id: 'sora:sora-2-pro',
      provider: 'sora',
      modelId: 'sora-2-pro',
      displayName: 'Sora Pro',
      type: 'TEXT_TO_VIDEO',
      creditCost: 25,
      costUnit: 'per_second',
      isActive: false,
      capabilities: null,
      maxDuration: 25,
      sortOrder: 40,
      persistedId: 'cfg-sora-pro',
    });

    const updated = await service.updateModelConfig('sora', 'sora-2-pro', {
      displayName: 'Sora Pro',
      creditCost: 25,
      isActive: false,
      maxDuration: 25,
      sortOrder: 40,
    });

    expect(pricing.updateModelCatalogEntry).toHaveBeenCalledWith('sora', 'sora-2-pro', {
      displayName: 'Sora Pro',
      creditCost: 25,
      isActive: false,
      maxDuration: 25,
      sortOrder: 40,
    });
    expect(updated).toEqual(
      expect.objectContaining({
        provider: 'sora',
        modelId: 'sora-2-pro',
        creditCost: 25,
        isActive: false,
      }),
    );
  });

  describe('updateOrderStatus', () => {
    it('credits the user exactly once when a pending order is marked as paid', async () => {
      const txOrder = {
        findUnique: vi.fn(),
        update: vi.fn(),
      };
      const txUser = {
        update: vi.fn(),
      };
      const txCreditTransaction = {
        create: vi.fn(),
      };

      txOrder.findUnique.mockResolvedValue({
        id: 'order-1',
        userId: 'user-1',
        amount: { toString: () => '29.90' },
        credits: 200,
        status: 'PENDING',
      });
      txUser.update.mockResolvedValue({ creditBalance: 320 });
      txOrder.update.mockResolvedValue({
        id: 'order-1',
        userId: 'user-1',
        amount: { toString: () => '29.90' },
        credits: 200,
        status: 'PAID',
        paidAt: new Date('2026-04-06T08:30:00.000Z'),
      });

      prisma.$transaction.mockImplementation((fn: any) =>
        fn({
          order: txOrder,
          user: txUser,
          creditTransaction: txCreditTransaction,
        }),
      );

      const result = await service.updateOrderStatus('order-1', 'PAID');

      expect(txUser.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { creditBalance: { increment: 200 } },
        select: { creditBalance: true },
      });
      expect(txCreditTransaction.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'user-1',
          amount: 200,
          type: 'PURCHASE',
          referenceId: 'order-1',
          balanceAfter: 320,
        }),
      });
      expect(txOrder.update).toHaveBeenCalledWith({
        where: { id: 'order-1' },
        data: {
          status: 'PAID',
          paidAt: new Date('2026-04-06T08:30:00.000Z'),
        },
      });
      expect(result).toEqual({
        id: 'order-1',
        userId: 'user-1',
        amount: 29.9,
        credits: 200,
        status: 'PAID',
        paidAt: new Date('2026-04-06T08:30:00.000Z'),
      });
    });

    it('does not double credit an order that is already paid', async () => {
      const txOrder = {
        findUnique: vi.fn(),
        update: vi.fn(),
      };
      const txUser = {
        update: vi.fn(),
      };
      const txCreditTransaction = {
        create: vi.fn(),
      };

      txOrder.findUnique.mockResolvedValue({
        id: 'order-1',
        userId: 'user-1',
        amount: { toString: () => '29.90' },
        credits: 200,
        status: 'PAID',
        paidAt: new Date('2026-04-06T08:25:00.000Z'),
      });

      prisma.$transaction.mockImplementation((fn: any) =>
        fn({
          order: txOrder,
          user: txUser,
          creditTransaction: txCreditTransaction,
        }),
      );

      const result = await service.updateOrderStatus('order-1', 'PAID');

      expect(txUser.update).not.toHaveBeenCalled();
      expect(txCreditTransaction.create).not.toHaveBeenCalled();
      expect(txOrder.update).not.toHaveBeenCalled();
      expect(result).toEqual({
        id: 'order-1',
        userId: 'user-1',
        amount: 29.9,
        credits: 200,
        status: 'PAID',
        paidAt: new Date('2026-04-06T08:25:00.000Z'),
      });
    });
  });
});
