import { NotFound } from '@/components/NotFound';
import { StudentShow } from '@/components/student/StudentShow';
import { publishedSong } from '@/lib/show/published';

export const dynamic = 'force-dynamic';

// Single-song link.
export default async function SongLink({ params }: { params: Promise<{ token: string }> }) {
  const p = await publishedSong((await params).token);
  return p ? <StudentShow {...p} /> : <NotFound />;
}
