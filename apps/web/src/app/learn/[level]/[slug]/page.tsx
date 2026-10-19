import { findPlannedTopic, PLANNED_TOPICS } from '@claude-study/content';
import { levelSchema } from '@claude-study/schemas';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { MDXRemote } from 'next-mdx-remote/rsc';
import remarkGfm from 'remark-gfm';
import { LessonActions } from '@/components/lesson-actions';
import { createMdxComponents, SECTION_IDS } from '@/components/mdx-components';
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
  const t = await getTranslations('lesson');
  const lesson = getLesson(level, slug);
  if (lesson) return { title: lesson.frontmatter.title, description: lesson.frontmatter.summary };
  const planned = findPlannedTopic(level, slug);
  return { title: planned ? t('plannedTitle', { title: planned.title }) : t('notFoundTitle') };
}

export default async function LessonPage({ params }: { params: Promise<Params> }) {
  const { level, slug } = await params;
  if (!levelSchema.safeParse(level).success) notFound();

  const t = await getTranslations('lesson');
  const tLevels = await getTranslations('levels');
  const tCommon = await getTranslations('common');

  const lesson = getLesson(level, slug);
  if (!lesson) {
    const planned = findPlannedTopic(level, slug);
    if (!planned) notFound();
    return (
      <div className={`container ${styles.soon}`}>
        <span className="level-chip" data-level={level}>
          {tCommon('comingSoon')}
        </span>
        <h1>{planned.title}</h1>
        <p>{t('plannedBody')}</p>
        <Link className="btn btn-primary" href="/roadmap">
          {t('backToRoadmap')}
        </Link>
      </div>
    );
  }

  const all = getLessons().map(toSummary);
  const index = all.findIndex((l) => l.slug === lesson.slug);
  const prev = all[index - 1];
  const next = all[index + 1];
  const { title, summary, verifiedAt } = lesson.frontmatter;

  // 見出しのアンカーID。固定フォーマットの順序（SECTION_IDS）に、本文の見出しを位置で対応させる。
  // 見出しの文言（言語ごとに違う）をコードに直書きしないための対応。
  const headingIds = Object.fromEntries(lesson.headings.map((h, i) => [h, SECTION_IDS[i] ?? '']));
  const mdxComponents = createMdxComponents({
    headingIds,
    tableLabel: t('tableLabel'),
  });

  // 本文を最後のH2（「次へ」）の直前で分け、そのあいだにクイズを挟む
  const lastHeading = lesson.headings[lesson.headings.length - 1];
  const splitAt = lastHeading ? lesson.body.lastIndexOf(`\n## ${lastHeading}`) : -1;
  const beforeNext = splitAt >= 0 ? lesson.body.slice(0, splitAt) : lesson.body;
  const afterNext = splitAt >= 0 ? lesson.body.slice(splitAt + 1) : '';
  // 目次: クイズは最後の見出しの直前に入れる
  const tocItems = lesson.headings.flatMap((h, i) =>
    i === lesson.headings.length - 1
      ? [
          { label: t('tocQuiz'), id: 'quiz-section' },
          { label: h, id: headingIds[h] },
        ]
      : [{ label: h, id: headingIds[h] }],
  );

  return (
    <div className={`container ${styles.layout}`}>
      <article className={styles.article}>
        <header className={styles.header}>
          <span className="level-chip" data-level={lesson.level}>
            {t('chip', {
              level: tLevels(`${lesson.level}.name`),
              order: String(lesson.frontmatter.order).padStart(2, '0'),
            })}
          </span>
          <h1>{title}</h1>
          <p className={styles.summary}>{summary}</p>
          <p className={styles.verified}>
            {t('verified')} <time dateTime={verifiedAt}>{verifiedAt}</time>
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

        <nav className={styles.pager} aria-label={t('pagerLabel')}>
          {prev ? (
            <Link href={lessonHref(prev.level, prev.slug)} rel="prev">
              <span>
                <ArrowLeft size={14} aria-hidden="true" /> {t('prev')}
              </span>
              {prev.title}
            </Link>
          ) : (
            <span />
          )}
          {next && (
            <Link href={lessonHref(next.level, next.slug)} rel="next" data-align="end">
              <span>
                {t('next')} <ArrowRight size={14} aria-hidden="true" />
              </span>
              {next.title}
            </Link>
          )}
        </nav>
      </article>

      <aside className={styles.aside} aria-label={t('asideLabel')}>
        <nav aria-label={t('tocLabel')} className={styles.toc}>
          <h2>{t('tocTitle')}</h2>
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
