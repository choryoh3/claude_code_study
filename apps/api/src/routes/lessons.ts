import { slugSchema } from '@claude-study/schemas';
import { Hono } from 'hono';
import { z } from 'zod';
import { toPublicQuestion, type AppEnv, type LessonCatalog } from '../types';
import { errorBody, validate } from '../validate';

const searchQuerySchema = z.object({ q: z.string().trim().min(1).max(100) });
const slugParamSchema = z.object({ slug: slugSchema });

export function lessonRoutes(catalog: LessonCatalog) {
  return new Hono<AppEnv>()
    .get('/lessons', (c) => c.json(catalog.list()))
    .get('/lessons/:slug', validate('param', slugParamSchema), (c) => {
      const lesson = catalog.get(c.req.valid('param').slug);
      if (!lesson) return c.json(errorBody('not_found', 'レッスンが見つかりません。'), 404);
      return c.json(lesson, 200);
    })
    .get('/quiz/:slug', validate('param', slugParamSchema), (c) => {
      const questions = catalog.quiz(c.req.valid('param').slug);
      if (!questions) return c.json(errorBody('not_found', 'クイズが見つかりません。'), 404);
      // 正解と解説は採点結果でのみ返す
      return c.json(questions.map(toPublicQuestion), 200);
    })
    .get('/search', validate('query', searchQuerySchema), (c) =>
      c.json(catalog.search(c.req.valid('query').q)),
    );
}
