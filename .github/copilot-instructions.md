# Copilot への指示（リポジトリ共通）

<!--
  読む主体: Copilot（VS Code のチャット / cloud agent / code review）。Actions では実行されない「ただのテキスト指示」で、毎回読み込まれる。
  - 正（Single Source of Truth）は CLAUDE.md。ここには Copilot が特に必要とする要点と、
    CLAUDE.md には無い「コードレビューの観点」だけを書く。重複を増やすと、片方だけ更新されて矛盾するため。
  - 短く保つ。長い指示は重要な部分が埋もれ、守られにくくなる。
  - パス別の詳細は .github/instructions/*.instructions.md と .claude/rules/*.md に置く。
-->

## プロジェクト

Claude Code を基礎→中級→上級で学べる公開用の学習 Web アプリ。pnpm ワークスペースのモノレポ。

- `apps/web`: Next.js（App Router）。Hono を `/api/[[...route]]` にマウント
- `apps/api`: Hono（zod-validator、RPC 型を export）
- `packages/schemas`: web / api 共有の zod スキーマ（API の契約）
- `packages/db`: Prisma（開発は SQLite）
- `packages/content`: MDX カリキュラム

全体の原則・Definition of Done は `CLAUDE.md`、パス別の規約は `.claude/rules/` を必ず参照すること。指示が矛盾したら `CLAUDE.md` を優先する。

## 検証

- 完了判定は `pnpm verify`（format:check + lint + typecheck + test + build）。CI も同じコマンドを実行する
- 個別実行: `pnpm --filter <package> <script>`
- 新しいロジックには Vitest のテストを追加する

## 守ること

- TypeScript strict。`any` は使わない（やむを得ない場合は理由をコメント）
- API の入出力は必ず zod で検証し、スキーマは `packages/schemas` に置く
- レッスン本文（MDX）を DB に入れない
- Claude Code の仕様は推測で書かない。公式ドキュメントで確認する
- シークレットは `.env*` のみ。コード・テスト・ログ・PR 本文に書かない
- 個人情報は最小限（GitHub の id・表示名・アバターのみ）
- コミット・PR タイトルは Conventional Commits（例: `feat(api): ...`）

## コードレビューの観点

レビューコメントは日本語で書く。次の順で優先し、好みの問題（命名の細部・書き方の流儀）は指摘しない。

1. セキュリティ: 認可漏れ、入力未検証（zod を通っていない入力）、シークレットや個人情報の露出、レート制限の欠落
2. 正しさ: ロジックの誤り、境界値、エラー処理の欠落、非同期処理の取りこぼし
3. 契約: `packages/schemas` と実装・呼び出し側の不一致
4. テスト: 新しいロジックにテストが無い、テストが実装をなぞるだけで振る舞いを検証していない
5. 保守性: 重複、責務の混在、不要な依存の追加

指摘には「なぜ問題か」と「どう直すか」を添える。
