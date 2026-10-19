import { zValidator } from '@hono/zod-validator';
import type { ValidationTargets } from 'hono';
import type { ZodType } from 'zod';

/** zod-validator のラッパー。失敗時は統一エラー形式で返し、zodの内部情報を漏らさない。 */
export function validate<T extends ZodType, Target extends keyof ValidationTargets>(
  target: Target,
  schema: T,
) {
  return zValidator(target, schema, (result, c) => {
    if (!result.success) {
      return c.json({ error: { code: 'invalid_request', message: '入力が不正です。' } }, 400);
    }
  });
}

export function errorBody(code: string, message: string) {
  return { error: { code, message } };
}
