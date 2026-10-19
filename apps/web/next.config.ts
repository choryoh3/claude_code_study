import type { NextConfig } from 'next';

const config: NextConfig = {
  // workspace パッケージは TypeScript のソースをそのまま公開しているため、Next側で変換する
  transpilePackages: ['@claude-study/content', '@claude-study/schemas'],
  // レッスン(MDX)はビルド時にファイルシステムから読む。バンドルに含めず実行時に参照する
  serverExternalPackages: ['yaml'],
  poweredByHeader: false,
};

export default config;
