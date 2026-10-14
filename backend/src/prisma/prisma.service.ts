import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { generateRandId } from '../common/rand-id';

const MAX_RAND_ID_ATTEMPTS = 5;

export function createPrismaClient(connectionString = process.env.DATABASE_URL) {
  if (!connectionString) {
    throw new Error('DATABASE_URL is not defined in environment variables');
  }
  return new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
}

function isRandIdCollision(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2002' &&
    JSON.stringify(error.meta ?? {}).includes('randId')
  );
}

/** Runs `create` with a fresh randId, retrying on the (rare) unique collision. */
export async function withRandId<T>(create: (randId: string) => Promise<T>): Promise<T> {
  for (let attempt = 1; ; attempt++) {
    try {
      return await create(generateRandId());
    } catch (error) {
      if (!isRandIdCollision(error) || attempt >= MAX_RAND_ID_ATTEMPTS) throw error;
    }
  }
}

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error('DATABASE_URL is not defined in environment variables');
    }
    super({ adapter: new PrismaPg({ connectionString }) });
  }

  withRandId = withRandId;

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
