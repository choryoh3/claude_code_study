import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { PrismaClient } from './client';

/**
 * テスト用: migrations 配下のSQLを実際のSQLiteへ順に適用する。
 * Prisma CLI は起動が遅いため、CLIを介さず直接適用する。
 */
export async function applyMigrations(prisma: PrismaClient): Promise<void> {
  const dir = join(__dirname, '..', 'prisma', 'migrations');
  const folders = readdirSync(dir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort();
  for (const folder of folders) {
    const sql = readFileSync(join(dir, folder, 'migration.sql'), 'utf8');
    for (const statement of sql.split(/;\s*(?:\r?\n|$)/)) {
      const body = statement
        .split(/\r?\n/)
        .filter((line) => !line.trim().startsWith('--'))
        .join('\n')
        .trim();
      if (body) await prisma.$executeRawUnsafe(body);
    }
  }
}
