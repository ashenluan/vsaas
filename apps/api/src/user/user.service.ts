import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaService) {}

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        displayName: true,
        avatar: true,
        role: true,
        creditBalance: true,
        createdAt: true,
      },
    });
    if (!user) throw new NotFoundException('User not found');
    return {
      ...user,
      balance: user.creditBalance,
    };
  }

  async updateProfile(userId: string, data: { displayName?: string; avatar?: string }) {
    return this.prisma.user.update({
      where: { id: userId },
      data,
      select: {
        id: true,
        email: true,
        displayName: true,
        avatar: true,
        role: true,
      },
    });
  }

  async getCreditBalance(userId: string): Promise<number> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { creditBalance: true },
    });
    if (!user) throw new NotFoundException('User not found');
    return user.creditBalance;
  }

  async deductCredits(userId: string, amount: number, description: string, referenceId?: string) {
    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { id: userId },
        select: { creditBalance: true },
      });
      if (!user) throw new NotFoundException('User not found');
      if (user.creditBalance < amount) {
        throw new BadRequestException('Insufficient credits');
      }
      const updated = await tx.user.update({
        where: { id: userId },
        data: { creditBalance: { decrement: amount } },
        select: { creditBalance: true },
      });
      await tx.creditTransaction.create({
        data: {
          userId,
          amount: -amount,
          type: 'USAGE',
          description,
          referenceId: referenceId ?? null,
          balanceAfter: updated.creditBalance,
        },
      });
      return updated.creditBalance;
    });
  }

  async addCredits(userId: string, amount: number, type: 'PURCHASE' | 'REFUND' | 'ADMIN_ADJUSTMENT' | 'BONUS', description: string, referenceId?: string) {
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.user.update({
        where: { id: userId },
        data: { creditBalance: { increment: amount } },
        select: { creditBalance: true },
      });
      await tx.creditTransaction.create({
        data: {
          userId,
          amount,
          type,
          description,
          referenceId: referenceId ?? null,
          balanceAfter: updated.creditBalance,
        },
      });
      return updated.creditBalance;
    });
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { passwordHash: true },
    });
    if (!user) throw new NotFoundException('User not found');

    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) throw new BadRequestException('当前密码不正确');

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });
    return { success: true };
  }

  async getCreditHistory(userId: string, page: number = 1, pageSize: number = 20) {
    const [items, total] = await Promise.all([
      this.prisma.creditTransaction.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.creditTransaction.count({ where: { userId } }),
    ]);
    return { items, total, page, pageSize };
  }
}
