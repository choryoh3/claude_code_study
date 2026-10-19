/**
 * 公開サイトのURL。canonical・OGP・sitemap の絶対URLに使う。
 * 本番は環境変数 NEXT_PUBLIC_SITE_URL（例: https://example.vercel.app）で指定する。
 * 未指定のローカル開発では localhost を使う。
 */
export function getSiteUrl(): URL {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  try {
    return new URL(raw && raw.length > 0 ? raw : 'http://localhost:3100');
  } catch {
    // 不正な値で、ビルド全体が落ちないようにする（ただし値の誤りは気づけるよう、開発用URLに戻す）
    return new URL('http://localhost:3100');
  }
}
