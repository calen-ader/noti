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
};

// The studio is one plain module that draws the whole screen; this mounts it once per page load.
let mounted = false;

export function Studio({ mode, me = null, data = null, open = null, next = null }: Props) {
  const stage = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (mounted || !stage.current) return;
    mounted = true;
    const sb = mode === 'studio' || mode === 'signin' ? supabaseBrowser() : null;
    import('./app').then(({ mount }) => {
      mount(stage.current!, {
        mode,
        me,
        data: mode === 'demo' ? loadLocal() : data,
        open,
        store: mode === 'studio' && sb ? supabaseStore(sb) : mode === 'demo' ? localStore() : null,
        signIn: async (email) => {
          if (!sb) return 'sin conexión';
          // where to go after the emailed link travels in a cookie, so the link itself stays the plain allowed address
          document.cookie = `noti-next=${encodeURIComponent(next ?? '')}; path=/; max-age=3600; samesite=lax`;
          const { error } = await sb.auth.signInWithOtp({ email, options: { emailRedirectTo: `${location.origin}/auth/callback` } });
          return error ? error.message : null;
        },
        signOut: sb
          ? async () => {
              await sb.auth.signOut();
              location.href = '/';
            }
          : undefined,
      });
    });
  }, [mode, me, data, open, next]);

  return <div ref={stage} className="stage" id="stage" />;
}
