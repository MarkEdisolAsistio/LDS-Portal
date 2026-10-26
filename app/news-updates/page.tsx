import { PostListPage } from "@/components/news-public";

export const dynamic = "force-dynamic";

export default function NewsUpdatesPage() {
  return (
    <PostListPage
      title="News & Updates"
      intro="Updates and announcements from MFI Polytechnic Institute."
      empty="There are no news or updates to display yet. Check back soon."
      categories={["news", "update"]}
      base="/news-updates"
    />
  );
}
