import type { Metadata } from 'next';
import { RoadmapView } from '@/components/roadmap-view';
import { getLevelGroups } from '@/lib/lessons';
import styles from './roadmap.module.css';

export const metadata: Metadata = {
  title: 'ロードマップ',
  description: '基礎から上級まで、Claude Codeを身につける学習の道すじ。',
};

export default function RoadmapPage() {
  return (
    <div className="container">
      <header className={styles.head}>
        <h1>学習ロードマップ</h1>
        <p>
          基礎から順に進めるのがおすすめです。完了したレッスンには印がつき、
          次にやることが1つだけ強調されます。
        </p>
      </header>
      <RoadmapView groups={getLevelGroups()} />
    </div>
  );
}
