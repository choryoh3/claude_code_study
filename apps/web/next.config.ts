import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const config: NextConfig = {
  // workspace パッケージは TypeScript のソースをそのまま公開しているため、Next側で変換する
  transpilePackages: ['@claude-study/api', '@claude-study/content', '@claude-study/schemas'],
  // レッスン(MDX)はビルド時にファイルシステムから読む。バンドルに含めず実行時に参照する
  serverExternalPackages: ['yaml'],
  poweredByHeader: false,
};

// i18n/request.ts を next-intl に結びつける（文言は messages/<locale>.json に集約）
const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

export default withNextIntl(config);
