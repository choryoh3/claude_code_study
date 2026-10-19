<!--
  コントリビューションガイド
  - 読む主体: GitHub 本体（Issue / PR 作成画面にリンクを出す）。Actions も Copilot も関与しない。
  - .github/CONTRIBUTING.md に置くと、Issue / PR 作成画面にリンクが表示される。
  - 詳細な規約は CLAUDE.md と .claude/rules/ にあり、ここでは「流れ」だけを書く（二重管理を避けるため）。
-->

# コントリビューションガイド

## 開発の流れ

1. Issue を作成（または既存の Issue を選ぶ）
2. `main` からブランチを作成する。命名は `feat/<name>`・`fix/<name>`・`docs/<name>` など
   - 接頭辞から PR に `enhancement` / `bug` ラベルが自動で付きます
3. 実装し、ローカルで `pnpm verify` を通す
4. PR を作成する。タイトルは [Conventional Commits](https://www.conventionalcommits.org/ja/v1.0.0/) 形式
   - 例: `feat(api): 進捗APIを追加`、`fix(web): ダークモードの配色を修正`
   - 本文は変更の**重要度（大・中・小）**に合ったテンプレートを使う。何も指定しなければ既定の「中」が出る想定
     - 大（破壊的変更・DB・認証/セキュリティ・CI/CD・広範囲。迷ったらこちら）: 作成画面の URL 末尾に `?template=large.md`
     - 中（通常の機能追加・バグ修正。既定）: 指定なし
     - 小（typo・文言・ドキュメント・軽微な依存更新）: URL 末尾に `?template=small.md`
     - CLI の場合: `gh pr create --template .github/PULL_REQUEST_TEMPLATE/large.md`
     - 判断基準の表: `docs/github-setup.md` の「PR テンプレートの選び方」
5. CI（必須チェック）とレビュー（人 + Copilot code review）を通過したら squash マージ

## マージの条件

`main` は ruleset で保護されています。次をすべて満たす必要があります。

- 必須チェックの成功: `ci-success`・`pr-title`・`dependency-review`・`actionlint`・`zizmor`
- Code Owner の承認 1 件以上（最後の push 後の承認であること）。Copilot code review の結果は、既定では承認数に数えられない
- レビューコメントのスレッドがすべて解決済み
- CodeQL で重大度 High 以上のアラートがないこと

## 規約の参照先

- プロジェクト全体の原則・Definition of Done: `CLAUDE.md`
- パス別の規約: `.claude/rules/`
- 設計判断の記録: `docs/adr/`
- GitHub 設定の全体像と理由: `docs/github-setup.md`
