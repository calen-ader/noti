import { NotFound } from '@/components/NotFound';
import { StudentShow } from '@/components/student/StudentShow';
import { publishedShow } from '@/lib/show/published';

export const dynamic = 'force-dynamic';

// Whole-show link: every song in order, the student's own songs marked.
export default async function ShowLink({ params }: { params: Promise<{ token: string }> }) {
  const p = await publishedShow((await params).token);
  return p ? <StudentShow {...p} /> : <NotFound />;
}
