import { getRequestConfig } from 'next-intl/server';
import { defaultLocale } from './config';

/**
 * リクエストごとの言語とメッセージ。URLには言語を含めない方針（ADR 0007）。
 *
 * 現在は日本語のみで、言語を固定している。cookie や Accept-Language を読むと
 * 全ページが動的描画になり、静的生成のメリットが失われるため。
 * 言語を増やすときは、ここで cookies() 等から決定する（その場合の描画方式の変更は ADR 0007 を参照）。
 */
export default getRequestConfig(async () => {
  const locale = defaultLocale;
  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
