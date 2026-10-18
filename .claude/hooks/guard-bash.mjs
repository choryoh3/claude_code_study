// PreToolUse(Bash) hook: 危険なコマンドとシークレットのコミットをブロックする。
// exit 2 で拒否し、stderr の内容が Claude にフィードバックされる。
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ENV_FILE = /(^|\/)\.env(\.(?!example$)[^/]*)?$/;

const DANGEROUS = [
  [/\brm\s+(-[a-zA-Z]*r[a-zA-Z]*f|-[a-zA-Z]*f[a-zA-Z]*r)\b/, 'rm -rf は禁止です'],
  [/\bgit\s+push\b.*(--force\b|--force-with-lease\b|\s-f\b)/, 'force push は禁止です'],
  [/\bgit\s+reset\s+--hard\b/, 'git reset --hard は事前確認が必要です'],
  [/\bgit\s+add\b.*\s(-f|--force)\b/, 'git add --force は禁止です'],
];

/**
 * @param {string} command 実行しようとしているBashコマンド
 * @param {string[]} stagedFiles ステージ済みファイル一覧
 * @returns {string | null} 拒否理由。許可なら null
 */
export function checkCommand(command, stagedFiles = []) {
  for (const [pattern, reason] of DANGEROUS) {
    if (pattern.test(command)) return reason;
  }
  if (/\bgit\s+add\b/.test(command) && /(^|\s)\.env(\.(?!example\b)\S*)?(\s|$)/.test(command)) {
    return '.env ファイルは git add できません（.env.example を使ってください）';
  }
  if (/\bgit\s+commit\b/.test(command)) {
    const leaked = stagedFiles.filter((f) => ENV_FILE.test(f));
    if (leaked.length > 0) {
      return `シークレットを含む可能性のあるファイルがステージされています: ${leaked.join(', ')}`;
    }
  }
  return null;
}

function readStdin() {
  return new Promise((resolve) => {
    let data = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (chunk) => (data += chunk));
    process.stdin.on('end', () => resolve(data));
  });
}

async function main() {
  const input = JSON.parse((await readStdin()) || '{}');
  const command = input?.tool_input?.command ?? '';
  let staged = [];
  if (/\bgit\s+commit\b/.test(command)) {
    const out = spawnSync('git', ['diff', '--cached', '--name-only'], { encoding: 'utf8' });
    staged = (out.stdout ?? '').split('\n').filter(Boolean);
  }
  const reason = checkCommand(command, staged);
  if (reason) {
    console.error(`[guard-bash] ブロック: ${reason}`);
    process.exit(2);
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await main();
}
