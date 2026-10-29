import type { StudioStore } from './store';

export type StudioMode = 'studio' | 'student' | 'demo' | 'signin';

export type Boot = {
  mode: StudioMode;
  me?: { id: string; email: string; name: string } | null;
  data?: unknown;
  open?: string | null;
  store?: StudioStore | null;
  signIn?: (email: string) => Promise<string | null>;
  signOut?: () => Promise<void>;
};

export function mount(stage: HTMLElement, boot: Boot): { flush: () => Promise<void> };
