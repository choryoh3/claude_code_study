import type { Metadata } from 'next';
import { DashboardView } from '@/components/dashboard-view';
import { getLevelGroups } from '@/lib/lessons';

export const metadata: Metadata = {
  title: 'ダッシュボード',
  description: '学習の進み具合と、次にやることを確認できます。',
};

export default function DashboardPage() {
  return <DashboardView groups={getLevelGroups()} />;
}
