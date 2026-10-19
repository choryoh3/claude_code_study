# 0009. GitHub リポジトリのガバナンス（CI・セキュリティ・Copilot）

- 日付: 2026-10-19
- 状態: 採用

## 背景

公開リポジトリであり、Claude Code と Copilot（cloud agent / code review）という AI エージェントもコードを変更する。人と AI のどちらが書いたコードでも、同じ品質・セキュリティの基準を機械的に通過させたい。また、この設定は他のプロジェクトにも流用できる形にしたい。

## 決定

- **ローカルと CI で同じ検証コマンド**（`pnpm verify`）を使う。セットアップは composite action（`.github/actions/setup`）に集約し、CI と Copilot の作業環境で共有する
- **必須チェックは集約ジョブ `ci-success` に一本化**し、CI のジョブ構成の変更で ruleset を触らなくて済むようにする
- **squash マージのみ**とし、PR タイトルを Conventional Commits で検査する。コミット単位の規約は課さない
- **サプライチェーン対策**: action は SHA 固定、Dependabot に 7 日の cooldown、PR 時の Dependency Review、ワークフロー自体を actionlint と zizmor で検査
- **SAST**: CodeQL を advanced setup（ファイル管理）で、`security-extended` クエリと Actions 解析を有効にする
- **ブランチ保護は ruleset（JSON）で定義**し、リポジトリに保存してレビュー可能にする。適用は手動（インポート）
- **AI の変更も人の承認を必須**にする。Copilot code review は人のレビューの代替ではなく追加とする
- 一人開発で詰まらないよう、管理者には「PR 経由に限り」ルールの迂回を許可する。チーム化したら削除する

## 結果

- 設定ファイルが増え、管理対象が広がる。各ファイル先頭に目的と理由を書き、全体像を `docs/github-setup.md` にまとめて把握しやすくする
- ruleset やリポジトリ設定はファイルを置くだけでは適用されない。移植時は `docs/github-setup.md` の「手動で行う設定」を実施する必要がある
- 承認レビューが必須のため、Dependabot の自動マージも人の承認 1 回が必要になる（GitHub Actions に PR の承認を許すと、レビュー必須を迂回する経路になるため許可しない）
- `pr-title` と `dependency-review` は PR 専用のため、将来マージキューを導入する際は必須チェックの構成を見直す
