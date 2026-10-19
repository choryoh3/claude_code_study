import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';
import { fileURLToPath } from 'node:url';

// モノレポのルート。apps/web の外にある packages/content のファイルを、本番のバンドルに含めるために使う
const monorepoRoot = fileURLToPath(new URL('../../', import.meta.url));

/**
 * 全ページに付けるセキュリティヘッダー。
 * - CSP は、テーマの初期化スクリプト（インライン）や Next の内部スクリプトとの兼ね合いで、
 *   nonce の仕組みが要る。今は入れず、ADR 0008 に「未対応」として記録している。
 */
const securityHeaders = [
  // ブラウザによる Content-Type の推測を禁止する（アップロード等での型すり替え対策）
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  // 他サイトの iframe に埋め込ませない（クリックジャッキング対策）
  { key: 'X-Frame-Options', value: 'DENY' },
  // 他サイトへ送る Referer を、オリジンだけに絞る
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  // 使わない機能を無効化する
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=()' },
  // 他のウィンドウとの参照を切り離す（Spectre 系の対策）
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
  // HTTPS を強制する（HTTPS でない環境では無視される）
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' },
];

const config: NextConfig = {
  // workspace パッケージは TypeScript のソースをそのまま公開しているため、Next側で変換する
  transpilePackages: ['@claude-study/api', '@claude-study/content', '@claude-study/schemas'],
  // レッスン(MDX)はビルド時にファイルシステムから読む。バンドルに含めず実行時に参照する
  serverExternalPackages: ['yaml'],
  poweredByHeader: false,

  // Vercel などのサーバーレス環境では、実行に必要なファイルだけがバンドルに含まれる。
  // /api は、実行時にレッスンとチートシートのファイルを読むため、明示的に含める。
  // （ページは、ビルド時に静的生成されるので不要）
  outputFileTracingRoot: monorepoRoot,
  outputFileTracingIncludes: {
    '/api/[[...route]]': [
      '../../packages/content/lessons/**/*.mdx',
      '../../packages/content/reference/*.yaml',
    ],
  },

  async headers() {
    return [
      { source: '/:path*', headers: securityHeaders },
      // APIの応答は、ブラウザや中継にキャッシュさせない（採点・進捗は最新でなければならない）
      { source: '/api/:path*', headers: [{ key: 'Cache-Control', value: 'no-store' }] },
    ];
  },
};

// i18n/request.ts を next-intl に結びつける（文言は messages/<locale>.json に集約）
const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

export default withNextIntl(config);
