# 役割

あなたはシニアフルスタックエンジニア兼テクニカルライター兼UI/UXデザイナーです。
「Claude Codeを基礎→中級→上級まで体系的に学べる、感動的なUIの学習Webアプリ」を、
このリポジトリ(claude_code_study)にゼロから構築してください。

# 進め方（最重要）

1. まず実装せず、Plan Modeで計画だけ提示してください。計画には次を含めます。


    - フォルダ構成 / DBスキーマ / API設計 / 画面一覧 / カリキュラム目次
    - フェーズ分割と、各フェーズの「完了条件（検証コマンド）」
    - 並列化できるタスクと、順序依存のタスクの切り分け

2. 私が承認してからフェーズ0から順に実装してください。
3. 各フェーズ終了時に、lint / typecheck / test / build をすべて通し、結果を報告してください。
   失敗を隠さず、原因と対処を書くこと。
4. 次の外部影響のある操作は、実行前に必ず私へ確認してください。


    - Supabaseプロジェクト作成
    - Vercelプロジェクト作成・デプロイ
    - GitHubへのリポジトリ作成・push
    - 破壊的操作、シークレットの取り扱い
    （gitのローカルコミットと、ブランチ・PR作成は常識の範囲で自由に実行してよい）

# アプリの目的と対象

- 目的: Claude Codeを最高に使いこなせる状態になること。
- 対象: 日本語話者のエンジニア。初心者→中級→上級まで段階的に学ぶ。
- 公開範囲: 不特定多数への公開を前提とする。次を計画に含めること。
  - Supabase Authによるログイン、ゲスト学習（ログインなしの進捗保存）
  - レート制限、個人情報の最小化
  - 利用規約・プライバシーポリシーページ
- 学習設計: 読む→試す→確認する→定着する、の循環にする。
  - レッスン（図解付き解説）
  - ハンズオン課題（ターミナル操作を疑似体験できるコードブロック）
  - クイズ（zodで採点）
  - 進捗・実績バッジ・学習ストリーク
  - チートシート、用語集、全文検索

## カリキュラム（最新の公式ドキュメントを確認して正確に書くこと）

- 基礎: インストール、基本操作、スラッシュコマンド、権限モード、Plan Mode、コンテキスト管理、CLAUDE.md
- 中級: settings.json（permissions / hooks / env）、skills、subagents、rules、MCP、
  メモリ、gitワークフロー、worktree、ヘッドレス実行
- 上級: 並列実装（subagent / worktree）、ハーネスエンジニアリング
  （hooks・テスト・CIによる自己検証ループ）、カスタムskill / agent設計、
  MCP自作、CI連携、コスト・コンテキスト最適化、チーム運用
- 各レッスンは「ゴール / 前提 / 解説 / ハンズオン / よくある失敗 / クイズ / 次へ」の
  固定フォーマットとし、コンテンツはMDX等でコードと分離して管理する。
- 不確かな仕様は推測で書かず、公式ドキュメント（WebFetch / claude-code-guide agent）で確認すること。

# 技術スタック（固定）

- Frontend: Next.js (App Router) + TypeScript(strict)
- Backend: Hono（API。zod-validatorで入力検証、型安全なRPCクライアントを利用）
- ORM: Prisma / バリデーション: zod（フロントとAPIでスキーマを共有）
- DB: Supabase(PostgreSQL + Auth)。※まだプロジェクト未作成。作成前に私へ確認し、
  それまではローカル開発可能な構成にしておくこと
- Hosting: Vercel（FrontとHonoを同一Vercelプロジェクトにまとめられるか比較し、推奨案を提示）
- Lint/Format: ESLint(flat config) + Prettier
- Package manager: pnpm（モノレポ運用）
- Test: Vitest（ユニット/統合）。E2EはPlaywright MCPで画面確認
- GitHub: https://github.com/choryoh3 配下に `claude_code_study` として作成予定

# フォルダ構成

pnpm workspaces。たとえば次のようにします（最終案は計画で提示）。

```
claude_code_study/
├─ .claude/
│  ├─ settings.json      # permissions / hooks / env
│  ├─ skills/            # 繰り返しワークフロー（例: new-lesson, add-api-route, review-ui）
│  ├─ agents/            # 専門subagent（例: frontend, api, db, content-writer, reviewer, qa）
│  └─ rules/             # パス別ルール（web/api/prisma/content/testing）
├─ .mcp.json             # Playwright / Supabase / その他
├─ CLAUDE.md             # 基本方針のみ。100行程度に抑える
├─ apps/
│  ├─ web/               # Next.js
│  └─ api/               # Hono
├─ packages/
│  ├─ db/                # Prisma schema & client
│  ├─ schemas/           # 共有zodスキーマ
│  ├─ content/           # カリキュラム(MDX)
│  └─ config/            # eslint / tsconfig / prettier 共有設定
├─ docs/                 # ADR、設計メモ
└─ .github/workflows/    # CI(lint / typecheck / test / build)
```

# .claude の設計方針（CLAUDE.mdを肥大化させない）

- CLAUDE.md: プロジェクト概要、コマンド一覧、アーキテクチャ原則、
  Definition of Done、他ファイルへの参照のみ。詳細は書かない。
- rules/: パス別の規約（`paths` で対象を限定し、該当ファイル編集時のみ読ませる）
- skills/: 手順が決まっている作業（レッスン追加、APIルート追加、マイグレーション手順など）
- agents/: 役割ごとの専門subagent。ツール権限は最小限にする
- settings.json:
  - permissions: allow（pnpm / git / vitest等）、ask、deny（.env読取、`rm -rf`、本番DB操作、force push）
  - hooks: 編集後にprettier+eslint --fix、停止時にtypecheck+testを実行、
    `.env`・シークレットのコミット防止、危険コマンドのブロック
- これらがなぜその配置なのかを docs/ に短く説明し、アプリ内の教材にも流用すること
  （このリポジトリ自体が生きた教材になる）

# MCP

- 使うもの: Playwright MCP（UI確認・E2E・スクリーンショット）、Supabase MCP
  （スキーマ/SQL確認。本番に影響する操作は必ず確認、可能なら読み取り専用）、
  必要ならContext7等のドキュメント参照系。
- 追加するMCPは、目的・権限・リスクを一覧で提示し、私の承認を得てから導入すること。
- MCPのスコープ（project / user）の使い分けも説明すること。

# 並列実装 & ハーネスエンジニアリング

- 並列化: 依存のない作業（web / api / db / content）を、
  subagentまたはgit worktreeで並列実行する設計にし、
  worktree運用手順（作成→作業→PR→マージ→削除）をskill化すること。
- 競合防止: ファイル所有範囲（パッケージ境界）をagentごとに明確化し、
  共有スキーマ(packages/schemas)は先に確定させてから並列に入ること。
- ハーネス:
  - 「Claudeが自分で正しさを検証できる環境」を整える
    （高速なtest、型、lint、E2E、スクリーンショット比較）。
  - 完了条件を機械的に判定できるスクリプトを用意する（例: `pnpm verify` = lint+typecheck+test+build）。
  - reviewer agentが、実装agentとは独立した視点で差分をレビューする。
  - CIで同じ検証を回し、PRごとにプレビューデプロイできるようにする。
- この仕組み自体を上級カリキュラムの教材として記述すること。

# UI/UX要件（感動品質）

- デザインシステムを先に定義する（カラー、タイポ、スペーシング、角丸、影、モーション）。
- ライト/ダーク対応、完全レスポンシブ（モバイルファースト）。
- 学習体験:
  - 学習ロードマップを視覚化（Basic→Intermediate→Advanced のスキルツリー風）
  - 進捗リング、達成時の控えめで気持ちよいアニメーション、バッジ
  - ターミナル風のインタラクティブなコードブロック（コピー、ステップ実行風）
  - コマンドパレット（⌘K）による検索、キーボード操作
  - 「次にやること」を常に1つだけ明示し、迷わせない
- 品質: Lighthouse 90+、WCAG AA、`prefers-reduced-motion` 尊重、日本語フォントの最適化、
  空/ロード/エラー状態の丁寧な設計。
- フェーズごとにPlaywright MCPでスクリーンショットを撮って自己評価し、改善すること。

# 開発フェーズ（各フェーズ末で verify と私へのレビュー）

0. 基盤: monorepo、共有設定、.claude一式、CLAUDE.md、CI、`pnpm verify`
1. データ層: Prisma schema、zodスキーマ、シード、（承認後）Supabase接続
2. API: Honoのルート（レッスン、進捗、クイズ採点）+ Vitest
3. コンテンツ基盤: MDXパイプライン + 基礎カリキュラム
4. UI: デザインシステム、レッスン画面、ダッシュボード、ロードマップ
5. 学習機能: クイズ、進捗保存、バッジ、検索、チートシート
6. 中級・上級コンテンツの拡充（並列実行）
7. 仕上げ: アクセシビリティ、パフォーマンス、E2E、（承認後）Vercelデプロイ、README

# 品質基準（Definition of Done）

- TypeScript strictでエラー0、any禁止（必要時は理由をコメント）
- 新規ロジックにはVitestテスト、APIは入出力をzodで検証
- コミットは小さく、Conventional Commits
- 秘密情報は `.env*` に置き、リポジトリに含めない（`.env.example` を用意）
- 重要な設計判断は docs/adr/ に記録する

# 最初のアクション

Plan Modeで次を提示してください。

1. 上記要件の曖昧点・リスク、およびそれに対する私への質問（最大5つ）
2. フォルダ構成・技術選定の最終案（Vercelのデプロイ構成案を含む）
3. フェーズ0〜7の詳細計画と、並列化の方針
   承認後にフェーズ0を開始してください。
