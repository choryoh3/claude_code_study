import type { Metadata } from 'next';
import { ReferenceView } from '@/components/reference-view';
import { getLessonLinks, getReference } from '@/lib/lessons';
import styles from '../reference-page.module.css';

export const metadata: Metadata = {
  title: 'チートシート',
  description: 'スラッシュコマンド・キー操作・権限モードなど、Claude Codeでよく使う操作の早見表。',
};

export default function CheatsheetPage() {
  const { cheatsheet } = getReference();
  const links = getLessonLinks();

  return (
    <div className="container">
      <header className={styles.head}>
        <h1>チートシート</h1>
        <p>よく使う操作の早見表です。コマンドはコピーでき、詳しい解説はレッスンで読めます。</p>
      </header>
      <ReferenceView
        variant="cheatsheet"
        searchLabel="コマンド・キー・説明を絞り込む"
        sections={cheatsheet.sections.map((s) => ({
          ...s,
          items: s.items.map((i) => ({
            term: i.term,
            description: i.description,
            lesson: links[i.lesson] ?? { title: 'レッスン', href: '/roadmap' },
          })),
        }))}
      />
    </div>
  );
}
