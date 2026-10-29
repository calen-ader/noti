'use client';

import { useEffect, useRef } from 'react';
import { supabaseBrowser } from '@/lib/supabase/client';
import { loadLocal, localStore, supabaseStore } from './store';
import type { StudioMode } from './app';
import './studio.css';

type Props = {
  mode: StudioMode;
  me?: { id: string; email: string; name: string } | null;
  data?: unknown;
  open?: string | null;
  next?: string | null;
  google?: boolean;
};

// The studio is one plain module that draws the whole screen; this mounts it once per page load.
let mounted = false;

export function Studio({ mode, me = null, data = null, open = null, next = null, google = false }: Props) {
  const stage = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (mounted || !stage.current) return;
    mounted = true;
    const sb = mode === 'studio' || mode === 'signin' ? supabaseBrowser() : null;
    const back = `${location.origin}/auth/callback`;
    // where to go after a mailed link or Google travels in a cookie, so the address they return to stays the plain allowed one
    const keepNext = () => {
      document.cookie = `noti-next=${encodeURIComponent(next ?? '')}; path=/; max-age=3600; samesite=lax`;
    };
    const go = () => {
      location.href = next ?? '/estudio';
    };
    import('./app').then(({ mount }) => {
      mount(stage.current!, {
        mode,
        me,
        data: mode === 'demo' ? loadLocal() : data,
        open,
        invited: Boolean(next?.startsWith('/unirse/')),
        store: mode === 'studio' && sb ? supabaseStore(sb) : mode === 'demo' ? localStore() : null,
        signIn: async (email) => {
          if (!sb) return { error: 'sin conexión' };
          keepNext();
          const { error } = await sb.auth.signInWithOtp({ email, options: { emailRedirectTo: back } });
          return error ? { error: error.message } : { sent: 'link' };
        },
        signInPassword: async (email, password) => {
          if (!sb) return { error: 'sin conexión' };
          const { error } = await sb.auth.signInWithPassword({ email, password });
          if (error) return { error: error.message };
          go();
          return {};
        },
        signUp: async (email, password) => {
          if (!sb) return { error: 'sin conexión' };
          keepNext();
          const { data: d, error } = await sb.auth.signUp({ email, password, options: { emailRedirectTo: back } });
          if (error) return { error: error.message };
          if (d.user && !d.user.identities?.length) return { error: 'already registered' };
          if (d.session) {
            go();
            return {};
          }
          return { sent: 'confirm' };
        },
        google: google && sb
          ? async () => {
              keepNext();
              const { error } = await sb.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: back } });
              return error ? error.message : null;
            }
          : undefined,
        setPassword: mode === 'studio' && sb
          ? async (password) => {
              const { error } = await sb.auth.updateUser({ password });
              return error ? error.message : null;
            }
          : undefined,
        signOut: sb
          ? async () => {
              await sb.auth.signOut();
              location.href = '/';
            }
          : undefined,
      });
    });
  }, [mode, me, data, open, next, google]);

  return <div ref={stage} className="stage" id="stage" />;
}
