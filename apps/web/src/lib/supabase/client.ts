import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let client: SupabaseClient | null | undefined;

/**
 * ブラウザ用の Supabase クライアント。環境変数が未設定なら null（ログイン機能を出さず、ゲストのまま使える）。
 * 使うのは公開してよい publishable key のみ。データの保護は、DB 側の RLS が担う（ADR 0010）。
 * セッションはブラウザの localStorage に保存される（Cookie は使わない）。
 */
export function getSupabase(): SupabaseClient | null {
  if (client !== undefined) return client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  client = url && key ? createClient(url, key, { auth: { flowType: 'pkce' } }) : null;
  return client;
}
