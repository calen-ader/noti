import type { StudioStore } from './store';

export type StudioMode = 'studio' | 'student' | 'demo' | 'signin';

// an error to show, a mail that was sent ('link' or 'confirm'), or nothing because the page is already moving on
export type AuthResult = { error?: string; sent?: 'link' | 'confirm' };

export type Boot = {
  mode: StudioMode;
  me?: { id: string; email: string; name: string } | null;
  data?: unknown;
  open?: string | null;
  store?: StudioStore | null;
  signIn?: (email: string) => Promise<AuthResult>;
  signInPassword?: (email: string, password: string) => Promise<AuthResult>;
  signUp?: (email: string, password: string) => Promise<AuthResult>;
  google?: () => Promise<string | null>;
  setPassword?: (password: string) => Promise<string | null>;
  signOut?: () => Promise<void>;
};

export function mount(stage: HTMLElement, boot: Boot): { flush: () => Promise<void> };
