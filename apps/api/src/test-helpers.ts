import type { LessonSummary, QuizQuestion } from '@claude-study/schemas';
import type { AuthProvider, LessonCatalog } from './types';

const lessons: LessonSummary[] = [
  {
    slug: 'install',
    title: 'インストール',
    level: 'basic',
    order: 1,
    summary: '導入',
    verifiedAt: '2026-10-18',
  },
  {
    slug: 'plan-mode',
    title: 'Plan Mode',
    level: 'basic',
    order: 2,
    summary: '計画',
    verifiedAt: '2026-10-18',
  },
  {
    slug: 'hooks',
    title: 'hooks',
    level: 'intermediate',
    order: 1,
    summary: '自動化',
    verifiedAt: '2026-10-18',
  },
];

const quizzes: Record<string, QuizQuestion[]> = {
  install: [
    { id: 'q1', prompt: '1+1は?', choices: ['1', '2'], answerIndex: 1, explanation: '2です' },
    { id: 'q2', prompt: '空は?', choices: ['青', '赤'], answerIndex: 0, explanation: '青です' },
  ],
};

/** テスト用の固定カタログ（実体はフェーズ3でpackages/contentに置き換わる） */
export const fakeCatalog: LessonCatalog = {
  list: () => lessons,
  get: (slug) => lessons.find((l) => l.slug === slug),
  quiz: (slug) => quizzes[slug],
  search: (q) => lessons.filter((l) => l.title.toLowerCase().includes(q.toLowerCase())),
};

/** `x-test-user: <authId>` ヘッダでログイン状態を再現するテスト用プロバイダ */
export const headerAuthProvider: AuthProvider = {
  authenticate: async (request) => {
    const authId = request.headers.get('x-test-user');
    return authId ? { authId, displayName: authId, avatarUrl: null } : null;
  },
};
