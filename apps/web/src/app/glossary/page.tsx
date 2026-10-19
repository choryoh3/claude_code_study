import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { ReferenceView } from '@/components/reference-view';
import { getLessonLinks, getReference } from '@/lib/lessons';
import styles from '../reference-page.module.css';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('reference.glossary.meta');
  return { title: t('title'), description: t('description') };
}

export default async function GlossaryPage() {
  const t = await getTranslations('reference');
  const { glossary } = getReference();
  const links = getLessonLinks();
  const fallback = { title: t('fallbackLesson'), href: '/roadmap' };

  return (
    <div className="container">
      <header className={styles.head}>
        <h1>{t('glossary.heading')}</h1>
        <p>{t('glossary.lead')}</p>
      </header>
      <ReferenceView
        variant="glossary"
        searchLabel={t('glossary.search')}
        sections={[
          {
            id: 'terms',
            title: t('glossary.section'),
            items: glossary.terms.map((term) => ({
              term: term.term,
              description: term.description,
              lesson: links[term.lesson] ?? fallback,
            })),
          },
        ]}
      />
    </div>
  );
}
