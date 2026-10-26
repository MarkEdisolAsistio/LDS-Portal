import Link from "next/link";
import Image from "next/image";
import { SiteShell } from "@/components/site-shell";
import { ProductCard } from "@/components/product-card";
import { ScrollAutoplayVideo } from "@/components/scroll-autoplay-video";
import { getCategories } from "@/lib/lookups";
import { getPublishedProducts } from "@/lib/catalog";

const trainingGallery = [
  {
    src: "/training-gallery/training-9.webp",
    alt: "Automated technical training machine with an electrical control panel",
    layout:
      "col-start-1 row-start-1 aspect-[4/3] md:col-start-1 md:row-start-1 md:aspect-auto",
  },
  {
    src: "/training-gallery/training-4.webp",
    alt: "Electrical control cabinet used for hands-on technical training",
    layout:
      "col-span-2 row-start-2 aspect-[16/9] md:col-span-1 md:row-span-2 md:col-start-2 md:row-start-1 md:aspect-auto",
  },
  {
    src: "/training-gallery/training-2.webp",
    alt: "Students working with electrical control equipment in a training lab",
    layout:
      "col-start-2 row-start-1 aspect-[4/3] md:col-start-3 md:row-start-1 md:aspect-auto",
  },
  {
    src: "/training-gallery/training-7.webp",
    alt: "Students practicing electrical training with control equipment",
    layout:
      "col-start-1 row-start-3 aspect-[4/3] md:col-start-1 md:row-start-2 md:aspect-auto",
  },
  {
    src: "/training-gallery/training-5.webp",
    alt: "Close-up of a programmable logic controller training panel",
    layout:
      "col-start-2 row-start-3 aspect-[4/3] md:col-start-3 md:row-start-2 md:aspect-auto",
  },
];

export default async function Home() {
  const [categories, featured] = await Promise.all([
    getCategories(),
    getPublishedProducts({ limit: 6 }),
  ]);
  const categoryName = new Map(categories.map((c) => [c.id, c.name]));

  return (
    <SiteShell>
      <section className="home-hero" aria-labelledby="home-hero-title">
        <div className="home-hero-copy">
          <div className="home-hero-message">
            <p className="home-hero-eyebrow">Learnware</p>
            <h1 id="home-hero-title" className="home-hero-title">
              Development
              <br />
              and Standards
            </h1>
            <p className="home-hero-description">
              Teach and learn with our highly
              <br className="hidden sm:block" /> customizable training modules
            </p>
            <Link href="/about" className="home-hero-button">
              About Us
            </Link>
          </div>

          <div className="home-hero-brand">
            <Image
              src="/mfi-logo.png"
              alt="MFI Polytechnic Institute Inc."
              width={768}
              height={768}
              className="home-hero-logo"
            />
            <p>
              <span className="home-hero-institute">
                MFI Polytechnic
                <br />
                Institute Inc.
              </span>
              <span className="home-hero-formerly">Formerly Meralco Foundation</span>
              <span className="home-hero-motto">Beyond Skills, A Better Life</span>
            </p>
          </div>
        </div>

        <div className="home-hero-photo">
          <Image
            src="/training-equipment.jpg"
            alt="Hands-on electrical training equipment and control modules"
            fill
            sizes="(max-width: 768px) 100vw, 44vw"
            priority
          />
          <Image
            src="/teachlearnware-cropped.png"
            alt="Teach Learnware"
            width={1063}
            height={260}
            className="home-hero-wordmark"
          />
        </div>
      </section>

      <section className="bg-slate-50 px-6">
        <div className="mx-auto grid max-w-6xl gap-8 py-12 md:grid-cols-[0.8fr_1.2fr] md:gap-12 md:py-16">
          <div>
            <h1 className="max-w-2xl text-4xl font-semibold">
              Introduction to Learnware Development and Standards (LDS)
            </h1>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/projects"
                className="rounded-md bg-gradient-to-r from-[#07559a] to-[#007b96] px-5 py-2.5 font-medium text-white shadow-sm transition active:shadow-md hover:from-[#064579] hover:to-[#00677d] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#07559a]"
              >
                Browse projects
              </Link>
              <Link
                href="/inquiry"
                className="rounded-md border border-[#087b8c] bg-white px-5 py-2.5 font-medium text-[#07559a] transition active:bg-[#e8f5f5] active:shadow-md hover:bg-[#e8f5f5] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#07559a]"
              >
                Make an inquiry
              </Link>
            </div>
          </div>

          <div className="space-y-4 text-slate-600">
            <p>
              MFI’s department dedicated to creating training modules, manuals,
              learning systems and training solutions catering to industry
              clients, institutes and training centers.
            </p>
            <p>
              MFI’s LDS department helps enhance the process of addressing
              skills gaps in our industry clients by conducting Training Needs
              Analysis (TNA), Technical Assessment and designing a customized
              training program for their workforce.
            </p>
            <div>
              <p className="font-medium text-slate-800">
                We fabricate training modules in the following technologies:
              </p>
              <p className="mt-2">
                {categories.map((category, index) => (
                  <span key={category.id}>
                    {index > 0 ? ", " : ""}
                    {category.name}
                  </span>
                ))}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section
        aria-label="Educational training modules in action"
        className="px-6 py-8 sm:py-12"
      >
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-3 sm:gap-4 md:h-[460px] md:grid-cols-3 md:grid-rows-2">
          {trainingGallery.map((image, index) => (
            <div
              key={image.src}
              className={`relative overflow-hidden rounded-xl ${image.layout}`}
            >
              <Image
                src={image.src}
                alt={image.alt}
                fill
                sizes={
                  index === 1
                    ? "(max-width: 768px) 100vw, 33vw"
                    : "(max-width: 768px) 50vw, 33vw"
                }
                className="object-cover transition-transform duration-300 hover:scale-[1.03] active:scale-[1.03]"
              />
            </div>
          ))}
        </div>
      </section>

      <section
        aria-label="Learnware video"
        className="pb-10 sm:pb-14"
      >
        <ScrollAutoplayVideo />
      </section>

      <section className="mx-auto max-w-5xl px-6 pt-2 pb-12 sm:pt-4">
        <h2 className="mb-4 text-xl font-semibold">Categories</h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          {categories.map((c) => (
            <Link
              key={c.id}
              href={`/projects?category=${c.id}`}
              className="rounded-lg border border-[#07559a] bg-gradient-to-r from-[#07559a] to-[#007b96] p-4 font-medium text-white shadow-sm transition-all active:from-white active:to-white active:text-[#07559a] hover:from-white hover:to-white hover:text-[#07559a] focus-visible:from-white focus-visible:to-white focus-visible:text-[#07559a] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#07559a]"
            >
              {c.name}
            </Link>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-6 pb-16">
        <h2 className="mb-4 text-xl font-semibold">Latest projects</h2>
        {featured.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
            {featured.map((p) => (
              <ProductCard key={p.id} product={p} categoryName={categoryName.get(p.category_id)} />
            ))}
          </div>
        ) : (
          <p className="text-slate-600">No new projects yet. Check back soon.</p>
        )}
      </section>
    </SiteShell>
  );
}
