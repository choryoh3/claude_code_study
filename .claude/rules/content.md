---
paths:
  - 'packages/content/**'
---

# packages/content の規約

- ファイル名は `lessons/<level>/NN-slug.mdx`（NN は2桁。frontmatter の `order` と一致させる）
- 本文のH2見出しは「ゴール / 前提 / 解説 / ハンズオン / よくある失敗 / 次へ」を、この順で1回ずつ。クイズは本文でなく frontmatter の `quiz` に書く（3〜5問）
- frontmatter: `title`, `level`(basic|intermediate|advanced), `order`, `summary`, `verifiedAt`(公式ドキュメントを確認した日), `quiz`
- Claude Codeの仕様・コマンド・設定キーは公式ドキュメント（https://code.claude.com/docs/）で確認してから書く。不確かなら書かない
- 日本語で書く。コマンド・ファイル名・設定キーはコードブロックか `code` にする
- ハンズオンはコピーして実行できる形にし、期待される結果も書く

## YAML と MDX の落とし穴（`pnpm test` の検証で実際に起きたもの）

- frontmatter の値が `` ` `` で始まる、または `: ` を含むときは、二重引用符で囲む
- `choices` は1行1項目のブロック形式（`- 選択肢`）で書く。`[a、b、c]` のように読点で区切ると、1つの文字列になる（YAMLの区切りは ASCII の `,`）
- 本文の波括弧 `{ }` と、タグ以外の `< >` は、必ずインラインコードかコードブロックの中に入れる
- クイズの正解位置（`answerIndex`）は偏らせない。「どちらも正しい」系の選択肢は最後に置く
- 書き終えたら `pnpm vitest run packages/content` で形式を検証する
