import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { DashboardView } from '@/components/dashboard-view';
import { getLevelGroups } from '@/lib/lessons';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('dashboard.meta');
  return { title: t('title'), description: t('description') };
}

export default function DashboardPage() {
  return <DashboardView groups={getLevelGroups()} />;
}
