// アクセシビリティ検査（axe-core）。主要ページ × ライト/ダーク × デスクトップ/モバイルを検査し、
// WCAG 2.x A / AA の違反が1件でもあれば、終了コード1で失敗する。
// 「要確認（incomplete）」は、機械では判定できないもの。件数だけ表示し、失敗にはしない（人が確認する）。
import axe from 'axe-core';
import path from 'node:path';
import { BASE, OUT, launchBrowser, openPalette, startQuiz } from './lib.mjs';

const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

const PAGES = [
  '/',
  '/roadmap',
  '/dashboard',
  '/cheatsheet',
  '/glossary',
  '/badges',
  '/terms',
  '/privacy',
  '/learn/basic/plan-mode',
  '/learn/intermediate/settings',
  '/learn/advanced/build-mcp',
  '/does-not-exist', // 404ページ
];

const VIEWS = [
  { name: 'desktop', size: { width: 1280, height: 900 } },
  { name: 'mobile', size: { width: 390, height: 844 } },
];

/** 画面の操作で出る状態（クイズの回答中、検索パレットを開いた状態）も検査する */
const STATES = [
  {
    name: 'quiz-answering',
    url: '/learn/basic/plan-mode',
    prepare: async (page) => startQuiz(page),
  },
  {
    name: 'palette-open',
    url: '/',
    prepare: async (page, view) => {
      const dialog = await openPalette(page, view === 'mobile' ? 'tap' : 'keyboard');
      await dialog.getByRole('combobox').fill('plan');
      await dialog.getByRole('option').first().waitFor({ timeout: 20000 });
    },
  },
];

const browser = await launchBrowser();
let violationCount = 0;
let incompleteCount = 0;
let runs = 0;
/** 機械では判定できなかった項目（ルールID → 件数と、最初の例）。人が確認する */
const incompleteByRule = new Map();

async function audit(page, label) {
  await page.addScriptTag({ content: axe.source });
  const result = await page.evaluate(
    (tags) => globalThis.axe.run(document, { runOnly: { type: 'tag', values: tags } }),
    TAGS,
  );
  runs += 1;
  incompleteCount += result.incomplete.length;
  for (const item of result.incomplete) {
    const entry = incompleteByRule.get(item.id) ?? { count: 0, example: '', help: item.help };
    entry.count += item.nodes.length;
    if (!entry.example) entry.example = `${label}: ${item.nodes[0]?.target.join(' ')}`;
    incompleteByRule.set(item.id, entry);
  }
  if (result.violations.length === 0) {
    console.log(
      `PASS  ${label}${result.incomplete.length ? `（要確認 ${result.incomplete.length}）` : ''}`,
    );
    return;
  }
  for (const v of result.violations) {
    violationCount += v.nodes.length;
    console.log(`FAIL  ${label} — [${v.impact}] ${v.id}: ${v.help}`);
    for (const node of v.nodes.slice(0, 3)) {
      console.log(`        ${node.target.join(' ')}`);
      console.log(`        ${node.html.replace(/\s+/g, ' ').slice(0, 140)}`);
      const summary = node.any[0]?.message ?? node.failureSummary?.split('\n')[1]?.trim();
      if (summary) console.log(`        → ${summary.replace(/\s+/g, ' ').slice(0, 200)}`);
    }
    if (v.nodes.length > 3) console.log(`        …ほか ${v.nodes.length - 3} 件`);
  }
}

for (const scheme of ['light', 'dark']) {
  for (const view of VIEWS) {
    const ctx = await browser.newContext({
      viewport: view.size,
      colorScheme: scheme,
      hasTouch: view.name === 'mobile',
      // アニメーション中の半透明の状態を検査して、コントラストを誤判定しないようにする
      reducedMotion: 'reduce',
    });
    const page = await ctx.newPage();

    for (const url of PAGES) {
      await page.goto(BASE + url, { waitUntil: 'networkidle' });
      await page.waitForTimeout(500); // ハイドレーションの完了待ち
      await audit(page, `${scheme}/${view.name} ${url}`);
    }
    for (const state of STATES) {
      await page.goto(BASE + state.url, { waitUntil: 'networkidle' });
      await state.prepare(page, view.name);
      await audit(page, `${scheme}/${view.name} ${state.name}`);
      await page.keyboard.press('Escape');
    }
    if (scheme === 'light' && view.name === 'desktop') {
      await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
      await page.screenshot({ path: path.join(OUT, 'a11y-home-desktop-light.png') });
    }
    await ctx.close();
  }
}

await browser.close();
console.log(
  `\n${runs} 件の検査（${TAGS.join(', ')}）: 違反 ${violationCount} 件、要確認 ${incompleteCount} 件`,
);
if (incompleteByRule.size > 0) {
  console.log('\n要確認（機械では判定できない。人が確認する）:');
  for (const [id, { count, example, help }] of incompleteByRule) {
    console.log(`  ${id}（${count}件）: ${help}\n    例: ${example}`);
  }
}
process.exit(violationCount > 0 ? 1 : 0);
