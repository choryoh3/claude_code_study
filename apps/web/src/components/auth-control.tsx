'use client';

import type { Session } from '@supabase/supabase-js';
import { LogIn, LogOut } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';
import { isSameProgress, mergeProgress, parseStoredProgress } from '@/lib/progress-logic';
import { replaceProgress, useProgress } from '@/lib/progress-store';
import { getSupabase } from '@/lib/supabase/client';
import styles from './auth-control.module.css';

type SyncState = 'idle' | 'syncing' | 'synced' | 'error';
const SAVE_DELAY_MS = 1500;

/**
 * GitHub ログインと、進捗の同期。環境変数が未設定のときは何も表示しない（ゲストのまま使える）。
 * 同期は「ログイン直後に端末とクラウドを統合」→「以降の変更を少し待ってから保存」の2段階。
 * 失敗しても学習は止めない（端末の進捗が正）。
 */
export function AuthControl() {
  const t = useTranslations('auth');
  const supabase = getSupabase();
  const progress = useProgress();
  const [session, setSession] = useState<Session | null>(null);
  const [state, setState] = useState<SyncState>('idle');
  const [ready, setReady] = useState(false);
  const userId = session?.user.id;
  // 最後にクラウドと一致していた内容。変更がないときに、無駄な書き込みをしない
  const lastSaved = useRef<string | null>(null);
  const localRef = useRef(progress);
  useEffect(() => {
    localRef.current = progress;
  });

  useEffect(() => {
    if (!supabase) return;
    void supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setReady(true);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, next) => setSession(next));
    return () => data.subscription.unsubscribe();
  }, [supabase]);

  // ログイン直後: クラウドの進捗と端末の進捗を統合して、双方に反映する
  useEffect(() => {
    if (!supabase || !userId) {
      lastSaved.current = null;
      return;
    }
    let cancelled = false;
    void (async () => {
      setState('syncing');
      const { data, error } = await supabase
        .from('user_progress')
        .select('data')
        .eq('user_id', userId)
        .maybeSingle();
      if (cancelled) return;
      if (error) return setState('error');
      const remote = parseStoredProgress(data ? JSON.stringify(data.data) : null);
      const merged = mergeProgress(localRef.current, remote);
      if (!isSameProgress(merged, localRef.current)) replaceProgress(merged);
      if (!data || !isSameProgress(merged, remote)) {
        const { error: saveError } = await supabase
          .from('user_progress')
          .upsert({ user_id: userId, data: merged, updated_at: new Date().toISOString() });
        if (cancelled) return;
        if (saveError) return setState('error');
      }
      lastSaved.current = JSON.stringify(merged);
      setState('synced');
    })();
    return () => {
      cancelled = true;
    };
  }, [supabase, userId]);

  // 以降の変更: 少し待ってからまとめて保存する
  useEffect(() => {
    if (!supabase || !userId || lastSaved.current === null) return;
    const body = JSON.stringify(progress);
    if (body === lastSaved.current) return;
    const timer = setTimeout(async () => {
      const { error } = await supabase
        .from('user_progress')
        .upsert({ user_id: userId, data: progress, updated_at: new Date().toISOString() });
      if (error) return setState('error');
      lastSaved.current = body;
      setState('synced');
    }, SAVE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [supabase, userId, progress, state]);

  if (!supabase || !ready) return null;

  if (!session) {
    return (
      <button
        type="button"
        className={styles.button}
        title={t('signInTitle')}
        onClick={() =>
          void supabase.auth.signInWithOAuth({
            provider: 'github',
            options: { redirectTo: window.location.origin },
          })
        }
      >
        <LogIn size={16} aria-hidden="true" />
        <span>{t('signIn')}</span>
      </button>
    );
  }

  const meta = session.user.user_metadata as { user_name?: string; avatar_url?: string };
  const name = meta.user_name ?? t('fallbackName');
  return (
    <div className={styles.account}>
      {meta.avatar_url ? (
        // 外部ドメインの小さなアバター。next/image の最適化対象にしない
        <img className={styles.avatar} src={meta.avatar_url} alt="" width={24} height={24} />
      ) : null}
      <span className={styles.name} title={t('account', { name })}>
        {name}
      </span>
      <button
        type="button"
        className={styles.button}
        onClick={() => void supabase.auth.signOut()}
        aria-label={t('signOut')}
        title={t('signOut')}
      >
        <LogOut size={16} aria-hidden="true" />
      </button>
      <span className={styles.status} role="status" data-state={state}>
        {state === 'syncing' ? t('syncing') : state === 'synced' ? t('synced') : null}
      </span>
      {state === 'error' ? (
        <span className={styles.error} role="alert">
          {t('error')}
        </span>
      ) : null}
    </div>
  );
}
