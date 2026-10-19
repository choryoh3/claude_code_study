import Link from 'next/link';
import type { ComponentProps, ReactNode } from 'react';
import { CodeBlock } from './code-block';

/** レッスン本文の固定見出し → アンカーID。目次(TOC)と本文で同じ対応表を使う。 */
export const SECTION_IDS: Record<string, string> = {
  ゴール: 'goal',
  前提: 'prerequisites',
  解説: 'explanation',
  ハンズオン: 'hands-on',
  よくある失敗: 'pitfalls',
  次へ: 'next',
};

function textOf(node: ReactNode): string {
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(textOf).join('');
  return '';
}

function H2({ children, ...rest }: ComponentProps<'h2'>) {
  const id = SECTION_IDS[textOf(children).trim()];
  return (
    <h2 id={id} {...rest}>
      {children}
    </h2>
  );
}

function Anchor({ href = '', children, ...rest }: ComponentProps<'a'>) {
  // サイト内リンクは Next の Link に、外部リンクは別タブ＋安全な rel にする
  if (href.startsWith('/')) {
    return (
      <Link href={href} {...rest}>
        {children}
      </Link>
    );
  }
  const external = /^https?:\/\//.test(href);
  return (
    <a
      href={href}
      {...(external ? { target: '_blank', rel: 'noreferrer noopener' } : {})}
      {...rest}
    >
      {children}
    </a>
  );
}

/** 表は横スクロールできるように包む（スマホで本文が崩れないように） */
function Table({ children, ...rest }: ComponentProps<'table'>) {
  return (
    <div
      className="table-scroll"
      tabIndex={0}
      role="region"
      aria-label="表（横にスクロールできます）"
    >
      <table {...rest}>{children}</table>
    </div>
  );
}

export const mdxComponents = { h2: H2, a: Anchor, pre: CodeBlock, table: Table };
