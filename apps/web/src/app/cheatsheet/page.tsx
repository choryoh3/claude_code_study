import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { ReferenceView } from '@/components/reference-view';
import { getLessonLinks, getReference } from '@/lib/lessons';
import styles from '../reference-page.module.css';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('reference.cheatsheet.meta');
  return { title: t('title'), description: t('description') };
}

export default async function CheatsheetPage() {
  const t = await getTranslations('reference');
  const { cheatsheet } = getReference();
  const links = getLessonLinks();
  const fallback = { title: t('fallbackLesson'), href: '/roadmap' };

  return (
    <div className="container">
      <header className={styles.head}>
        <h1>{t('cheatsheet.heading')}</h1>
        <p>{t('cheatsheet.lead')}</p>
      </header>
      <ReferenceView
        variant="cheatsheet"
        searchLabel={t('cheatsheet.search')}
        sections={cheatsheet.sections.map((s) => ({
          ...s,
          items: s.items.map((i) => ({
            term: i.term,
            description: i.description,
            lesson: links[i.lesson] ?? fallback,
          })),
        }))}
      />
    </div>
  );
}
