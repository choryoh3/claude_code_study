---
name: new-lesson
description: 学習アプリに新しいレッスン(MDX)を追加する。レッスンやクイズを書く・追加するときに使う。
---

# 新しいレッスンを追加する

引数: レベル(basic|intermediate|advanced)とトピック名。

1. `.claude/rules/content.md` を読み、規約を確認する
2. トピックに関するClaude Codeの公式ドキュメントを確認する（`claude-code-guide` agent または WebFetch）。不確かな点は書かない
3. `packages/content/lessons/<level>/<NN>-<slug>.mdx` を作る。frontmatterに `verifiedAt`（今日の日付）を入れる
4. 本文のH2を「ゴール / 前提 / 解説 / ハンズオン / よくある失敗 / 次へ」の順で書く
5. クイズは frontmatter の `quiz` に3〜5問書く（`choices` はブロック形式、正解位置を偏らせない）
6. 前後のレッスンの「次へ」リンク（`/learn/<level>/<slug>`）を更新する
7. `pnpm vitest run packages/content` で形式を検証し、失敗があれば直す
