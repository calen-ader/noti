'use client';

import { useEffect, useState } from 'react';
import { StudentShow } from '@/components/student/StudentShow';
import { demoShow } from '@/lib/show/demo';
import type { Show } from '@/lib/show/types';

// The demo show as a student would see it from a show link.
export default function DemoStudent() {
  const [show, setShow] = useState<Show | null>(null);
  useEffect(() => {
    let s: Show | null = null;
    try { s = JSON.parse(localStorage.getItem('noti-demo-v1') ?? 'null'); } catch {}
    setShow(s ?? demoShow()); // eslint-disable-line react-hooks/set-state-in-effect
  }, []);
  return show ? <StudentShow show={show} revision={1} publishedAt={new Date().toISOString()} /> : null;
}
