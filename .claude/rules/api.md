---
paths:
  - 'apps/api/**'
---

# apps/api の規約

- ルートは機能ごとにファイルを分け、`zValidator` で入力、zodスキーマで出力を検証する
- スキーマは `packages/schemas` からimportする。apps/api内で重複定義しない
- 認証は `AuthProvider` 抽象の裏に置く。未ログイン（ゲスト）の扱いを各ルートで明示する
- 公開APIなので、書き込み系にはレート制限ミドルウェアを必ず通す
- エラーは統一フォーマット `{ error: { code, message } }` で返し、内部情報を漏らさない
- ルートごとにVitestで `app.request()` を使ったテストを書く
