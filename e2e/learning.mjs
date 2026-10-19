// 学習機能の実操作確認: API / クイズ / バッジ / 検索パレット / チートシート / 用語集 / ダッシュボード / モバイル
import path from 'node:path';
import {
  BASE,
  OUT,
  createReporter,
  launchBrowser,
  loadQuiz,
  openPalette,
  startQuiz,
} from './lib.mjs';

const { check, finish, abort } = createReporter();

/** 画面に出ている問題に、答えを選ぶ（wrong: true なら、わざと間違える） */
async function answerAll(page, quiz, { wrong = false } = {}) {
  const sets = page.locator('fieldset');
  const n = await sets.count();
  for (let i = 0; i < n; i++) {
    const legend = await sets.nth(i).locator('legend').innerText();
    const q = quiz.find((x) => legend.includes(x.prompt));
    if (!q) throw new Error(`問題が見つかりません: ${legend}`);
    const label = wrong ? q.all.find((c) => c !== q.correct) : q.correct;
    await sets.nth(i).locator('label', { hasText: label }).first().click();
  }
  return n;
}

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
  const stored = async () =>
    JSON.parse(
      (await page.evaluate(() => localStorage.getItem('claude-study:progress:v1'))) ?? '{}',
    );
  const shot = (name) => page.screenshot({ path: path.join(OUT, name) });

  // ---------- API（ブラウザと同じ経路） ----------
  const apiGet = (p) =>
    page.evaluate(async (u) => {
      const r = await fetch(u);
      return { status: r.status, body: await r.text() };
    }, BASE + p);
  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
  const lessons = await apiGet('/api/lessons');
  check(
    'API: /api/lessons が25本返す（基礎9 + 中級9 + 上級7）',
    lessons.status === 200 && JSON.parse(lessons.body).length === 25,
  );
  const quizPublic = await apiGet('/api/quiz/install');
  check(
    'API: クイズ取得に正解・解説が含まれない',
    quizPublic.status === 200 && !/answerIndex|explanation/.test(quizPublic.body),
  );
  const search = await apiGet(`/api/search?q=${encodeURIComponent('Plan Mode')}`);
  check('API: 全文検索で plan-mode が先頭', JSON.parse(search.body)[0]?.slug === 'plan-mode');
  check('API: 検索語なしは400', (await apiGet('/api/search')).status === 400);
  check('API: ゲストの進捗は401', (await apiGet('/api/progress')).status === 401);
  check('API: 存在しないレッスンは404', (await apiGet('/api/lessons/nope')).status === 404);
  check(
    'API: 存在しないパスは404（統一形式）',
    /not_found/.test((await apiGet('/api/unknown')).body),
  );

  // ---------- クイズ: 満点 → バッジ ----------
  const planQuiz = loadQuiz('basic', '05-plan-mode.mdx');
  await page.goto(`${BASE}/learn/basic/plan-mode`, { waitUntil: 'domcontentloaded' });
  await startQuiz(page);
  check(
    'クイズ: 採点前は「採点する」が無効',
    await page.getByRole('button', { name: '採点する' }).isDisabled(),
  );
  const n = await answerAll(page, planQuiz);
  check(
    'クイズ: 全問に答えると「採点する」が有効',
    await page.getByRole('button', { name: '採点する' }).isEnabled(),
    `${n}問`,
  );
  await page.getByRole('button', { name: '採点する' }).click();
  await page.getByRole('heading', { name: '全問正解です！' }).waitFor({ timeout: 30000 });
  check('クイズ: 満点で「全問正解です！」', true);
  check(
    'クイズ: 結果の見出しにフォーカスが移る',
    await page.evaluate(() => document.activeElement?.tagName === 'H3'),
  );
  let progress = await stored();
  check(
    'クイズ: 最高得点が保存される',
    progress.quiz?.['plan-mode']?.score === n && progress.quiz['plan-mode'].total === n,
    JSON.stringify(progress.quiz),
  );
  await page.getByText('バッジを獲得しました').waitFor({ timeout: 10000 });
  check(
    'バッジ: 獲得のトーストが出る（全問正解）',
    (
      await page.locator('[role="status"]', { hasText: 'バッジを獲得しました' }).innerText()
    ).includes('全問正解'),
  );
  await shot('learning-quiz-result.png');
  progress = await stored();
  check('バッジ: quiz-perfect が記録される', !!progress.badges?.['quiz-perfect']);

  // ---------- クイズ: 不正解のレビュー ----------
  const installQuiz = loadQuiz('basic', '01-install.mdx');
  await page.goto(`${BASE}/learn/basic/install`, { waitUntil: 'domcontentloaded' });
  await startQuiz(page);
  const m = await answerAll(page, installQuiz, { wrong: true });
  await page.getByRole('button', { name: '採点する' }).click();
  await page
    .getByRole('heading', { name: new RegExp(`${m}問中 0問 正解`) })
    .waitFor({ timeout: 30000 });
  check('クイズ: 全問不正解の結果表示', true);
  check(
    'クイズ: 正解と解説が表示される',
    (await page.locator('li[data-correct="false"]').count()) === m &&
      (await page.getByText(/^正解:/).count()) === m,
  );
  await shot('learning-quiz-wrong.png');

  // ---------- クイズ: 選択肢のシャッフル ----------
  await page.goto(`${BASE}/learn/basic/plan-mode`, { waitUntil: 'domcontentloaded' });
  const orders = new Set();
  await startQuiz(page);
  for (let i = 0; i < 8; i++) {
    await page.locator('fieldset').first().waitFor();
    orders.add((await page.locator('fieldset').first().locator('label').allInnerTexts()).join('|'));
    if (i < 7) {
      await page.reload({ waitUntil: 'domcontentloaded' });
      await startQuiz(page);
    }
  }
  check('クイズ: 選択肢の並びが試行ごとに変わる', orders.size >= 2, `8回で ${orders.size} 通り`);

  // ---------- バッジ画面 ----------
  await page.goto(`${BASE}/badges`, { waitUntil: 'domcontentloaded' });
  await page.locator('[data-earned]').first().waitFor({ timeout: 30000 });
  check('バッジ画面: 獲得済みが強調される', (await page.locator('[data-earned]').count()) >= 1);
  check('バッジ画面: 全7種が表示される', (await page.locator('main ul > li').count()) === 7);
  await shot('learning-badges.png');

  // ---------- 検索パレット ----------
  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: /検索を開く/ }).waitFor();
  const dialog = await openPalette(page);
  check('パレット: Ctrl+K で開く', await dialog.isVisible());
  check(
    'パレット: 開いた直後は入力欄にフォーカス',
    await page.evaluate(() => document.activeElement?.getAttribute('role') === 'combobox'),
  );
  check('パレット: 空のときはページ一覧を出す', (await dialog.getByRole('option').count()) === 5);
  await dialog.getByRole('combobox').fill('Plan Mode');
  await dialog
    .getByRole('option', { name: /Plan Mode：実装前/ })
    .first()
    .waitFor({ timeout: 15000 });
  const labels = await dialog.getByRole('option').allInnerTexts();
  check(
    'パレット: レッスンが全文検索で出る',
    labels.some((t) => t.includes('Plan Mode：実装前に計画を立てる')),
  );
  await shot('learning-palette.png');
  await page.keyboard.press('ArrowDown');
  check(
    'パレット: 矢印キーで選択が1つだけ移る',
    (await dialog.locator('[aria-selected="true"]').count()) === 1,
  );
  await dialog.getByRole('combobox').fill('/clear');
  await dialog.getByRole('option').first().waitFor();
  check(
    'パレット: チートシートの項目が出る',
    (await dialog.innerText()).includes('チートシート・用語集'),
  );
  await dialog.getByRole('combobox').fill('Plan Mode');
  await dialog
    .getByRole('option', { name: /Plan Mode：/ })
    .first()
    .waitFor({ timeout: 15000 });
  await dialog
    .getByRole('option', { name: /Plan Mode：/ })
    .first()
    .hover();
  await page.keyboard.press('Enter');
  await page.waitForURL(/\/learn\/basic\/plan-mode/, { timeout: 30000 });
  check('パレット: Enter で選択したレッスンへ移動', /plan-mode/.test(page.url()));
  check('パレット: 移動後に閉じる', !(await dialog.isVisible()));
  await openPalette(page);
  await page.keyboard.press('Escape');
  check('パレット: Esc で閉じる', !(await dialog.isVisible()));
  await openPalette(page);
  await dialog.getByRole('combobox').fill('zzzzzzzzz存在しない');
  await dialog
    .getByText(/見つかりませんでした/)
    .first()
    .waitFor({ timeout: 15000 });
  check('パレット: 0件のメッセージ', true);
  await page.keyboard.press('Escape');

  // ---------- チートシート・用語集 ----------
  await page.goto(`${BASE}/cheatsheet`, { waitUntil: 'domcontentloaded' });
  const total = await page.locator('dt').count();
  check('チートシート: 項目が50件以上', total >= 50, `${total}件`);
  await page.getByRole('searchbox').fill('compact');
  await page.getByText(/件が見つかりました/).waitFor();
  const filtered = await page.locator('dt').count();
  check(
    'チートシート: 絞り込みで件数が減る',
    filtered > 0 && filtered < total,
    `${total} → ${filtered}`,
  );
  await page.locator('button[aria-label*="をコピー"]').first().click();
  check(
    'チートシート: コピーできる',
    (await page.evaluate(() => navigator.clipboard.readText())).length > 0,
  );
  await page.getByRole('searchbox').fill('zzzzzzzz');
  check(
    'チートシート: 0件のメッセージ',
    (await page.getByText('に一致する項目はありません').count()) === 1,
  );
  await page.getByRole('searchbox').fill('');
  await shot('learning-cheatsheet.png');
  await page.goto(`${BASE}/glossary`, { waitUntil: 'domcontentloaded' });
  check('用語集: 15語以上', (await page.locator('dt').count()) >= 15);
  const firstLink = await page.locator('dd a').first().getAttribute('href');
  check(
    '用語集: 解説先レッスンへのリンクがある',
    /^\/learn\/basic\//.test(firstLink ?? ''),
    firstLink,
  );
  await shot('learning-glossary.png');

  // ---------- ダッシュボード ----------
  await page.goto(`${BASE}/dashboard`, { waitUntil: 'domcontentloaded' });
  await page.getByText(/獲得バッジ \d+ \/ 7/).waitFor({ timeout: 30000 });
  check('ダッシュボード: 獲得バッジ数を表示', true);

  // ---------- モバイル ----------
  const mctx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    colorScheme: 'dark',
    hasTouch: true,
  });
  const mp = await mctx.newPage();
  mp.on('pageerror', (e) => errors.push(`mobile: ${e.message}`));
  for (const url of [
    '/',
    '/roadmap',
    '/dashboard',
    '/cheatsheet',
    '/glossary',
    '/badges',
    '/learn/basic/plan-mode',
  ]) {
    await mp.goto(BASE + url, { waitUntil: 'domcontentloaded' });
    await mp.waitForTimeout(600);
    const over = await mp.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    check(`モバイル: ${url} が横にはみ出さない`, over <= 0, over > 0 ? `${over}px` : '');
  }
  await mp.goto(`${BASE}/cheatsheet`, { waitUntil: 'domcontentloaded' });
  const tab = mp.getByRole('navigation', { name: 'メイン（下部）' });
  check('モバイル: 下部タブバーが表示される', await tab.isVisible());
  check(
    'モバイル: 現在のページが aria-current',
    (await tab.locator('[aria-current="page"]').innerText()).includes('チートシート'),
  );
  check(
    'モバイル: ヘッダーのナビは隠れる',
    !(await mp.getByRole('navigation', { name: 'メイン', exact: true }).isVisible()),
  );
  await mp.screenshot({ path: path.join(OUT, 'learning-mobile-cheatsheet.png') });
  await openPalette(mp, 'tap');
  await mp.getByRole('combobox').fill('hooks');
  await mp.waitForTimeout(800);
  await mp.screenshot({ path: path.join(OUT, 'learning-mobile-palette.png') });
  await mctx.close();

  check('ページ内の例外なし', errors.length === 0, errors.join(' | ').slice(0, 300));
  await browser.close();
  finish();
} catch (error) {
  abort(error);
}
