import { PostListPage } from "@/components/news-public";

export const dynamic = "force-dynamic";

export default function BlogArticlesPage() {
  return (
    <PostListPage
      title="Blog Articles"
      intro="Articles, insights, and learning resources from our team."
      empty="There are no blog articles to display yet. Check back soon."
      categories={["article"]}
      base="/blog-articles"
    />
  );
}
