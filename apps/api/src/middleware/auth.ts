import type { MiddlewareHandler } from 'hono';
import type { AppEnv, AuthProvider } from '../types';

/** 常にゲスト扱いにするプロバイダ。Supabase接続前の既定値。 */
export const guestAuthProvider: AuthProvider = {
  authenticate: async () => null,
};

/** ユーザーを解決して context に載せる。ゲストでも通す（拒否は requireUser で行う）。 */
export function authenticate(provider: AuthProvider): MiddlewareHandler<AppEnv> {
  return async (c, next) => {
    c.set('user', await provider.authenticate(c.req.raw));
    await next();
  };
}

export const requireUser: MiddlewareHandler<AppEnv> = async (c, next) => {
  if (!c.get('user')) {
    return c.json({ error: { code: 'unauthorized', message: 'ログインが必要です。' } }, 401);
  }
  await next();
};
