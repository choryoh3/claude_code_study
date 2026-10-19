import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { RoadmapView } from '@/components/roadmap-view';
import { getLevelGroups } from '@/lib/lessons';
import styles from './roadmap.module.css';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('roadmap.meta');
  return { title: t('title'), description: t('description') };
}

export default async function RoadmapPage() {
  const t = await getTranslations('roadmap');
  return (
    <div className="container">
      <header className={styles.head}>
        <h1>{t('heading')}</h1>
        <p>{t('intro')}</p>
      </header>
      <RoadmapView groups={getLevelGroups()} />
    </div>
  );
}
