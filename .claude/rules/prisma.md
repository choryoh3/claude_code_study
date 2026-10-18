---
paths:
  - 'packages/db/**'
---

# packages/db の規約

- 開発はSQLite、本番はSupabase(PostgreSQL)予定。移行しやすいよう、Postgres専用機能（配列・Json・ネイティブ型）を使わない
- 配列やJSONは文字列として保存し、読み書きはzodで検証する
- `prisma migrate reset` や `db push --force-reset` は禁止（permissionsでdeny済み）
- スキーマ変更時はマイグレーションとseedを更新し、`pnpm --filter db test` を通す
- ユーザー関連の列は最小限にする（個人情報を増やさない）
