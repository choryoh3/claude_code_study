---
paths:
  - 'packages/content/**'
---

# packages/content の規約

- 各レッスンは「ゴール / 前提 / 解説 / ハンズオン / よくある失敗 / クイズ / 次へ」の順で書く
- frontmatter: `title`, `level`(basic|intermediate|advanced), `order`, `summary`, `verifiedAt`(公式ドキュメントを確認した日)
- Claude Codeの仕様・コマンド・設定キーは公式ドキュメントで確認してから書く。不確かなら書かない
- 日本語で書く。コマンド・ファイル名・設定キーはコードブロックか `code` にする
- ハンズオンはコピーして実行できる形にし、期待される結果も書く
- クイズは1レッスン3〜5問。正解と解説を持たせる
