---
applyTo: '.github/workflows/**,.github/actions/**'
---

# GitHub Actions の規約

<!--
  読む主体: Copilot（実行はされないテキスト指示）。ワークフローと composite action を編集するときだけ読ませる（applyTo で対象を限定）。
  ワークフローは本番やシークレットに触れ得る「最も権限の強いコード」なので、ルールを明文化して AI にも守らせる。
  ここに書いたルールの多くは CI の actionlint / zizmor でも機械的に検査されている（.github/workflows/workflow-lint.yml）。
-->

## 必須

- `uses:` はタグではなく 40 文字のコミット SHA で固定し、末尾に `# vX.Y.Z` を付ける（Dependabot が両方を更新する）
- ワークフロー先頭に `permissions:` を書き、最小権限にする（既定は `contents: read` か `{}`）。書き込みが必要な権限はジョブ単位で付け、理由をコメントする
- `actions/checkout` には `persist-credentials: false` を付ける（git push が必要な場合を除く）
- 全ジョブに `timeout-minutes` を付ける
- `run:` の中に `${{ github.event.* }}` などの外部入力を直接書かない。`env:` で受け取り、シェル変数として参照する（スクリプトインジェクション対策）
- `pull_request_target` / `workflow_run` では PR のコードを checkout・実行しない
- シークレットは `secrets.*` 経由でのみ扱い、ログに出さない

## 推奨

- PR 向けワークフローには `concurrency` を設定し、古い実行をキャンセルする
- 必須チェックに登録するワークフローには `paths` / `paths-ignore` を付けない（スキップされると Pending のまま残る）
- 新しいジョブを必須にしたい場合は、ruleset を変えずに `ci.yml` の `ci-success` の `needs` に追加する
- サードパーティ action を追加する前に、シェル数行で書けないか検討する
- 各設定には「なぜそうしたか」を日本語のコメントで書く
