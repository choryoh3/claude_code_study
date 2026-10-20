-- ログインした学習者の進捗を、1人1行で保存する（ADR 0010）。
-- 保存するのは学習状態のみ。メールアドレス等の個人情報はこのテーブルに置かない。
-- 適用方法: Supabase の SQL Editor に貼って実行する（MCP は参照のみのため）。

create table if not exists public.user_progress (
  user_id uuid primary key references auth.users (id) on delete cascade,
  -- GuestProgress（entries / studyDays / quiz / badges）。読み書きのたびに、アプリ側で検証する
  data jsonb not null default '{}'::jsonb check (jsonb_typeof(data) = 'object' and pg_column_size(data) < 65536),
  updated_at timestamptz not null default now()
);

alter table public.user_progress enable row level security;

-- 自分の行だけ読み書きできる。(select auth.uid()) は行ごとの再評価を避ける書き方
create policy "own progress: select" on public.user_progress
  for select to authenticated using ((select auth.uid()) = user_id);

create policy "own progress: insert" on public.user_progress
  for insert to authenticated with check ((select auth.uid()) = user_id);

create policy "own progress: update" on public.user_progress
  for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

create policy "own progress: delete" on public.user_progress
  for delete to authenticated using ((select auth.uid()) = user_id);

-- 匿名（ログインなし）からは何も見えない・書けない
revoke all on public.user_progress from anon;
