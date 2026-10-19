import type { AppType } from '@claude-study/api/app';
import { hc } from 'hono/client';

/**
 * 型付きの API クライアント（Hono RPC）。ルートの入出力の型は apps/api の定義から自動で決まり、
 * パスや本文を間違えるとコンパイルエラーになる。呼び出しは `api.api.quiz[':slug'].$get(...)` の形。
 * （1つ目の `api` はクライアント、2つ目はURLの `/api` 部分）
 */
export const api = hc<AppType>('/');
