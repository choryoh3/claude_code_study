---
name: new-lesson
description: 学習アプリに新しいレッスン(MDX)を追加する。レッスンやクイズを書く・追加するときに使う。
---

# 新しいレッスンを追加する

引数: レベル(basic|intermediate|advanced)とトピック名。

1. `.claude/rules/content.md` を読み、規約を確認する
2. トピックに関するClaude Codeの公式ドキュメントを確認する（`claude-code-guide` agent または WebFetch）。不確かな点は書かない
3. `packages/content/<level>/<order>-<slug>.mdx` を作る。frontmatterに `verifiedAt`（今日の日付）を入れる
4. 「ゴール / 前提 / 解説 / ハンズオン / よくある失敗 / クイズ / 次へ」の順で本文を書く
5. クイズは `packages/schemas` のクイズスキーマに合う形で3〜5問付ける
6. 前後のレッスンの「次へ」リンクを更新する
7. `pnpm verify` を実行し、失敗があれば直す
