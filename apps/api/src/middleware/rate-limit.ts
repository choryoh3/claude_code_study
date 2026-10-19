import type { MiddlewareHandler } from 'hono';

interface RateLimitOptions {
  /** 時間窓あたりの許可リクエスト数 */
  limit: number;
  windowMs: number;
  /** 注入可能な時計（テスト用） */
  now?: () => number;
  /** 制限の単位。既定はログインユーザー、なければクライアントIP */
  key?: (c: Parameters<MiddlewareHandler>[0]) => string;
}

function clientIp(c: Parameters<MiddlewareHandler>[0]): string {
  const forwarded = c.req.header('x-forwarded-for')?.split(',')[0]?.trim();
  return forwarded || c.req.header('x-real-ip') || 'unknown';
}

/**
 * 固定ウィンドウ方式のレート制限。メモリ保持なので、サーバーレスの複数インスタンス間では
 * 共有されない（本番では Upstash 等への差し替えを想定。ADRに記録する）。
 */
export function rateLimit(options: RateLimitOptions): MiddlewareHandler {
  const now = options.now ?? Date.now;
  const buckets = new Map<string, { count: number; resetAt: number }>();

  return async (c, next) => {
    const t = now();
    // 期限切れのバケットを掃除して、メモリが際限なく増えないようにする
    if (buckets.size > 10_000) {
      for (const [k, b] of buckets) if (b.resetAt <= t) buckets.delete(k);
    }

    const key = options.key?.(c) ?? clientIp(c);
    let bucket = buckets.get(key);
    if (!bucket || bucket.resetAt <= t) {
      bucket = { count: 0, resetAt: t + options.windowMs };
      buckets.set(key, bucket);
    }
    bucket.count += 1;

    const remaining = Math.max(0, options.limit - bucket.count);
    c.header('X-RateLimit-Limit', String(options.limit));
    c.header('X-RateLimit-Remaining', String(remaining));

    if (bucket.count > options.limit) {
      const retryAfter = Math.max(1, Math.ceil((bucket.resetAt - t) / 1000));
      c.header('Retry-After', String(retryAfter));
      return c.json(
        {
          error: { code: 'rate_limited', message: 'リクエストが多すぎます。少し待ってください。' },
        },
        429,
      );
    }
    await next();
  };
}
