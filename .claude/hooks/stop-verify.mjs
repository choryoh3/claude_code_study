// Stop hook: 応答を終える前に typecheck と test を実行し、失敗していれば Claude に修正させる。
// stop_hook_active が true のときは無限ループ防止のため何もしない。
import { spawnSync } from 'node:child_process';

function readStdin() {
  return new Promise((resolve) => {
    let data = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (chunk) => (data += chunk));
    process.stdin.on('end', () => resolve(data));
  });
}

const input = JSON.parse((await readStdin()) || '{}');
if (input.stop_hook_active) process.exit(0);

for (const script of ['typecheck', 'test']) {
  const r = spawnSync('pnpm', [script], { encoding: 'utf8', shell: true });
  if (r.status !== 0) {
    const tail = `${r.stdout}${r.stderr}`.split('\n').slice(-40).join('\n');
    console.error(`[stop-verify] pnpm ${script} が失敗しました。修正してください:\n${tail}`);
    process.exit(2);
  }
}
