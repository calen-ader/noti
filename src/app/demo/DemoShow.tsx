'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ShowWorkspace } from '@/components/show/ShowWorkspace';
import { demoShow } from '@/lib/show/demo';
import type { Show } from '@/lib/show/types';
import styles from './demo.module.css';

// A sandbox that saves to this browser only, so the editor can be tried before accounts exist.

const KEY = 'noti-demo-v1';

function load(): Show {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw) as Show;
  } catch {}
  return demoShow();
}

export function DemoShow() {
  const [show, setShow] = useState<Show | null>(null);

  // localStorage only exists in the browser, so the saved show loads after mount.
  useEffect(() => setShow(load()), []); // eslint-disable-line react-hooks/set-state-in-effect
  useEffect(() => {
    if (!show) return;
    try { localStorage.setItem(KEY, JSON.stringify(show)); } catch {}
  }, [show]);

  return (
    <div className={styles.page}>
      <header className={styles.top}>
        <Link href="/" className={styles.brand}>Noti</Link>
        <span className={styles.badge}>Prueba: se guarda solo en este navegador</span>
        <button className={styles.reset} onClick={() => setShow(demoShow())}>Empezar de nuevo</button>
      </header>
      {show && <ShowWorkspace show={show} onChange={setShow} />}
    </div>
  );
}
