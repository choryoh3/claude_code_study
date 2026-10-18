---
name: worktree-flow
description: git worktreeで並列作業する手順（作成→作業→PR→マージ→削除）。並列実装や独立した作業を分けたいときに使う。
---

# worktree運用手順

担当範囲はパッケージ境界で分ける（例: `apps/api` / `apps/web` / `packages/content`）。`packages/schemas` は並列に入る前に確定させる。

1. **作成**: `git worktree add .claude/worktrees/<name> -b feat/<name>`
2. **作業**: worktree内で担当範囲のファイルだけを編集する。他の範囲が必要なら作業を止めて相談する
3. **検証**: worktree内で `pnpm install`（初回）と `pnpm verify`
4. **PR**: Conventional Commitsでコミットし、`gh pr create`（pushは事前確認が必要）
5. **レビュー**: `reviewer` agentに差分を独立レビューさせる
6. **マージ後に削除**: `git worktree remove .claude/worktrees/<name>` と `git branch -d feat/<name>`
