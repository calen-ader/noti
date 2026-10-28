import { StudentPlaceholder } from '@/components/StudentPlaceholder';

// Single-song link. The song view arrives in part 3.
export default async function SongLink({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <StudentPlaceholder rpc="published_song" token={token} pick={(d) => d?.song?.title} />;
}
