import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { LegalDocument } from '@/components/legal-document';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('legal.privacy.meta');
  return { title: t('title'), description: t('description') };
}

export default function PrivacyPage() {
  return <LegalDocument kind="privacy" />;
}
