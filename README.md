# claude_code_study

Claude Code を **基礎 → 中級 → 上級** で学べる、日本語の学習 Web アプリ（公開用）。
レッスン25本（MDX）・クイズ・進捗とバッジ・チートシート・用語集・コマンドパレット（⌘K / Ctrl+K）を備える。

## 構成

| パス               | 内容                                                                                     |
| ------------------ | ---------------------------------------------------------------------------------------- |
| `apps/web`         | Next.js (App Router)。Hono を `/api/[[...route]]` にマウント（単一 Vercel プロジェクト） |
| `apps/api`         | Hono（zod-validator、RPC 型を export）                                                   |
| `packages/schemas` | 共有 zod スキーマ（web / api の契約）                                                    |
| `packages/db`      | Prisma（開発は SQLite）                                                                  |
| `packages/content` | MDX カリキュラム・チートシート・用語集                                                   |
| `e2e`              | 本番ビルドを実ブラウザで検査（動作・アクセシビリティ）。[使い方](e2e/README.md)          |
| `docs`             | ADR（`docs/adr/`）、`.claude` の配置理由、GitHub 運用                                    |

## セットアップ

必要なもの: Node 22 以上、pnpm 10。

```bash
pnpm install
cp .env.example .env.local   # 値は必要に応じて編集（.env* はコミットしない）
pnpm --filter @claude-study/web dev
```

ログインなし（ゲスト）で全機能が使える。進捗はブラウザの localStorage に保存される。

## コマンド

| コマンド                                                | 内容                                                                            |
| ------------------------------------------------------- | ------------------------------------------------------------------------------- |
| `pnpm verify`                                           | format:check + lint + typecheck + test + build（完了の判定基準）                |
| `pnpm test` / `lint` / `typecheck` / `build` / `format` | 個別実行                                                                        |
| `pnpm e2e`                                              | 本番ビルドを起動した状態で、E2E とアクセシビリティ検査を実行（`e2e/README.md`） |

## 環境変数

| 名前                                                                | 用途                                                                                         |
| ------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| `DATABASE_URL`                                                      | 開発用 SQLite                                                                                |
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase（ログイン機能の実装時に使う。公開しても良い値のみ）                                 |
| `NEXT_PUBLIC_SITE_URL`                                              | 公開URL。**本番では必ず設定**（canonical・OGP・sitemap に使う。未設定だと localhost を指す） |

## 公開前のチェック

- `NEXT_PUBLIC_SITE_URL` を設定する
- 利用規約・プライバシーポリシー（`/terms`・`/privacy`）を、運営者が確認する（法的助言ではない）
- ログイン機能を公開する前に、保存する情報・保存先・削除方法をプライバシーポリシーに追記する
- 既知の課題: CSP 未対応、API のレート制限はプロセス内（複数インスタンスでは共有されない）、キーボード・スクリーンリーダーの手動確認が未実施。詳細は [ADR 0008](docs/adr/0008-public-site-hardening-and-e2e.md)

## 設計と運用

- 設計判断: `docs/adr/`
- `.claude/`（rules / skills / agents / hooks）の配置理由: `docs/claude-layout.md`
- GitHub（CI・セキュリティ・ブランチ保護）: `docs/github-setup.md`
- 開発の原則・Definition of Done: `CLAUDE.md`
