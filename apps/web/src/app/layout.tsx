import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { SiteFooter } from '@/components/site-footer';
import { SiteHeader } from '@/components/site-header';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'Claude Code 学習ロードマップ',
    template: '%s | Claude Code 学習ロードマップ',
  },
  description:
    'Claude Codeを基礎から上級まで、読んで・試して・確認しながら身につける日本語の学習サイト。公式ドキュメントで確認した内容だけを扱います。',
};

export const viewport: Viewport = {
  colorScheme: 'light dark',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#fbfaf8' },
    { media: '(prefers-color-scheme: dark)', color: '#14110f' },
  ],
};

// 初回描画前にテーマを適用して、ダークモードの人に白い画面が一瞬出るのを防ぐ
const themeScript = `try{var t=localStorage.getItem('claude-study:theme');if(t==='light'||t==='dark')document.documentElement.dataset.theme=t}catch(e){}`;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ja" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <a className="skip-link" href="#main">
          本文へスキップ
        </a>
        <SiteHeader />
        <main id="main">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
