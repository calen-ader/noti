import type { Metadata, Viewport } from 'next';
import { Schibsted_Grotesk } from 'next/font/google';
import './globals.css';

const ui = Schibsted_Grotesk({ variable: '--font-ui', subsets: ['latin'], weight: 'variable', style: ['normal', 'italic'] });

export const metadata: Metadata = {
  title: 'Noti',
  description: 'Las canciones de la muestra, siempre al día.',
  appleWebApp: { capable: true, title: 'Noti', statusBarStyle: 'default' },
};

export const viewport: Viewport = { viewportFit: 'cover', width: 'device-width', initialScale: 1 };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" className={ui.variable}>
      <body>{children}</body>
    </html>
  );
}
