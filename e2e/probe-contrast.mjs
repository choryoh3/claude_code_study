// 調査用: axe が color-contrast を「要確認(incomplete)」にした要素の、理由別の内訳を出す。
// 機械で判定できない理由（背景がグラデーション・画像、要素の重なり、など）を知り、人が確認する範囲を絞るために使う。
// 使い方: node probe-contrast.mjs   （本番ビルドを起動しておく）
import axe from 'axe-core';
import { BASE, launchBrowser } from './lib.mjs';

const PAGES = ['/', '/roadmap', '/dashboard', '/cheatsheet', '/glossary', '/learn/basic/plan-mode'];
const browser = await launchBrowser();
/** 理由（axe のメッセージ） → { 件数, 例(セレクタ) } */
const reasons = new Map();

for (const scheme of ['light', 'dark']) {
  for (const [name, size] of [
    ['desktop', { width: 1280, height: 900 }],
    ['mobile', { width: 390, height: 844 }],
  ]) {
    const ctx = await browser.newContext({
      viewport: size,
      colorScheme: scheme,
      reducedMotion: 'reduce',
    });
    const page = await ctx.newPage();
    for (const url of PAGES) {
      await page.goto(BASE + url, { waitUntil: 'networkidle' });
      await page.waitForTimeout(500);
      await page.addScriptTag({ content: axe.source });
      const result = await page.evaluate(() =>
        globalThis.axe.run(document, { runOnly: { type: 'rule', values: ['color-contrast'] } }),
      );
      for (const item of result.incomplete) {
        for (const node of item.nodes) {
          const data = node.any.find((c) => c.id === 'color-contrast')?.data ?? {};
          const key = `${data.messageKey ?? 'unknown'}`;
          const entry = reasons.get(key) ?? { count: 0, examples: new Set() };
          entry.count += 1;
          if (entry.examples.size < 4)
            entry.examples.add(`${scheme}/${name} ${url}  ${node.target.join(' ').slice(0, 70)}`);
          reasons.set(key, entry);
        }
      }
    }
    await ctx.close();
  }
}
await browser.close();

console.log('color-contrast「要確認」の内訳（理由 → 件数）');
for (const [key, { count, examples }] of [...reasons].sort((a, b) => b[1].count - a[1].count)) {
  console.log(`\n■ ${key}: ${count}件`);
  for (const ex of examples) console.log(`    ${ex}`);
}
