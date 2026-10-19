// E2E / アクセシビリティ検査で共有する部品。
// 事前に `pnpm --filter @claude-study/web build` と `pnpm --filter @claude-study/web start -p 3100` で、
// 本番ビルドを起動しておく。
// 環境変数:
//   BASE_URL   検査対象のURL（既定: http://localhost:3100）
//   OUT_DIR    スクリーンショットの保存先（既定: <リポジトリ>/evidence/e2e。evidence/ は git に含めない）
//   CHROME_EXE ブラウザの実行ファイル。未指定なら、playwright-core が探した既定のChromiumを使う
//              （`npx playwright install chromium` 済みであること）。
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';
import { parse } from 'yaml';

export const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const BASE = process.env.BASE_URL ?? 'http://localhost:3100';
export const OUT = process.env.OUT_DIR ?? path.join(REPO_ROOT, 'evidence', 'e2e');

/** 結果を集めて、最後に表示し、失敗があれば終了コード1にする */
export function createReporter() {
  const results = [];
  return {
    check(name, ok, detail = '') {
      results.push(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
    },
    finish() {
      console.log(results.join('\n'));
      const failed = results.filter((r) => r.startsWith('FAIL')).length;
      console.log(`\n${results.length - failed} passed, ${failed} failed`);
      process.exit(failed > 0 ? 1 : 0);
    },
    abort(error) {
      console.log(results.join('\n'));
      console.error('ABORTED', error?.message ?? error);
      process.exit(2);
    },
  };
}

export async function launchBrowser() {
  fs.mkdirSync(OUT, { recursive: true });
  return chromium.launch({ executablePath: process.env.CHROME_EXE || undefined });
}

/** レッスンのクイズ（正解の文言つき）を、ファイルから読む */
export function loadQuiz(level, file) {
  const src = fs.readFileSync(
    path.join(REPO_ROOT, 'packages', 'content', 'lessons', level, file),
    'utf8',
  );
  const frontmatter = /^---\r?\n([\s\S]*?)\r?\n---/.exec(src)[1];
  return parse(frontmatter).quiz.map((q) => ({
    prompt: q.prompt,
    correct: q.choices[q.answerIndex],
    all: q.choices,
  }));
}

/** ハイドレーション前のクリックは取りこぼされるので、問題が出るまでクリックを再試行する */
export async function startQuiz(page) {
  const button = page.getByRole('button', { name: /もう一度挑戦する|クイズに挑戦する/ }).first();
  for (let i = 0; i < 8; i++) {
    // 遅れて効いた前回のクリックで、すでに始まっていることがある（その場合ボタンは消えている）
    if ((await page.locator('fieldset').count()) > 0) return;
    if ((await button.count()) > 0) await button.click({ timeout: 5000 }).catch(() => {});
    try {
      await page.locator('fieldset').first().waitFor({ timeout: 6000 });
      return;
    } catch {
      /* もう一度押す */
    }
  }
  throw new Error('クイズが開始できませんでした');
}

/** ハイドレーション前のキー入力も取りこぼされるので、開くまで再試行する */
export async function openPalette(page, via = 'keyboard') {
  const dialog = page.getByRole('dialog', { name: '検索' });
  for (let i = 0; i < 15 && !(await dialog.isVisible()); i++) {
    if (via === 'tap') await page.getByRole('button', { name: /検索を開く/ }).tap();
    else await page.keyboard.press('Control+k');
    await page.waitForTimeout(700);
  }
  await dialog.waitFor({ timeout: 5000 });
  return dialog;
}
