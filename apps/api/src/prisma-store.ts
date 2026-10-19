import { BADGE_DEFINITIONS, type PrismaClient } from '@claude-study/db';
import {
  badgeKeySchema,
  progressStatusSchema,
  type BadgeKey,
  type ProgressEntry,
  type UserBadge,
} from '@claude-study/schemas';
import type { AuthUser, ProgressStore } from './types';

export function createPrismaStore(prisma: PrismaClient): ProgressStore {
  return {
    async upsertUser(user: AuthUser) {
      const row = await prisma.user.upsert({
        where: { authId: user.authId },
        update: { displayName: user.displayName, avatarUrl: user.avatarUrl },
        create: {
          authId: user.authId,
          displayName: user.displayName,
          avatarUrl: user.avatarUrl,
        },
      });
      return row.id;
    },

    async listProgress(userId): Promise<ProgressEntry[]> {
      const rows = await prisma.lessonProgress.findMany({ where: { userId } });
      return rows.map((r) => ({
        lessonSlug: r.lessonSlug,
        status: progressStatusSchema.parse(r.status),
        completedAt: r.completedAt?.toISOString() ?? null,
      }));
    },

    async setProgress(userId, slug, status, completedAt) {
      await prisma.lessonProgress.upsert({
        where: { userId_lessonSlug: { userId, lessonSlug: slug } },
        update: { status, completedAt },
        create: { userId, lessonSlug: slug, status, completedAt },
      });
    },

    async addStudyDay(userId, date) {
      await prisma.studyDay.upsert({
        where: { userId_date: { userId, date } },
        update: {},
        create: { userId, date },
      });
    },

    async listStudyDays(userId) {
      const rows = await prisma.studyDay.findMany({ where: { userId } });
      return rows.map((r) => r.date);
    },

    async recordAttempt(userId, slug, score, total, answers) {
      await prisma.quizAttempt.create({
        data: { userId, lessonSlug: slug, score, total, answers: JSON.stringify(answers) },
      });
    },

    async hasPerfectAttempt(userId) {
      const rows = await prisma.quizAttempt.findMany({
        where: { userId },
        select: { score: true, total: true },
      });
      return rows.some((r) => r.total > 0 && r.score === r.total);
    },

    async listBadges(userId): Promise<UserBadge[]> {
      const rows = await prisma.userBadge.findMany({ where: { userId } });
      return rows.map((r) => ({
        badgeKey: badgeKeySchema.parse(r.badgeKey),
        earnedAt: r.earnedAt.toISOString(),
      }));
    },

    async awardBadge(userId, key: BadgeKey, now) {
      // seed 未実行でも外部キー違反にならないよう、バッジ定義の行を先に確保する
      const def = BADGE_DEFINITIONS.find((b) => b.key === key);
      if (!def) throw new Error(`unknown badge: ${key}`);
      await prisma.badge.upsert({ where: { key }, update: {}, create: def });
      await prisma.userBadge.upsert({
        where: { userId_badgeKey: { userId, badgeKey: key } },
        update: {},
        create: { userId, badgeKey: key, earnedAt: now },
      });
    },
  };
}
