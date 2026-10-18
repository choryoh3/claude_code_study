import { mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { BADGE_DEFINITIONS } from './badges';
import { createPrismaClient, type PrismaClient } from './client';

// 実際のSQLiteファイルにマイグレーションを適用して検証する（モックしない）
const dir = mkdtempSync(join(tmpdir(), 'claude-study-db-'));
const url = `file:${join(dir, 'test.db').replace(/\\/g, '/')}`;
let prisma: PrismaClient;

beforeAll(async () => {
  prisma = createPrismaClient(url);
  // Prisma CLI は起動が遅いため、マイグレーションのSQLを実際のSQLiteへ直接適用する
  const migrationsDir = join(__dirname, '..', 'prisma', 'migrations');
  const folders = readdirSync(migrationsDir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort();
  for (const folder of folders) {
    const sql = readFileSync(join(migrationsDir, folder, 'migration.sql'), 'utf8');
    for (const statement of sql.split(/;\s*(?:\r?\n|$)/)) {
      const body = statement
        .split(/\r?\n/)
        .filter((line) => !line.trim().startsWith('--'))
        .join('\n')
        .trim();
      if (body) await prisma.$executeRawUnsafe(body);
    }
  }
}, 60_000);

afterAll(async () => {
  await prisma?.$disconnect();
  rmSync(dir, { recursive: true, force: true });
});

describe('DBスキーマ', () => {
  it('ユーザーと進捗を保存でき、同じレッスンの進捗は重複できない', async () => {
    const user = await prisma.user.create({ data: { authId: 'auth-1', displayName: 'テスト' } });
    await prisma.lessonProgress.create({
      data: { userId: user.id, lessonSlug: 'install', status: 'in_progress' },
    });
    await expect(
      prisma.lessonProgress.create({
        data: { userId: user.id, lessonSlug: 'install', status: 'completed' },
      }),
    ).rejects.toThrow();
  });

  it('authId はユニークである', async () => {
    await prisma.user.create({ data: { authId: 'auth-dup' } });
    await expect(prisma.user.create({ data: { authId: 'auth-dup' } })).rejects.toThrow();
  });

  it('ユーザー削除で関連データも削除される', async () => {
    const user = await prisma.user.create({ data: { authId: 'auth-cascade' } });
    await prisma.studyDay.create({ data: { userId: user.id, date: '2026-10-18' } });
    await prisma.user.delete({ where: { id: user.id } });
    expect(await prisma.studyDay.count({ where: { userId: user.id } })).toBe(0);
  });

  it('バッジ定義をupsertでき、再実行しても件数が増えない', async () => {
    for (let i = 0; i < 2; i++) {
      for (const b of BADGE_DEFINITIONS) {
        await prisma.badge.upsert({ where: { key: b.key }, update: {}, create: b });
      }
    }
    expect(await prisma.badge.count()).toBe(BADGE_DEFINITIONS.length);
  });
});
