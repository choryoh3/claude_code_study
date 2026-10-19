import type { MetadataRoute } from 'next';
import { getLessons, lessonHref } from '@/lib/lessons';
import { getSiteUrl } from '@/lib/site-url';

const STATIC_PAGES = ['/', '/roadmap', '/cheatsheet', '/glossary', '/terms', '/privacy'];

export default function sitemap(): MetadataRoute.Sitemap {
  const site = getSiteUrl();
  const abs = (path: string) => new URL(path, site).toString();

  return [
    ...STATIC_PAGES.map((path) => ({ url: abs(path), changeFrequency: 'weekly' as const })),
    // レッスンは、公式ドキュメントで確認した日を、最終更新日として使う
    ...getLessons().map((l) => ({
      url: abs(lessonHref(l.level, l.slug)),
      lastModified: l.frontmatter.verifiedAt,
      changeFrequency: 'monthly' as const,
    })),
  ];
}
