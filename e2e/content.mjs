// 教材（基礎・中級・上級）と i18n（辞書）の実操作確認: 言語属性、メタデータ、教材の構造、クイズ、チートシート、モバイル
import path from 'node:path';
import { BASE, OUT, createReporter, launchBrowser, openPalette, startQuiz } from './lib.mjs';

const { check, finish, abort } = createReporter();

try {
  const browser = await launchBrowser();
  const ctx = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    colorScheme: 'light',
    permissions: ['clipboard-read', 'clipboard-write'],
  });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => {
    if (m.type() === 'error' && !/404/.test(m.text())) {
      errors.push(`console: ${m.text().slice(0, 150)}`);
    }
  });
  const shot = (name) => page.screenshot({ path: path.join(OUT, name) });

  // ---- i18n: 言語属性とメタデータ（辞書由来） ----
  await page.goto(`${BASE}/roadmap`, { waitUntil: 'networkidle' });
  check(
    'i18n: <html lang> が ja',
    (await page.evaluate(() => document.documentElement.lang)) === 'ja',
  );
  check(
    'i18n: タイトルが「ロードマップ | Claude Code 学習ロードマップ」',
    (await page.title()) === 'ロードマップ | Claude Code 学習ロードマップ',
    await page.title(),
  );
  const description = await page.locator('meta[name="description"]').getAttribute('content');
  check(
    'i18n: メタ説明が辞書の文言',
    /Claude Codeを身につける学習の道すじ/.test(description ?? ''),
    description ?? '',
  );

  // ---- ロードマップ: 3レベルすべてが公開済み ----
  await page
    .getByRole('heading', { name: '基本操作と、安全に任せる考え方' })
    .waitFor({ timeout: 30000 });
  const counts = await page.locator('section[data-level]').evaluateAll((els) =>
    els.map((e) => ({
      level: e.getAttribute('data-level'),
      lessons: e.querySelectorAll('ol > li').length,
      planned: e.querySelectorAll('[data-status="planned"]').length,
    })),
  );
  check(
    'ロードマップ: 基礎9 / 中級9 / 上級7 のレッスン',
    JSON.stringify(counts.map((c) => c.lessons)) === '[9,9,7]',
    JSON.stringify(counts),
  );
  check(
    'ロードマップ: 「準備中」の項目が残っていない',
    counts.every((c) => c.planned === 0),
  );
  check(
    'ロードマップ: レベル見出しが辞書の文言',
    (await page.locator('main').innerText()).includes('設定と拡張で、自分仕様に育てる'),
  );
  await shot('content-roadmap-all-levels-desktop-light.png');
  await page
    .getByRole('heading', { name: '設定と拡張で、自分仕様に育てる' })
    .scrollIntoViewIfNeeded();
  await shot('content-roadmap-intermediate-desktop-light.png');

  // ---- 中級・上級の教材が開ける ----
  for (const [url, title] of [
    ['/learn/intermediate/settings', 'settings.json'],
    ['/learn/intermediate/mcp', 'MCP'],
    ['/learn/advanced/harness-engineering', 'ハーネス'],
    ['/learn/advanced/build-mcp', 'MCP'],
    ['/learn/advanced/team-operations', 'チーム運用'],
  ]) {
    const res = await page.goto(BASE + url, { waitUntil: 'domcontentloaded' });
    const h1 = await page.locator('h1').first().innerText();
    check(
      `教材: ${url} が開き、見出しに「${title}」`,
      res.status() === 200 && h1.includes(title),
      `${res.status()} ${h1}`,
    );
  }

  // ---- 教材の構造（目次・クイズ・次へ・前後ナビ）を、中級の1本で確認 ----
  await page.goto(`${BASE}/learn/intermediate/settings`, { waitUntil: 'networkidle' });
  const toc = await page.locator('nav[aria-label="目次"] a').allInnerTexts();
  check(
    '教材: 目次に 6見出し + クイズ が並ぶ',
    toc.length === 7 && toc.includes('クイズ') && toc.indexOf('クイズ') === toc.length - 2,
    toc.join(' / '),
  );
  const ids = await page.locator('main h2[id]').evaluateAll((els) => els.map((e) => e.id));
  check(
    '教材: 見出しIDが位置で付く（goal…next）',
    ['goal', 'prerequisites', 'explanation', 'hands-on', 'pitfalls', 'next'].every((id) =>
      ids.includes(id),
    ),
    ids.join(','),
  );
  check(
    '教材: 前後ナビ（前=基礎の最終 / 次=skills）',
    (await page.locator('nav[aria-label="前後のレッスン"] a').count()) === 2,
  );
  check('教材: メタデータのタイトルがレッスン名', (await page.title()).includes('settings.json'));
  check(
    '教材: 確認日が表示される',
    /公式ドキュメントで確認した日:\s*2026-10-19/.test(
      await page.locator('article > header').innerText(),
    ),
  );

  // ---- 中級のクイズが動く（API → 採点） ----
  await startQuiz(page);
  const n = await page.locator('fieldset').count();
  check('中級クイズ: 問題が表示される', n >= 3, `${n}問`);
  for (let i = 0; i < n; i++)
    await page.locator('fieldset').nth(i).locator('label').first().click();
  await page.getByRole('button', { name: '採点する' }).click();
  await page
    .getByRole('heading', { name: /問中 \d+問 正解|全問正解です！/ })
    .waitFor({ timeout: 30000 });
  check('中級クイズ: 採点結果と解説が表示される', (await page.getByText(/^正解:/).count()) === n);
  await shot('content-lesson-intermediate-quiz-desktop-light.png');

  // ---- 上級（MCP自作）のコードブロックがコピーできる ----
  await page.goto(`${BASE}/learn/advanced/build-mcp`, { waitUntil: 'networkidle' });
  const copyButton = page.getByRole('button', { name: 'コピー' }).first();
  await copyButton.waitFor({ timeout: 30000 });
  await copyButton.click();
  await page.getByText('コピーしました').first().waitFor({ timeout: 5000 });
  check(
    '上級: コードブロックのコピー',
    (await page.evaluate(() => navigator.clipboard.readText())).length > 0,
  );
  await shot('content-lesson-advanced-build-mcp-desktop-light.png');

  // ---- ダッシュボード: 3レベルとも件数つき ----
  await page.goto(`${BASE}/dashboard`, { waitUntil: 'networkidle' });
  await page.getByText('レベル別の進み具合').waitFor({ timeout: 30000 });
  const dashboard = await page.locator('main').innerText();
  check(
    'ダッシュボード: 全体 0 / 25 レッスン完了（基礎9+中級9+上級7）',
    /\/\s*25\s*レッスン完了/.test(dashboard),
    dashboard.match(/\/\s*\d+\s*レッスン完了/)?.[0] ?? '',
  );
  check('ダッシュボード: 「準備中」が表示されない', !dashboard.includes('準備中'));
  await shot('content-dashboard-desktop-light.png');

  // ---- チートシート・用語集: 拡充分 ----
  await page.goto(`${BASE}/cheatsheet`, { waitUntil: 'networkidle' });
  const sections = await page.locator('main section[id]').count();
  check('チートシート: 10セクション', sections === 10, `${sections}`);
  const items = await page.locator('dt').count();
  check('チートシート: 100項目以上', items >= 100, `${items}件`);
  await page.getByRole('searchbox').fill('hooks');
  await page.getByText(/件が見つかりました/).waitFor();
  check('チートシート: 中級の語（hooks）で絞り込める', (await page.locator('dt').count()) > 0);
  await page.getByRole('searchbox').fill('');
  await shot('content-cheatsheet-desktop-light.png');
  await page.goto(`${BASE}/glossary`, { waitUntil: 'networkidle' });
  const terms = await page.locator('dt').count();
  check('用語集: 40語以上', terms >= 40, `${terms}語`);

  // ---- バッジ: 日付が辞書（Intl）で整形される ----
  await page.goto(`${BASE}/badges`, { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => {
    localStorage.setItem(
      'claude-study:progress:v1',
      JSON.stringify({
        entries: {},
        studyDays: [],
        quiz: {},
        badges: { 'first-lesson': '2026-10-19T03:00:00.000Z' },
      }),
    );
  });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page
    .getByText(/に獲得/)
    .first()
    .waitFor({ timeout: 30000 });
  const earned = await page
    .getByText(/に獲得/)
    .first()
    .innerText();
  check(
    'バッジ: 獲得日が「2026年10月19日 に獲得」形式（Intlで整形）',
    /2026年10月19日\s*に獲得/.test(earned),
    earned,
  );
  check(
    'バッジ: 名前と説明が辞書の文言',
    (await page.locator('main').innerText()).includes('はじめの一歩'),
  );
  await shot('content-badges-desktop-light.png');

  // ---- 検索パレット: 中級の教材が全文検索で出る ----
  await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
  const dialog = await openPalette(page);
  await dialog.getByRole('combobox').fill('subagent');
  await dialog
    .getByRole('option', { name: /subagents/ })
    .first()
    .waitFor({ timeout: 20000 });
  check('パレット: 中級の教材（subagents）が全文検索で出る', true);
  await shot('content-palette-search-desktop-light.png');
  await page.keyboard.press('Escape');

  // ---- ホーム（辞書のリッチテキスト）とダーク/モバイル ----
  await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(3800); // ヒーローのアニメーションの完了待ち
  const h1 = await page.locator('h1').first().innerText();
  check(
    'ホーム: 見出しがリッチテキストで組み立てられる',
    h1.replace(/\s+/g, '') === 'ClaudeCodeを、任せられる相棒に育てる。',
    h1,
  );
  check('ホーム: 強調の<span>が付く', (await page.locator('h1 span').count()) === 2);
  const footerLink = await page.locator('footer a').first().getAttribute('href');
  check(
    'フッター: リッチテキストのリンク（公式ドキュメント）',
    footerLink === 'https://code.claude.com/docs/',
    footerLink ?? '',
  );
  await shot('content-home-desktop-light.png');

  const darkCtx = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    colorScheme: 'dark',
  });
  const darkPage = await darkCtx.newPage();
  await darkPage.goto(`${BASE}/roadmap`, { waitUntil: 'networkidle' });
  await darkPage.screenshot({ path: path.join(OUT, 'content-roadmap-desktop-dark.png') });
  await darkCtx.close();

  const mobileCtx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    colorScheme: 'light',
    hasTouch: true,
  });
  const mobile = await mobileCtx.newPage();
  for (const url of [
    '/',
    '/roadmap',
    '/dashboard',
    '/cheatsheet',
    '/glossary',
    '/badges',
    '/terms',
    '/privacy',
    '/learn/intermediate/settings',
    '/learn/advanced/build-mcp',
  ]) {
    await mobile.goto(BASE + url, { waitUntil: 'networkidle' });
    const over = await mobile.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    check(`モバイル: ${url} が横にはみ出さない`, over <= 0, over > 0 ? `${over}px` : '');
  }
  await mobile.goto(`${BASE}/learn/advanced/build-mcp`, { waitUntil: 'networkidle' });
  await mobile.screenshot({ path: path.join(OUT, 'content-lesson-advanced-mobile-light.png') });
  await mobile.goto(`${BASE}/roadmap`, { waitUntil: 'networkidle' });
  await mobile.screenshot({ path: path.join(OUT, 'content-roadmap-mobile-light.png') });
  await mobileCtx.close();

  check(
    'ページ内の例外・コンソールエラーなし',
    errors.length === 0,
    errors.join(' | ').slice(0, 300),
  );
  await browser.close();
  finish();
} catch (error) {
  abort(error);
}
