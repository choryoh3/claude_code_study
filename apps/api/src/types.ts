import type {
  BadgeKey,
  LessonSummary,
  ProgressEntry,
  ProgressStatus,
  PublicQuizQuestion,
  QuizQuestion,
  UserBadge,
} from '@claude-study/schemas';

/** 認証済みユーザー。個人情報は最小限（id・表示名・アバターのみ）。 */
export interface AuthUser {
  authId: string;
  displayName: string | null;
  avatarUrl: string | null;
}

/**
 * 認証プロバイダの抽象。Supabase Auth(JWT検証)は接続後にこの実装を差し替える。
 * 未ログイン（ゲスト）は null を返す。
 */
export interface AuthProvider {
  authenticate(request: Request): Promise<AuthUser | null>;
}

/** レッスン・クイズの取得元。実体はpackages/content（フェーズ3）が提供する。 */
export interface LessonCatalog {
  list(): LessonSummary[];
  get(slug: string): LessonSummary | undefined;
  quiz(slug: string): QuizQuestion[] | undefined;
  search(query: string): LessonSummary[];
}

export function toPublicQuestion(q: QuizQuestion): PublicQuizQuestion {
  return { id: q.id, prompt: q.prompt, choices: q.choices };
}

/** ユーザー状態の永続化。Prisma実装と、テスト用のメモリ実装がある。 */
export interface ProgressStore {
  /** authId からユーザーを作成または更新し、内部IDを返す */
  upsertUser(user: AuthUser): Promise<string>;
  listProgress(userId: string): Promise<ProgressEntry[]>;
  setProgress(
    userId: string,
    slug: string,
    status: ProgressStatus,
    completedAt: Date | null,
  ): Promise<void>;
  addStudyDay(userId: string, date: string): Promise<void>;
  listStudyDays(userId: string): Promise<string[]>;
  recordAttempt(
    userId: string,
    slug: string,
    score: number,
    total: number,
    answers: unknown,
  ): Promise<void>;
  hasPerfectAttempt(userId: string): Promise<boolean>;
  listBadges(userId: string): Promise<UserBadge[]>;
  awardBadge(userId: string, key: BadgeKey, now: Date): Promise<void>;
}

export interface AppEnv {
  Variables: { user: AuthUser | null };
}
