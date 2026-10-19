import type { Metadata } from 'next';
import { BadgesView } from '@/components/badges-view';

export const metadata: Metadata = {
  title: 'バッジ',
  description: '学習の節目で獲得できるバッジの一覧です。',
};

export default function BadgesPage() {
  return <BadgesView />;
}
