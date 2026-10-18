# claude_code_study

Claude Codeを基礎→中級→上級で学べる、公開用の学習Webアプリ。元の要件は `PROMPT.md`、承認済みの設計は `docs/` を参照。

## 構成

- `apps/web`: Next.js (App Router)。Honoを `/api/[[...route]]` にマウントする（単一Vercelプロジェクト）
- `apps/api`: Hono（zod-validator、RPC型をexport）
- `packages/schemas`: 共有zodスキーマ（web/apiの契約。最初に確定させる）
- `packages/db`: Prisma（開発はSQLite、本番はSupabase Postgres予定）
- `packages/content`: MDXカリキュラム
- `packages/config`: eslint / tsconfig / prettier の共有設定

## コマンド

- `pnpm verify`: format:check + lint + typecheck + test + build。完了の判定基準
- `pnpm test` / `pnpm lint` / `pnpm typecheck` / `pnpm build` / `pnpm format`
- 個別実行: `pnpm --filter <package> <script>`

## 原則

- TypeScript strict、`any` 禁止（やむを得ない場合は理由をコメント）
- APIの入出力は必ずzodで検証し、スキーマは `packages/schemas` に置く
- コンテンツ（MDX）とコードを分離する。レッスン本文をDBに入れない
- Claude Codeの仕様は推測で書かない。公式ドキュメントで確認し、確認日をfrontmatterに記録する
- 公開アプリ: 個人情報は最小限（GitHubのid・表示名・アバターのみ）。APIにレート制限を入れる
- 秘密情報は `.env*` のみ。コミット禁止（`.env.example` は可）

## Definition of Done

1. `pnpm verify` が通る
2. 新規ロジックにVitestのテストがある
3. UI変更はPlaywright MCPでスクリーンショットを確認した
4. 重要な設計判断は `docs/adr/` に記録した
5. コミットはConventional Commits

## 事前確認が必要な操作

Supabase/Vercelのプロジェクト作成、GitHubリポジトリ作成・push、MCPの追加、シークレットの扱い、破壊的操作。

## 詳細の置き場所

- パス別の規約: `.claude/rules/`
- 手順化した作業: `.claude/skills/`
- 専門エージェント: `.claude/agents/`
- 権限とhooks: `.claude/settings.json`（配置理由は `docs/claude-layout.md`）
