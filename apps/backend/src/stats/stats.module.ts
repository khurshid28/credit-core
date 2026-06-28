import { Controller, Get, Module, UseGuards } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { CaseStatus, Role, StatsResponse } from '@credit-core/shared';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, RequestUser } from '../auth/current-user.decorator';

function scopeFor(user: RequestUser): Prisma.CreditCaseWhereInput {
  if (user.role === Role.OPERATOR) return { createdById: user.id };
  if (user.role === Role.MODERATOR && user.branchId) return { branchId: user.branchId };
  return {};
}

@UseGuards(JwtAuthGuard)
@Controller('stats')
class StatsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async stats(@CurrentUser() user: RequestUser): Promise<StatsResponse> {
    const where = scopeFor(user);

    const [byStatusRaw, all, branches] = await Promise.all([
      this.prisma.creditCase.groupBy({ by: ['status'], where, _count: { _all: true } }),
      this.prisma.creditCase.findMany({
        where,
        select: { amount: true, katmPrice: true, status: true, branchId: true },
      }),
      this.prisma.branch.findMany({ select: { id: true, symbol: true } }),
    ]);

    const byStatus = (Object.values(CaseStatus) as CaseStatus[]).map((status) => ({
      status,
      count: byStatusRaw.find((b) => b.status === status)?._count._all ?? 0,
    }));

    const branchMap = new Map(branches.map((b) => [b.id, b.symbol]));
    const branchCounts = new Map<string, number>();
    let totalAmount = 0;
    let totalKatm = 0;
    for (const c of all) {
      totalAmount += c.amount ? Number(c.amount) : 0;
      totalKatm += c.katmPrice ? Number(c.katmPrice) : 0;
      const key = c.branchId ? branchMap.get(c.branchId) ?? '—' : '—';
      branchCounts.set(key, (branchCounts.get(key) ?? 0) + 1);
    }

    const recentRaw = await this.prisma.creditCase.findMany({
      where,
      include: { branch: true, borrower: true },
      orderBy: { updatedAt: 'desc' },
      take: 5,
    });

    return {
      byStatus,
      byBranch: [...branchCounts.entries()].map(([branch, count]) => ({ branch, count })),
      totalCases: all.length,
      totalAmount,
      totalKatm,
      finalizedCount: byStatus.find((s) => s.status === CaseStatus.FINALIZED)?.count ?? 0,
      recent: recentRaw.map((c) => ({
        id: c.id,
        number: c.number,
        productType: c.productType,
        status: c.status,
        amount: c.amount ? Number(c.amount) : null,
        borrowerName: c.borrower?.fullName ?? null,
        branchSymbol: c.branch?.symbol ?? null,
        updatedAt: c.updatedAt.toISOString(),
      })),
    };
  }
}

@Module({ controllers: [StatsController] })
export class StatsModule {}
