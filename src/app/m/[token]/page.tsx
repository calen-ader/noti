import { StudentPlaceholder } from '@/components/StudentPlaceholder';

// Whole-show link. The show view (pick your name, my lines) arrives in part 3.
export default async function ShowLink({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <StudentPlaceholder rpc="published_show" token={token} pick={(d) => d?.title} />;
}
