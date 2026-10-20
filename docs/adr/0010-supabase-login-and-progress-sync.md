# 0010. GitHub ログインと進捗の同期（supabase-js + RLS）

- 日付: 2026-10-20
- 状態: 採用（Vercel 上の動作確認は未実施）

## 背景

ゲスト（ログインなし）の進捗はブラウザの localStorage にある。端末をまたいで引き継げるよう、任意のログイン（GitHub OAuth）と進捗の保存を追加する。Supabase 側の GitHub OAuth は有効化済み。

## 決定

- **ブラウザから supabase-js で直接読み書きし、アクセス制御は DB の RLS に任せる。** Hono の `ProgressStore`（Prisma）経由にはしない。理由: 本番 DB が Supabase なので、別の API 層と二重に権限を実装せずに済む。Prisma + SQLite は開発用のまま残る。
- テーブルは `user_progress`（`user_id` 主キー、`data jsonb`）の1つだけ。中身はブラウザの進捗（`GuestProgress`）そのもの。ポリシーは「自分の行だけ select / insert / update / delete」、`anon` は不可。SQL は `supabase/migrations/`。**Supabase MCP は参照のみなので、SQL Editor で手動適用する。**
- `data` は信用しない。読み込み時に `parseStoredProgress` で検証し、不正な項目は捨てる。サイズは 64KB 未満の制約。
- **ログイン時は統合する（`mergeProgress`）。** 進んだ状態・高い得点・早い獲得日時を採り、学習日は和集合。順序に依存せず、どちらの進捗も減らさない。以降の変更は 1.5 秒待ってまとめて保存する。
- 失敗しても学習は止めない。端末の進捗が正で、エラーは通知するだけ。
- セッションは localStorage（Cookie は使わない）。PKCE フロー。環境変数が未設定なら、ログインの UI は出ず、ゲストのまま動く。
- 使うのは publishable key のみ（公開してよい）。service role key はアプリに持ち込まない。

## 未対応・注意

- **ユーザーが自分で進捗・アカウントを削除する機能は、まだない。** プライバシーポリシーには、連絡による削除と書いた。実装したら書き換える。
- ログアウトしても端末の進捗は消さない。共用 PC では、次の人に見える。
- 別端末で同時に更新した場合は、保存のたびに上書きになる（統合は、ログイン時だけ）。
- 本番の Redirect URL（Supabase の URL Configuration）に、公開 URL を追加する必要がある。
