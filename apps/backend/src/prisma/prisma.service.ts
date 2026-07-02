import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  // The per-query DB logger was removed: it persisted a QueryLog row per query into the
  // same database it was observing, so each write's own BEGIN/COMMIT re-triggered the logger,
  // causing an exponential logging loop.

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
