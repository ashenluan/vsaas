import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UserService } from './user.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';

// Mock bcryptjs
vi.mock('bcryptjs', () => ({
  default: {
    compare: vi.fn(),
    hash: vi.fn(),
  },
  compare: vi.fn(),
  hash: vi.fn(),
}));

function createMockPrisma() {
  return {
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    creditPackage: {
      findMany: vi.fn(),
    },
    order: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
    creditTransaction: {
      create: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
    },
    $transaction: vi.fn((fn: any) => fn({
      user: {
        findUnique: vi.fn(),
        update: vi.fn(),
      },
      creditTransaction: {
        create: vi.fn(),
      },
    })),
  };
}

describe('UserService - 积分系统', () => {
  let service: UserService;
  let prisma: ReturnType<typeof createMockPrisma>;

  beforeEach(() => {
    prisma = createMockPrisma();
    service = new UserService(prisma as any);
  });

  describe('getCreditBalance', () => {
    it('返回用户积分余额', async () => {
      prisma.user.findUnique.mockResolvedValue({ creditBalance: 500 });

      const balance = await service.getCreditBalance('user-1');

      expect(balance).toBe(500);
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        select: { creditBalance: true },
      });
    });

    it('用户不存在时抛出 NotFoundException', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.getCreditBalance('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('deductCredits', () => {
    it('余额充足时成功扣除积分', async () => {
      const txUser = { findUnique: vi.fn(), update: vi.fn() };
      const txCreditTx = { create: vi.fn() };
      txUser.findUnique.mockResolvedValue({ creditBalance: 100 });
      txUser.update.mockResolvedValue({ creditBalance: 90 });

      prisma.$transaction.mockImplementation((fn: any) =>
        fn({ user: txUser, creditTransaction: txCreditTx }),
      );

      const result = await service.deductCredits('user-1', 10, '图片生成');

      expect(result).toBe(90);
      expect(txUser.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { creditBalance: { decrement: 10 } },
        select: { creditBalance: true },
      });
      expect(txCreditTx.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'user-1',
          amount: -10,
          type: 'USAGE',
          description: '图片生成',
          balanceAfter: 90,
        }),
      });
    });

    it('余额不足时抛出 BadRequestException', async () => {
      const txUser = { findUnique: vi.fn(), update: vi.fn() };
      const txCreditTx = { create: vi.fn() };
      txUser.findUnique.mockResolvedValue({ creditBalance: 5 });

      prisma.$transaction.mockImplementation((fn: any) =>
        fn({ user: txUser, creditTransaction: txCreditTx }),
      );

      await expect(service.deductCredits('user-1', 10, '生成')).rejects.toThrow(
        BadRequestException,
      );
      expect(txUser.update).not.toHaveBeenCalled();
    });

    it('用户不存在时抛出 NotFoundException', async () => {
      const txUser = { findUnique: vi.fn(), update: vi.fn() };
      const txCreditTx = { create: vi.fn() };
      txUser.findUnique.mockResolvedValue(null);

      prisma.$transaction.mockImplementation((fn: any) =>
        fn({ user: txUser, creditTransaction: txCreditTx }),
      );

      await expect(service.deductCredits('nonexistent', 10, '生成')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('记录 referenceId', async () => {
      const txUser = { findUnique: vi.fn(), update: vi.fn() };
      const txCreditTx = { create: vi.fn() };
      txUser.findUnique.mockResolvedValue({ creditBalance: 100 });
      txUser.update.mockResolvedValue({ creditBalance: 80 });

      prisma.$transaction.mockImplementation((fn: any) =>
        fn({ user: txUser, creditTransaction: txCreditTx }),
      );

      await service.deductCredits('user-1', 20, '视频生成', 'job-123');

      expect(txCreditTx.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          referenceId: 'job-123',
        }),
      });
    });
  });

  describe('addCredits', () => {
    it('成功充值积分', async () => {
      const txUser = { update: vi.fn() };
      const txCreditTx = { create: vi.fn() };
      txUser.update.mockResolvedValue({ creditBalance: 600 });

      prisma.$transaction.mockImplementation((fn: any) =>
        fn({ user: txUser, creditTransaction: txCreditTx }),
      );

      const result = await service.addCredits('user-1', 100, 'PURCHASE', '购买套餐');

      expect(result).toBe(600);
      expect(txUser.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { creditBalance: { increment: 100 } },
        select: { creditBalance: true },
      });
      expect(txCreditTx.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'user-1',
          amount: 100,
          type: 'PURCHASE',
          description: '购买套餐',
          balanceAfter: 600,
        }),
      });
    });

    it('退款类型正确记录', async () => {
      const txUser = { update: vi.fn() };
      const txCreditTx = { create: vi.fn() };
      txUser.update.mockResolvedValue({ creditBalance: 120 });

      prisma.$transaction.mockImplementation((fn: any) =>
        fn({ user: txUser, creditTransaction: txCreditTx }),
      );

      await service.addCredits('user-1', 20, 'REFUND', '生成失败退款', 'job-456');

      expect(txCreditTx.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          type: 'REFUND',
          referenceId: 'job-456',
        }),
      });
    });
  });

  describe('billing data', () => {
    it('lists active credit packages in sort order', async () => {
      prisma.creditPackage.findMany.mockResolvedValue([
        {
          id: 'pkg-1',
          name: '基础包',
          credits: 200,
          price: { toString: () => '29.90' },
          currency: 'CNY',
          isActive: true,
          sortOrder: 2,
        },
      ]);

      const packages = await service.listCreditPackages();

      expect(packages).toEqual([
        {
          id: 'pkg-1',
          name: '基础包',
          credits: 200,
          price: 29.9,
          currency: 'CNY',
          isActive: true,
          sortOrder: 2,
        },
      ]);
      expect(prisma.creditPackage.findMany).toHaveBeenCalledWith({
        where: { isActive: true },
        orderBy: [{ sortOrder: 'asc' }, { credits: 'asc' }],
      });
    });

    it('lists only the current user orders sorted by newest first', async () => {
      prisma.order.findMany.mockResolvedValue([
        {
          id: 'order-1',
          userId: 'user-1',
          packageId: 'pkg-1',
          amount: { toString: () => '29.90' },
          credits: 200,
          currency: 'CNY',
          status: 'PAID',
          paymentMethod: null,
          createdAt: new Date('2026-04-06T09:00:00.000Z'),
          paidAt: new Date('2026-04-06T09:01:00.000Z'),
        },
      ]);
      prisma.order.count.mockResolvedValue(1);

      const result = await service.getOrders('user-1', 1, 10);

      expect(result).toEqual({
        items: [
          {
            id: 'order-1',
            userId: 'user-1',
            packageId: 'pkg-1',
            amount: 29.9,
            credits: 200,
            currency: 'CNY',
            status: 'PAID',
            paymentMethod: null,
            createdAt: new Date('2026-04-06T09:00:00.000Z'),
            paidAt: new Date('2026-04-06T09:01:00.000Z'),
          },
        ],
        total: 1,
        page: 1,
        pageSize: 10,
      });
      expect(prisma.order.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        orderBy: { createdAt: 'desc' },
        skip: 0,
        take: 10,
      });
      expect(prisma.order.count).toHaveBeenCalledWith({ where: { userId: 'user-1' } });
    });
  });
});
