import type { Metadata } from 'next';
import { DemoShow } from './DemoShow';

export const metadata: Metadata = { title: 'Noti · prueba' };

export default function Demo() {
  return <DemoShow />;
}
