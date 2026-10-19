import type messages from '../../messages/ja.json';
import type { Locale } from './config';

/**
 * メッセージのキーを型で検査する。存在しないキーを `t('...')` に渡すと、コンパイルエラーになる。
 * ICUの引数（`{count}` など）の渡し忘れも検出される。
 */
declare module 'next-intl' {
  interface AppConfig {
    Locale: Locale;
    Messages: typeof messages;
  }
}
