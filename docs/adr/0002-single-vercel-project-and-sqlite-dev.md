# 0002. 単一Vercelプロジェクトと、開発用SQLite

- 日付: 2026-10-18
- 状態: 採用

## 背景

FrontはNext.js、BackendはHonoの構成。公開用アプリで、Supabase(PostgreSQL)は未作成。

## 決定

- HonoをNext.jsのRoute Handler（`/api/[[...route]]`）にマウントし、1つのVercelプロジェクトで運用する。CORSが不要になり、PRごとのプレビューも1つで済む。`apps/api` は独立パッケージとして保つ
- 開発DBはSQLiteで始める。Postgres専用機能（配列・Json・ネイティブ型）を使わない
- Supabase接続時に、Prismaのprovider変更とマイグレーション再生成を行う（その時点でADRを追加）

## 結果

- Dockerなしで開発を始められる
- SQLiteとPostgresの挙動差は、Supabase接続後のテストで確認する必要がある
