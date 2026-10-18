// 完了条件を機械的に判定する検証スクリプト。ローカルでもCIでも同じものを使う。
// 使い方: pnpm verify
import { spawnSync } from 'node:child_process';

const steps = [
  ['format', ['pnpm', 'format:check']],
  ['lint', ['pnpm', 'lint']],
  ['typecheck', ['pnpm', 'typecheck']],
  ['test', ['pnpm', 'test']],
  ['build', ['pnpm', 'build']],
];

const results = [];
for (const [name, cmd] of steps) {
  console.log(`\n▶ ${name}: ${cmd.join(' ')}`);
  const started = Date.now();
  const { status } = spawnSync(cmd[0], cmd.slice(1), { stdio: 'inherit', shell: true });
  const ok = status === 0;
  results.push({ name, ok, sec: ((Date.now() - started) / 1000).toFixed(1) });
  if (!ok) break;
}

console.log('\n── verify summary ──');
for (const { name, ok, sec } of results) {
  console.log(`${ok ? '✔' : '✘'} ${name} (${sec}s)`);
}
const failed = results.some((r) => !r.ok);
if (failed) {
  console.error('\nverify: FAILED');
  process.exit(1);
}
console.log('\nverify: OK');
