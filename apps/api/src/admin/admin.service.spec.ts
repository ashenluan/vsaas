import { beforeEach, describe, expect, it, vi, afterEach } from 'vitest';
import { AdminService } from './admin.service';

function createMockPrisma() {
  return {
    user: {
      count: vi.fn(),
      aggregate: vi.fn(),
    },
    generation: {
      count: vi.fn(),
    },
    creditTransaction: {
      aggregate: vi.fn(),
    },
  };
}

describe('AdminService', () => {
  let prisma: ReturnType<typeof createMockPrisma>;
  let service: AdminService;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-06T08:30:00.000Z'));

    prisma = createMockPrisma();
    service = new AdminService(prisma as any, {} as any, {} as any);
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
});
