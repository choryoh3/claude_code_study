# `.claude` の配置理由

CLAUDE.md を肥大化させないため、情報を「いつ読まれるか」で分けています。このリポジトリ自体が、アプリ内レッスンの題材になります。

| 置き場所                | 読まれるタイミング         | 入れるもの                                                     |
| ----------------------- | -------------------------- | -------------------------------------------------------------- |
| `CLAUDE.md`             | 毎回                       | 構成、コマンド、原則、Definition of Done、参照先               |
| `.claude/rules/*.md`    | 該当パスのファイルを扱う時 | パス別の規約（web / api / prisma / content / testing）         |
| `.claude/skills/*`      | 必要な時（説明で自動判定） | 手順が決まっている作業（レッスン追加、worktree運用など）       |
| `.claude/agents/*.md`   | 委譲した時                 | 役割別の専門エージェント。ツール権限は最小限                   |
| `.claude/settings.json` | ハーネスが毎回実行         | permissions と hooks。守らせたいことは文章でなく機械で強制する |
| `.mcp.json`             | 起動時                     | プロジェクトで共有するMCPサーバー                              |

## 判断基準

- 「必ず守らせたい」→ hooks / permissions（Claudeの判断に頼らない）
- 「毎回知っていてほしい短い方針」→ CLAUDE.md
- 「特定のパスでだけ必要」→ rules
- 「手順が決まっている」→ skills
- 「独立した視点や専門性が要る」→ agents

## このリポジトリのhooks

- `PreToolUse(Bash)`: `.claude/hooks/guard-bash.mjs` が `rm -rf`・force push・`.env` のコミットをブロック
- `PostToolUse(Edit|Write)`: `.claude/hooks/format.mjs` が prettier と eslint --fix を実行
- `Stop`: `.claude/hooks/stop-verify.mjs` が typecheck と test を実行し、失敗なら修正を促す
