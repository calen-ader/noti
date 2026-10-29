import { Studio } from '@/studio/Studio';

// The studio with invented example songs, kept in this browser tab only.
export default function Demo() {
  return <Studio mode="demo" me={{ id: 'demo', email: '', name: 'Calén' }} />;
}
