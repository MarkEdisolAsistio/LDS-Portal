import { getPublishedProducts, type PublicProduct } from "@/lib/catalog";
import { getCategories } from "@/lib/lookups";

const SITE_PAGES = [
  {
    href: "/",
    title: "Home",
    description:
      "Educational trainer modules for hands-on technical learning in mechatronics, electronics, electrical, instrumentation, and automation.",
  },
  {
    href: "/projects",
    title: "Projects",
    description:
      "Browse training modules, categories, and ready-made products. Find a trainer or request a custom build.",
  },
  {
    href: "/about-lds",
    title: "About LDS",
    description:
      "Learn about the LDS department, which designs, builds, and supplies educational trainer modules for clients and teams.",
  },
  {
    href: "/about-mfi",
    title: "About MFI",
    description:
      "Learn about MFI Polytechnic Institute Inc., formerly Meralco Foundation, and its Beyond Skills, A Better Life motto.",
  },
  {
    href: "/news-updates",
    title: "News & Updates",
    description: "Updates and announcements from MFI Polytechnic Institute.",
  },
  {
    href: "/blog-articles",
    title: "Blog Articles",
    description: "Articles, insights, and learning resources from our team.",
  },
  {
    href: "/events",
    title: "Events",
    description: "Upcoming events, activities, and training opportunities.",
  },
  {
    href: "/inquiry",
    title: "Inquiry",
    description:
      "Make an inquiry to buy a trainer module or request a customized build.",
  },
];

type SearchResultBase = {
  href: string;
  title: string;
  description: string;
  score: number;
  matchedTerms: number;
};

export type SiteSearchResult =
  | (SearchResultBase & {
      type: "page";
    })
  | (SearchResultBase & {
      type: "product";
      product: PublicProduct;
      categoryName?: string;
    });

function matchScore(query: string, terms: string[], searchable: string, title: string) {
  const normalizedTitle = title.toLocaleLowerCase();
  const matchedTerms = terms.filter((term) => searchable.includes(term)).length;
  const score =
    matchedTerms +
    (normalizedTitle.startsWith(query.toLocaleLowerCase()) ? terms.length + 1 : 0);

  return { score, matchedTerms };
}

export async function searchSiteContent(query: string): Promise<SiteSearchResult[]> {
  const normalizedQuery = query.trim();
  const terms = [
    ...new Set(normalizedQuery.toLocaleLowerCase().split(/\s+/).filter(Boolean)),
  ];
  if (!terms.length) return [];

  const [products, categories] = await Promise.all([
    getPublishedProducts({ limit: 1000 }),
    getCategories(),
  ]);
  const categoryNames = new Map(categories.map((category) => [category.id, category.name]));
  const pageResults: SiteSearchResult[] = SITE_PAGES.flatMap((page) => {
    const { score, matchedTerms } = matchScore(
      normalizedQuery,
      terms,
      `${page.title} ${page.description}`.toLocaleLowerCase(),
      page.title
    );
    return matchedTerms
      ? [{ ...page, type: "page" as const, score, matchedTerms }]
      : [];
  });
  const productResults: SiteSearchResult[] = products.flatMap((product) => {
    const categoryName = categoryNames.get(product.category_id);
    const searchable =
      `${product.title} ${product.description ?? ""} ${categoryName ?? ""}`.toLocaleLowerCase();
    const { score, matchedTerms } = matchScore(
      normalizedQuery,
      terms,
      searchable,
      product.title
    );

    return matchedTerms
      ? [
          {
            type: "product" as const,
            href: `/projects/${product.id}`,
            title: product.title,
            description: product.description ?? "",
            product,
            categoryName,
            score,
            matchedTerms,
          },
        ]
      : [];
  });

  return [...pageResults, ...productResults]
    .sort(
      (a, b) =>
        b.score - a.score ||
        b.matchedTerms - a.matchedTerms ||
        a.title.localeCompare(b.title)
    );
}
