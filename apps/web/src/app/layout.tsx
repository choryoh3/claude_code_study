import type { Metadata, Viewport } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getTranslations } from 'next-intl/server';
import type { ReactNode } from 'react';
import { BadgeEngine } from '@/components/badge-engine';
import { CommandPalette } from '@/components/command-palette';
import { SiteFooter } from '@/components/site-footer';
import { SiteHeader } from '@/components/site-header';
import { MobileTabBar } from '@/components/site-nav';
import { getLessonLinks, getLessons, getReference } from '@/lib/lessons';
import { getSiteUrl } from '@/lib/site-url';
import type { ReferenceEntry } from '@/lib/palette-logic';
import './globals.css';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('meta');
  return {
    title: { default: t('siteName'), template: `%s | ${t('siteName')}` },
    description: t('siteDescription'),
    // 相対URLの canonical・OGP を、公開URLを基準に絶対URLへ解決する
    metadataBase: getSiteUrl(),
    alternates: { canonical: '/' },
    openGraph: {
      type: 'website',
      siteName: t('siteName'),
      title: t('siteName'),
      description: t('siteDescription'),
      locale: 'ja_JP',
    },
    twitter: { card: 'summary', title: t('siteName'), description: t('siteDescription') },
  };
}

export const viewport: Viewport = {
  colorScheme: 'light dark',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#fbfaf8' },
    { media: '(prefers-color-scheme: dark)', color: '#14110f' },
  ],
};

// 初回描画前にテーマを適用して、ダークモードの人に白い画面が一瞬出るのを防ぐ
const themeScript = `try{var t=localStorage.getItem('claude-study:theme');if(t==='light'||t==='dark')document.documentElement.dataset.theme=t}catch(e){}`;

/** 検索パレットで引く、チートシート・用語集の項目（解説先はレッスン） */
function buildReferenceEntries(): ReferenceEntry[] {
  const { cheatsheet, glossary } = getReference();
  const links = getLessonLinks();
  return [
    ...cheatsheet.sections.flatMap((s) =>
      s.items.map((item, i) => ({
        id: `cheatsheet-${s.id}-${i}`,
        kind: 'cheatsheet' as const,
        term: item.term,
        description: item.description,
        href: links[item.lesson]?.href ?? '/cheatsheet',
      })),
    ),
    ...glossary.terms.map((t, i) => ({
      id: `glossary-${i}`,
      kind: 'glossary' as const,
      term: t.term,
      description: t.description,
      href: links[t.lesson]?.href ?? '/glossary',
    })),
  ];
}

export default async function RootLayout({ children }: { children: ReactNode }) {
  const locale = await getLocale();
  const t = await getTranslations('common');
  const lessons = getLessons().map((l) => ({ slug: l.slug, level: l.level }));
  return (
    <html lang={locale} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <NextIntlClientProvider>
          <a className="skip-link" href="#main">
            {t('skipToMain')}
          </a>
          <SiteHeader />
          <main id="main">{children}</main>
          <SiteFooter />
          <MobileTabBar />
          <CommandPalette reference={buildReferenceEntries()} />
          <BadgeEngine lessons={lessons} />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
