import { handle } from 'hono/vercel';
import { getApi } from '@/lib/server-api';

// ファイルシステム（レッスンのMDX）を読むため、Node.js ランタイムで動かす
export const runtime = 'nodejs';
// 採点・検索はリクエストごとに動かす（キャッシュしない）
export const dynamic = 'force-dynamic';

const handler = (request: Request) => handle(getApi())(request);

export const GET = handler;
export const POST = handler;
export const PUT = handler;
