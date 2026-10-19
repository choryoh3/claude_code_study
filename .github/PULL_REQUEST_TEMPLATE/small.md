<!--
  PR テンプレート【重要度: 小】
  - 読む主体: GitHub 本体（PR 作成画面の本文欄に挿入するだけ。Actions も Copilot も実行しない）。
  - 使う場面: typo・文言・ドキュメント・コメント・依存の軽微な更新・設定の微修正
    （目安: 数ファイル以内で、実行時の挙動が変わらない）。
    挙動が変わる、またはテストが要るなら medium.md を使う。判断基準の表は docs/github-setup.md の「PR テンプレートの選び方」。
  - 選び方: 作成画面の URL 末尾に `?template=small.md` を付ける（`gh pr create --template .github/PULL_REQUEST_TEMPLATE/small.md` でも可）。
  - タイトルは Conventional Commits 形式（例: docs: セットアップ手順の誤字を修正）。
-->

# 🟢 重要度: 小

## 何を・なぜ

<!-- 1〜2 行で。 -->

Closes #

## 確認したこと

<!-- 例: 表示を目視した / リンクが切れていない / `pnpm verify` が通った。 -->

- [ ] `pnpm verify` がローカルで通る（ドキュメントのみの変更は、`pnpm format:check` の確認でもよい）
- [ ] シークレット・個人情報を含めていない
