# 0004. Playwright MCP は npx を使わず node で直接起動する

- 日付: 2026-10-19
- 状態: 採用

## 背景

`.mcp.json` の `npx -y @playwright/mcp@latest` が、Claude Code の接続待ち(30秒)を超えて失敗していた。
計測では、この開発環境(Windows)の `npx --version` だけで約46秒、`--offline` でも約2分かかった。
ネットワークではなく npx(npm CLI)の起動処理そのものが遅い。MCPサーバー自体は正常で、
node で直接起動すれば約7秒でMCPの初期化に成功した。

## 決定

- `@playwright/mcp` をルートの devDependency に固定バージョンで入れる
- `.mcp.json` は `node node_modules/@playwright/mcp/cli.js` で起動する(npx を使わない)

## 結果

- 接続が30秒以内に収まる。`@latest` ではなく固定なので、更新は意図して行う
- `pnpm install` 済みであることが前提になる
- project スコープの変更は、対話セッションでの再承認が必要
