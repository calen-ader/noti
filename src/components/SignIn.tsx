'use client';

import { useState } from 'react';
import { supabaseBrowser, supabaseConfigured } from '@/lib/supabase/client';
import styles from './SignIn.module.css';

// Teachers sign in with an emailed link. Students never sign in: they open the show or song
// link their teacher sends.

export function SignIn() {
  const [email, setEmail] = useState('');
  const [mail, setMail] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [mailError, setMailError] = useState('');

  async function sendLink(e: React.FormEvent) {
    e.preventDefault();
    if (!supabaseConfigured) {
      setMail('error');
      setMailError('El acceso de profes todavía no está conectado.');
      return;
    }
    setMail('sending');
    const { error } = await supabaseBrowser().auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) {
      setMail('error');
      setMailError('No pudimos mandar el link. Revisá el email y probá de nuevo.');
    } else {
      setMail('sent');
    }
  }

  return (
    <div className={styles.doors}>
      <form className={styles.door} onSubmit={sendLink}>
        <h2 className={styles.who}>Entrar como profe</h2>
        {mail === 'sent' ? (
          <p className={styles.sent} role="status">Te mandamos un link a <strong>{email}</strong>. Abrilo desde este dispositivo.</p>
        ) : (
          <>
            <label htmlFor="teacher-email" className={styles.label}>Email</label>
            <div className={styles.row}>
              <input
                id="teacher-email"
                className={styles.field}
                type="email"
                required
                value={email}
                onChange={(e) => { setEmail(e.target.value); setMail('idle'); }}
                autoComplete="email"
                placeholder="euge@ejemplo.com"
              />
              <button className={styles.go} type="submit" disabled={mail === 'sending'}>
                {mail === 'sending' ? 'Enviando…' : 'Recibir link'}
              </button>
            </div>
            {mail === 'error' && <p className={styles.error}>{mailError}</p>}
          </>
        )}
      </form>
      <p className={styles.students}>¿Sos alumno o alumna? Abrí el link que te pasó tu profe.</p>
    </div>
  );
}
