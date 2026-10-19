import { findPlannedTopic, PLANNED_TOPICS } from '@claude-study/content';
import { levelSchema } from '@claude-study/schemas';
import type { Metadata } from 'next';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { MDXRemote } from 'next-mdx-remote/rsc';
import remarkGfm from 'remark-gfm';
import { LessonActions } from '@/components/lesson-actions';
import { mdxComponents, SECTION_IDS } from '@/components/mdx-components';
import { QuizPanel } from '@/components/quiz-panel';
import { getLesson, getLessons, lessonHref, toSummary } from '@/lib/lessons';
import styles from './lesson.module.css';

interface Params {
  level: string;
  slug: string;
}

// 公開済みレッスンと「準備中」のトピックだけを事前生成し、それ以外は404にする
export const dynamicParams = false;

export function generateStaticParams(): Params[] {
  const published = getLessons().map((l) => ({ level: l.level, slug: l.slug }));
  const planned = (['intermediate', 'advanced'] as const).flatMap((level) =>
    PLANNED_TOPICS[level]
      .filter((t) => !published.some((p) => p.slug === t.slug))
      .map((t) => ({ level, slug: t.slug })),
  );
  return [...published, ...planned];
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { level, slug } = await params;
  const lesson = getLesson(level, slug);
  if (lesson) return { title: lesson.frontmatter.title, description: lesson.frontmatter.summary };
  const planned = findPlannedTopic(level, slug);
  return { title: planned ? `${planned.title}（準備中）` : '見つかりません' };
}

export default async function LessonPage({ params }: { params: Promise<Params> }) {
  const { level, slug } = await params;
  if (!levelSchema.safeParse(level).success) notFound();

  const lesson = getLesson(level, slug);
  if (!lesson) {
    const planned = findPlannedTopic(level, slug);
    if (!planned) notFound();
    return (
      <div className={`container ${styles.soon}`}>
        <span className="level-chip" data-level={level}>
          準備中
        </span>
        <h1>{planned.title}</h1>
        <p>
          このレッスンは現在準備しています。公式ドキュメントで内容を確認しながら執筆するため、公開まで少しお待ちください。
        </p>
        <Link className="btn btn-primary" href="/roadmap">
          ロードマップに戻る
        </Link>
      </div>
    );
  }

  const all = getLessons().map(toSummary);
  const index = all.findIndex((l) => l.slug === lesson.slug);
  const prev = all[index - 1];
  const next = all[index + 1];
  const { title, summary, verifiedAt } = lesson.frontmatter;

  // 本文を「次へ」の見出しの直前で分け、そのあいだにクイズを挟む
  const splitAt = lesson.body.indexOf('\n## 次へ');
  const beforeNext = splitAt >= 0 ? lesson.body.slice(0, splitAt) : lesson.body;
  const afterNext = splitAt >= 0 ? lesson.body.slice(splitAt + 1) : '';
  // 目次: クイズは「次へ」の直前に入れる
  const tocItems = lesson.headings.flatMap((h) =>
    h === '次へ'
      ? [
          { label: 'クイズ', id: 'quiz-section' },
          { label: h, id: SECTION_IDS[h] },
        ]
      : [{ label: h, id: SECTION_IDS[h] }],
  );

  return (
    <div className={`container ${styles.layout}`}>
      <article className={styles.article}>
        <header className={styles.header}>
          <span className="level-chip" data-level={lesson.level}>
            {lesson.level === 'basic' ? '基礎' : lesson.level === 'intermediate' ? '中級' : '上級'}
            ・{String(lesson.frontmatter.order).padStart(2, '0')}
          </span>
          <h1>{title}</h1>
          <p className={styles.summary}>{summary}</p>
          <p className={styles.verified}>
            公式ドキュメントで確認した日: <time dateTime={verifiedAt}>{verifiedAt}</time>
          </p>
        </header>

        <div className={styles.prose}>
          <MDXRemote
            source={beforeNext}
            components={mdxComponents}
            options={{ mdxOptions: { remarkPlugins: [remarkGfm] } }}
          />
        </div>

        {/* クイズは「よくある失敗」と「次へ」のあいだに置く（固定フォーマットの順序どおり） */}
        <QuizPanel slug={lesson.slug} />

        {afterNext && (
          <div className={styles.prose}>
            <MDXRemote
              source={afterNext}
              components={mdxComponents}
              options={{ mdxOptions: { remarkPlugins: [remarkGfm] } }}
            />
          </div>
        )}

        <nav className={styles.pager} aria-label="前後のレッスン">
          {prev ? (
            <Link href={lessonHref(prev.level, prev.slug)} rel="prev">
              <span>
                <ArrowLeft size={14} aria-hidden="true" /> 前のレッスン
              </span>
              {prev.title}
            </Link>
          ) : (
            <span />
          )}
          {next && (
            <Link href={lessonHref(next.level, next.slug)} rel="next" data-align="end">
              <span>
                次のレッスン <ArrowRight size={14} aria-hidden="true" />
              </span>
              {next.title}
            </Link>
          )}
        </nav>
      </article>

      <aside className={styles.aside} aria-label="このレッスンについて">
        <nav aria-label="目次" className={styles.toc}>
          <h2>目次</h2>
          <ol>
            {tocItems.map((item) => (
              <li key={item.id}>
                <a href={`#${item.id}`}>{item.label}</a>
              </li>
            ))}
          </ol>
        </nav>
        <LessonActions slug={lesson.slug} />
      </aside>
    </div>
  );
}
