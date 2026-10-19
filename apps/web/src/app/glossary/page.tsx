import type { Metadata } from 'next';
import { ReferenceView } from '@/components/reference-view';
import { getLessonLinks, getReference } from '@/lib/lessons';
import styles from '../reference-page.module.css';

export const metadata: Metadata = {
  title: '用語集',
  description: 'Claude Codeの学習で出てくる用語を、学ぶ順にまとめた用語集。',
};

export default function GlossaryPage() {
  const { glossary } = getReference();
  const links = getLessonLinks();

  return (
    <div className="container">
      <header className={styles.head}>
        <h1>用語集</h1>
        <p>レッスンで出てくる用語を、学ぶ順に並べています。</p>
      </header>
      <ReferenceView
        variant="glossary"
        searchLabel="用語・説明を絞り込む"
        sections={[
          {
            id: 'terms',
            title: '用語',
            items: glossary.terms.map((t) => ({
              term: t.term,
              description: t.description,
              lesson: links[t.lesson] ?? { title: 'レッスン', href: '/roadmap' },
            })),
          },
        ]}
      />
    </div>
  );
}
