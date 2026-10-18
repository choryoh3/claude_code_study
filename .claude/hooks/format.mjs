// PostToolUse(Edit|Write) hook: 編集したファイルに prettier と eslint --fix を適用する。
// 修正できないlintエラーが残る場合のみ exit 2 で Claude にフィードバックする。
import { spawnSync } from 'node:child_process';

const FORMATTABLE = /\.(ts|tsx|js|jsx|mjs|cjs|json|md|mdx|css|yml|yaml)$/;
const LINTABLE = /\.(ts|tsx|js|jsx|mjs|cjs)$/;
const IGNORED =
  /(^|[\\/])(node_modules|\.next|dist|coverage|worktrees)[\\/]|PROMPT\.md$|pnpm-lock\.yaml$/;

function readStdin() {
  return new Promise((resolve) => {
    let data = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (chunk) => (data += chunk));
    process.stdin.on('end', () => resolve(data));
  });
}

function run(args) {
  return spawnSync('pnpm', ['exec', ...args], { encoding: 'utf8', shell: true });
}

const input = JSON.parse((await readStdin()) || '{}');
const file = input?.tool_input?.file_path;
if (!file || !FORMATTABLE.test(file) || IGNORED.test(file)) process.exit(0);

run(['prettier', '--write', `"${file}"`]);

if (LINTABLE.test(file)) {
  const lint = run(['eslint', '--fix', `"${file}"`]);
  if (lint.status !== 0) {
    console.error(`[format] eslint で修正できない問題があります:\n${lint.stdout}${lint.stderr}`);
    process.exit(2);
  }
}
