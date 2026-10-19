import { Hono } from 'hono';
import { describe, expect, it } from 'vitest';
import { rateLimit } from './rate-limit';

function makeApp(clock: { t: number }) {
  return new Hono()
    .use('*', rateLimit({ limit: 2, windowMs: 1000, now: () => clock.t }))
    .get('/', (c) => c.text('ok'));
}
const call = (app: Hono, ip: string) => app.request('/', { headers: { 'x-forwarded-for': ip } });

describe('rateLimit', () => {
  it('上限までは通し、超えると429とRetry-Afterを返す', async () => {
    const app = makeApp({ t: 0 });
    expect((await call(app, '1.1.1.1')).status).toBe(200);
    expect((await call(app, '1.1.1.1')).status).toBe(200);
    const res = await call(app, '1.1.1.1');
    expect(res.status).toBe(429);
    expect(res.headers.get('Retry-After')).toBe('1');
    expect(await res.json()).toMatchObject({ error: { code: 'rate_limited' } });
  });

  it('IPごとに別々に数える', async () => {
    const app = makeApp({ t: 0 });
    await call(app, '1.1.1.1');
    await call(app, '1.1.1.1');
    expect((await call(app, '2.2.2.2')).status).toBe(200);
  });

  it('時間窓が過ぎるとリセットされる', async () => {
    const clock = { t: 0 };
    const app = makeApp(clock);
    await call(app, '1.1.1.1');
    await call(app, '1.1.1.1');
    expect((await call(app, '1.1.1.1')).status).toBe(429);
    clock.t = 1001;
    expect((await call(app, '1.1.1.1')).status).toBe(200);
  });
});
