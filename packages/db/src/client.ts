import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import { PrismaClient } from './generated/client';

/**
 * 開発用のSQLiteに接続するPrismaClientを作る。
 * Supabase(Postgres)へ移行する際は、ここのアダプタとschema.prismaのproviderを差し替える。
 */
export function createPrismaClient(url: string = process.env.DATABASE_URL ?? 'file:./dev.db') {
  const adapter = new PrismaBetterSqlite3({ url });
  return new PrismaClient({ adapter });
}

export type { PrismaClient };
