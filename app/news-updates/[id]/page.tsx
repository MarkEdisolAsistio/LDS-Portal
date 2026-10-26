import { PostDetailPage } from "@/components/news-public";

export const dynamic = "force-dynamic";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <PostDetailPage id={id} categories={["news", "update"]} base="/news-updates" backLabel="News & Updates" />;
}
