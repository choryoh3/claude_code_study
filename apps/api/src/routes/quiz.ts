import { gradeRequestSchema, slugSchema, type GradeResult } from '@claude-study/schemas';
import { Hono } from 'hono';
import { z } from 'zod';
import { awardEarnedBadges } from '../badge-service';
import type { AppEnv, LessonCatalog, ProgressStore } from '../types';
import { errorBody, validate } from '../validate';

const slugParamSchema = z.object({ slug: slugSchema });

interface Deps {
  store: ProgressStore;
  catalog: LessonCatalog;
  now: () => Date;
}

export function quizRoutes({ store, catalog, now }: Deps) {
  return new Hono<AppEnv>().post(
    '/quiz/:slug/grade',
    validate('param', slugParamSchema),
    validate('json', gradeRequestSchema),
    async (c) => {
      const { slug } = c.req.valid('param');
      const { answers } = c.req.valid('json');
      const questions = catalog.quiz(slug);
      if (!questions) return c.json(errorBody('not_found', 'クイズが見つかりません。'), 404);

      const known = new Set(questions.map((q) => q.id));
      if (answers.some((a) => !known.has(a.questionId))) {
        return c.json(errorBody('invalid_request', '存在しない問題が含まれています。'), 400);
      }
      const chosen = new Map(answers.map((a) => [a.questionId, a.choiceIndex]));

      // 未回答は不正解として採点する。採点は必ずサーバー側で行う
      const results = questions.map((q) => ({
        questionId: q.id,
        correct: chosen.get(q.id) === q.answerIndex,
        correctIndex: q.answerIndex,
        explanation: q.explanation,
      }));
      const score = results.filter((r) => r.correct).length;
      const result: GradeResult = { score, total: questions.length, results };

      // ゲストは採点結果のみ返し、保存はしない
      const user = c.get('user');
      let newBadges: string[] = [];
      if (user) {
        const userId = await store.upsertUser(user);
        const at = now();
        await store.recordAttempt(userId, slug, score, questions.length, answers);
        await store.addStudyDay(userId, at.toISOString().slice(0, 10));
        newBadges = await awardEarnedBadges({ store, catalog }, userId, at);
      }
      return c.json({ ...result, newBadges }, 200);
    },
  );
}
