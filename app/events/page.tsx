import { PostListPage } from "@/components/news-public";

export const dynamic = "force-dynamic";

export default function EventsPage() {
  return (
    <PostListPage
      title="Events"
      intro="Upcoming events, activities, and training opportunities."
      empty="There are no events to display yet. Check back soon."
      categories={["event"]}
      base="/events"
    />
  );
}
