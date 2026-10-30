import type { Metadata, Viewport } from 'next';
import { Schibsted_Grotesk } from 'next/font/google';
import { headers } from 'next/headers';
import './globals.css';

const ui = Schibsted_Grotesk({ variable: '--font-ui', subsets: ['latin'], weight: 'variable', style: ['normal', 'italic'] });

export const metadata: Metadata = {
  title: 'Noti',
  description: 'Las canciones de la muestra, siempre al día.',
  appleWebApp: { capable: true, title: 'Noti', statusBarStyle: 'default' },
};

export const viewport: Viewport = { viewportFit: 'cover', width: 'device-width', initialScale: 1 };

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  await headers(); // render every page per request, so each gets the fresh script nonce from src/proxy.ts
  return (
    <html lang="es" className={ui.variable}>
      <body>{children}</body>
    </html>
  );
}
