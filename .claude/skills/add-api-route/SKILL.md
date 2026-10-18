---
name: add-api-route
description: Hono APIに新しいルートを追加する。エンドポイントの追加・変更のときに使う。
---

# APIルートを追加する

1. `packages/schemas` に入出力のzodスキーマを追加する（先に契約を決める）
2. 先に失敗するテストを `apps/api` に書く（`app.request()` を使う）
3. `apps/api/src/routes/<feature>.ts` にルートを実装し、`zValidator` で入力を検証する
4. 書き込み系はレート制限ミドルウェアを通す。ゲストの扱いを明示する
5. ルートをアプリに登録し、RPC型のexportが壊れていないか確認する
6. `pnpm verify` を実行する
