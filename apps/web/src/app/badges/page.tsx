import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { BadgesView } from '@/components/badges-view';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('badges.meta');
  return { title: t('title'), description: t('description') };
}

export default function BadgesPage() {
  return <BadgesView />;
}
