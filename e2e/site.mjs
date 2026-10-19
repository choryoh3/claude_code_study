// 公開サイトとしての検査: セキュリティヘッダー、robots / sitemap / favicon、メタデータ（canonical・OGP）、
// 利用規約・プライバシーポリシー、404。ブラウザは使わず、HTTPで確認する。
import { BASE, createReporter } from './lib.mjs';

const { check, finish, abort } = createReporter();

const get = (path, init) => fetch(BASE + path, { redirect: 'manual', ...init });
const metaContent = (html, attr, name) =>
  new RegExp(`<meta[^>]+${attr}="${name}"[^>]*content="([^"]*)"`, 'i').exec(html)?.[1] ??
  new RegExp(`<meta[^>]+content="([^"]*)"[^>]*${attr}="${name}"`, 'i').exec(html)?.[1];

try {
  // ---- セキュリティヘッダー ----
  const home = await get('/');
  const html = await home.text();
  const h = (name) => home.headers.get(name);
  check('ヘッダー: X-Content-Type-Options が nosniff', h('x-content-type-options') === 'nosniff');
  check('ヘッダー: X-Frame-Options が DENY', h('x-frame-options') === 'DENY');
  check(
    'ヘッダー: Referrer-Policy が strict-origin-when-cross-origin',
    h('referrer-policy') === 'strict-origin-when-cross-origin',
  );
  check(
    'ヘッダー: Permissions-Policy でカメラ・マイク・位置情報を無効化',
    /camera=\(\)/.test(h('permissions-policy') ?? '') &&
      /microphone=\(\)/.test(h('permissions-policy') ?? '') &&
      /geolocation=\(\)/.test(h('permissions-policy') ?? ''),
  );
  check(
    'ヘッダー: Cross-Origin-Opener-Policy が same-origin',
    h('cross-origin-opener-policy') === 'same-origin',
  );
  check(
    'ヘッダー: Strict-Transport-Security がある',
    /max-age=\d+/.test(h('strict-transport-security') ?? ''),
  );
  check('ヘッダー: X-Powered-By を出していない（技術情報を隠す）', h('x-powered-by') === null);
  const api = await get('/api/lessons');
  check('ヘッダー: APIは Cache-Control: no-store', api.headers.get('cache-control') === 'no-store');
  check(
    'ヘッダー: APIにも nosniff が付く',
    api.headers.get('x-content-type-options') === 'nosniff',
  );

  // ---- robots / sitemap / favicon ----
  const robots = await (await get('/robots.txt')).text();
  check('robots.txt: APIをクロールさせない', /Disallow:\s*\/api\//.test(robots));
  check(
    'robots.txt: sitemap を示す',
    /Sitemap:\s*https?:\/\/[^\s]+\/sitemap\.xml/.test(robots),
    robots.split('\n').find((l) => /Sitemap/i.test(l)),
  );
  const sitemap = await (await get('/sitemap.xml')).text();
  const urls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  check(
    'sitemap.xml: レッスン25本を含む',
    urls.filter((u) => /\/learn\//.test(u)).length === 25,
    `${urls.filter((u) => /\/learn\//.test(u)).length}本`,
  );
  check(
    'sitemap.xml: 規約・プライバシーを含む',
    urls.some((u) => u.endsWith('/terms')) && urls.some((u) => u.endsWith('/privacy')),
  );
  check(
    'sitemap.xml: APIや存在しないページを含まない',
    urls.every((u) => !/\/api\//.test(u)),
  );
  check('sitemap.xml: 全URLが同じオリジン', new Set(urls.map((u) => new URL(u).origin)).size === 1);
  const icon = await get('/icon.svg');
  check(
    'favicon: /icon.svg が SVG で返る',
    icon.status === 200 && /svg/.test(icon.headers.get('content-type') ?? ''),
  );
  check('favicon: <link rel="icon"> が出力される', /<link[^>]+rel="icon"/.test(html));

  // ---- メタデータ ----
  check('メタデータ: canonical がある', /<link[^>]+rel="canonical"[^>]+href="[^"]+"/.test(html));
  check(
    'メタデータ: OGP の title・locale（ja_JP）',
    metaContent(html, 'property', 'og:title') === 'Claude Code 学習ロードマップ' &&
      metaContent(html, 'property', 'og:locale') === 'ja_JP',
  );
  check('メタデータ: <html lang="ja">', /<html[^>]+lang="ja"/.test(html));
  check(
    'メタデータ: viewport と theme-color',
    /name="viewport"/.test(html) && /name="theme-color"/.test(html),
  );

  // ---- 利用規約・プライバシーポリシー ----
  for (const [path, title] of [
    ['/terms', '利用規約'],
    ['/privacy', 'プライバシーポリシー'],
  ]) {
    const res = await get(path);
    const body = await res.text();
    check(
      `${path}: 200 で、見出し「${title}」`,
      res.status === 200 && new RegExp(`<h1[^>]*>${title}</h1>`).test(body),
    );
    check(`${path}: 最終更新日を表示`, /最終更新日/.test(body));
    check(`${path}: 7つの節がある`, (body.match(/<h2[ >]/g) ?? []).length >= 7);
    check(`${path}: タイトルが「${title} | …」`, new RegExp(`<title>${title} \\|`).test(body));
  }
  check(
    'フッター: 利用規約・プライバシーへのリンク',
    /href="\/terms"/.test(html) && /href="\/privacy"/.test(html),
  );
  const privacy = await (await get('/privacy')).text();
  check(
    'プライバシー: 現状の事実（Cookieを使わない・ブラウザ内保存）を明記',
    /Cookie を使っていません/.test(privacy) && /localStorage/.test(privacy),
  );

  // ---- 404 ----
  const missing = await get('/this-page-does-not-exist');
  const missingBody = await missing.text();
  check(
    '404: ステータスが404で、案内がある',
    missing.status === 404 && /ページが見つかりません/.test(missingBody),
  );
  const missingLesson = await get('/learn/basic/no-such-lesson');
  check('404: 存在しないレッスンも404', missingLesson.status === 404);

  finish();
} catch (error) {
  abort(error);
}
