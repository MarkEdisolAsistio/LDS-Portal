import Link from "next/link";
import Image from "next/image";
import { NavDropdown } from "@/components/nav-dropdown";
import { SiteSearch } from "@/components/site-search";
import { ThemeToggle } from "@/components/theme-toggle";
import { SiteMobileNav } from "@/components/site-mobile-nav";
import { ProjectsMenu, type MenuProject } from "@/components/projects-menu";
import { getPublishedProducts } from "@/lib/catalog";
import { getCategories, type Category } from "@/lib/lookups";

const LINKS = [{ href: "/", label: "Home" }];

// The 3 newest published modules, for the Projects menu. The header must never break, so errors give an empty menu.
async function latestProjects(categories: Category[]): Promise<MenuProject[]> {
  try {
    const names = new Map(categories.map((c) => [c.id, c.name]));
    const products = await getPublishedProducts({ limit: 3 });
    return products.map((p) => ({
      id: p.id,
      title: p.title,
      blurb: p.summary ?? p.description ?? "",
      category: names.get(p.category_id) ?? "",
      image: p.image_urls[0] ?? null,
    }));
  } catch {
    return [];
  }
}

// Header and footer shared by every public page.
export async function SiteShell({ children }: { children: React.ReactNode }) {
  const categories = await getCategories();
  const projects = await latestProjects(categories);
  return (
    <div className="flex min-h-screen flex-col bg-white text-slate-900">
      <header className="site-header sticky top-0 z-50 border-b border-white/15 bg-[#0b446a] text-white shadow-[0_6px_24px_rgba(8,38,60,0.18)]">
        <div className="flex w-full flex-nowrap items-center justify-between gap-2 px-2 py-2 md:flex-wrap md:gap-3 md:pl-3 md:pr-6">
          <Link href="/" className="site-brand min-w-0">
            <Image
              src="/mfi-logo.png"
              alt=""
              width={768}
              height={768}
              className="site-brand-logo"
              style={{ width: "clamp(36px, 9vw, 48px)", height: "clamp(36px, 9vw, 48px)" }}
            />
            <span className="site-brand-copy">
              <span className="site-brand-institute">
                MFI Polytechnic
                <br />
                Institute Inc.
              </span>
            </span>
            <span className="site-brand-divider hidden sm:block" aria-hidden="true">
              |
            </span>
            <span className="site-brand-details hidden sm:flex">
              <span className="site-brand-formerly">Formerly Meralco Foundation</span>
              <span className="site-brand-motto">Beyond Skills, A Better Life</span>
            </span>
          </Link>
          <nav className="hidden flex-wrap items-center gap-5 text-sm md:flex">
            {LINKS.map((l) => (
              <Link key={l.href} href={l.href} className="text-slate-100 transition-colors hover:text-white">
                {l.label}
              </Link>
            ))}
            <ProjectsMenu projects={projects} />
            <NavDropdown
              label="About Us"
              items={[
                { href: "/about-lds", label: "About LDS" },
                { href: "/about-mfi", label: "About MFI" },
              ]}
            />
            <NavDropdown
              label="What's New"
              items={[
                { href: "/news-updates", label: "News & Updates" },
                { href: "/blog-articles", label: "Blog Articles" },
                { href: "/events", label: "Events" },
              ]}
            />
            <Link href="/inquiry" className="text-slate-100 transition-colors hover:text-white">
              Inquiry
            </Link>
            <SiteSearch />
            <ThemeToggle />
          </nav>
          <SiteMobileNav />
        </div>
      </header>

      <div className="flex-1">{children}</div>

      <footer className="bg-[#101b25] text-slate-300">
        <div className="mx-auto grid max-w-7xl gap-10 px-6 py-12 sm:grid-cols-2 lg:grid-cols-[1.1fr_0.8fr_0.9fr_1.4fr] lg:gap-10 lg:px-8">
          <section>
            <Link href="/" className="inline-flex items-center gap-3 text-white">
              <Image
                src="/mfi-logo.png"
                alt=""
                width={56}
                height={56}
                className="h-14 w-14 object-contain"
              />
              <span>
                <span className="block font-semibold uppercase leading-tight">MFI Polytechnic</span>
                <span className="block font-semibold uppercase leading-tight">Institute Inc.</span>
              </span>
            </Link>
            <p className="mt-4 max-w-sm text-sm leading-6 text-slate-400">
              <span className="italic">Formerly Meralco Foundation</span>
              <br />
              Beyond Skills, A Better Life.
            </p>
          </section>

          <nav aria-label="Footer navigation">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-white">Navigation</h2>
            <ul className="mt-4 space-y-2 text-sm">
              <li><Link href="/" className="transition-colors hover:text-white">Home</Link></li>
              <li><Link href="/projects" className="transition-colors hover:text-white">Projects</Link></li>
              <li><Link href="/about-lds" className="transition-colors hover:text-white">About LDS</Link></li>
              <li><Link href="/about-mfi" className="transition-colors hover:text-white">About MFI</Link></li>
              <li><Link href="/news-updates" className="transition-colors hover:text-white">News &amp; Updates</Link></li>
              <li><Link href="/inquiry" className="transition-colors hover:text-white">Inquiry</Link></li>
            </ul>
          </nav>

          <nav aria-label="Our pillars">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-white">Our pillars</h2>
            <ul className="mt-4 space-y-2 text-sm">
              {categories.map((category) => (
                <li key={category.id}>
                  <Link
                    href={`/projects?category=${category.id}`}
                    className="transition-colors hover:text-white"
                  >
                    {category.name}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <section>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-white">Contact us</h2>
            <address className="mt-4 space-y-3 text-sm not-italic leading-6">
              <p>MFI Building, Ortigas Avenue, Brgy. Ugong, Pasig City 1604</p>
              <p><a href="mailto:LDS@mfi.edu.ph" className="transition-colors hover:text-white">LDS@mfi.edu.ph</a></p>
              <p><a href="tel:+639151320160" className="transition-colors hover:text-white">0915 132 0160</a></p>
            </address>

            <h3 className="mt-6 text-sm font-semibold uppercase tracking-wide text-white">Follow us</h3>
            <ul className="mt-3 flex gap-3">
              <li>
                <a href="https://www.facebook.com/MFIPolytechnic" target="_blank" rel="noreferrer" aria-label="MFI Polytechnic on Facebook" className="group flex h-10 w-10 items-center justify-center rounded border border-white/15 transition-colors hover:border-white/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">
                  <svg viewBox="0 0 24 24" className="h-5 w-5 transition-[filter] duration-150 group-hover:invert group-focus-visible:invert" fill="#1877F2" aria-hidden="true"><path d="M13.5 21v-8.2h2.8l.4-3.2h-3.2V7.5c0-.9.3-1.5 1.6-1.5h1.7V3.1c-.3 0-1.3-.1-2.5-.1-2.5 0-4.2 1.5-4.2 4.3v2.3H7.3v3.2h2.8V21h3.4Z" /></svg>
                </a>
              </li>
              <li>
                <a href="https://www.instagram.com/mfipolytechnic/" target="_blank" rel="noreferrer" aria-label="MFI Polytechnic on Instagram" className="group flex h-10 w-10 items-center justify-center rounded border border-white/15 transition-colors hover:border-white/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">
                  <svg viewBox="0 0 24 24" className="h-5 w-5 transition-[filter] duration-150 group-hover:invert group-focus-visible:invert" fill="none" stroke="url(#footer-instagram-gradient)" strokeWidth="1.8" aria-hidden="true"><defs><linearGradient id="footer-instagram-gradient" x1="2" y1="22" x2="22" y2="2" gradientUnits="userSpaceOnUse"><stop stopColor="#FEDA75" /><stop offset=".32" stopColor="#FA7E1E" /><stop offset=".62" stopColor="#D62976" /><stop offset="1" stopColor="#4F5BD5" /></linearGradient></defs><rect x="3.5" y="3.5" width="17" height="17" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.7" cy="6.5" r="1" fill="#D62976" stroke="none" /></svg>
                </a>
              </li>
              <li>
                <a href="https://www.tiktok.com/@mfipolytechnic" target="_blank" rel="noreferrer" aria-label="MFI Polytechnic on TikTok" className="group flex h-10 w-10 items-center justify-center rounded border border-white/15 transition-colors hover:border-white/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">
                  <svg viewBox="0 0 24 24" className="h-5 w-5 transition-[filter] duration-150 group-hover:invert group-focus-visible:invert" aria-hidden="true"><path d="M16.7 3c.3 2 1.5 3.5 3.3 4.2v3.2a9 9 0 0 1-3.3-1.1v6.3a5.8 5.8 0 1 1-5.8-5.8c.4 0 .8 0 1.2.1v3.3a2.7 2.7 0 1 0 1.5 2.4V3h3.1Z" transform="translate(-.8 .45)" fill="#25F4EE" /><path d="M16.7 3c.3 2 1.5 3.5 3.3 4.2v3.2a9 9 0 0 1-3.3-1.1v6.3a5.8 5.8 0 1 1-5.8-5.8c.4 0 .8 0 1.2.1v3.3a2.7 2.7 0 1 0 1.5 2.4V3h3.1Z" transform="translate(.65 -.35)" fill="#FE2C55" /><path d="M16.7 3c.3 2 1.5 3.5 3.3 4.2v3.2a9 9 0 0 1-3.3-1.1v6.3a5.8 5.8 0 1 1-5.8-5.8c.4 0 .8 0 1.2.1v3.3a2.7 2.7 0 1 0 1.5 2.4V3h3.1Z" fill="#fff" /></svg>
                </a>
              </li>
              <li>
                <a href="https://www.youtube.com/@mfipolytechnic" target="_blank" rel="noreferrer" aria-label="MFI Polytechnic on YouTube" className="group flex h-10 w-10 items-center justify-center rounded border border-white/15 transition-colors hover:border-white/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">
                  <svg viewBox="0 0 24 24" className="h-5 w-5 transition-[filter] duration-150 group-hover:invert group-focus-visible:invert" aria-hidden="true"><path d="M23 7.2a3 3 0 0 0-2.1-2.1C19 4.6 12 4.6 12 4.6s-7 0-8.9.5A3 3 0 0 0 1 7.2 31 31 0 0 0 .5 12c0 1.6.2 3.2.5 4.8a3 3 0 0 0 2.1 2.1c1.9.5 8.9.5 8.9.5s7 0 8.9-.5a3 3 0 0 0 2.1-2.1c.3-1.6.5-3.2.5-4.8s-.2-3.2-.5-4.8Z" fill="#FF0033" /><path d="m9.8 15.5v-7l6 3.5-6 3.5Z" fill="#fff" /></svg>
                </a>
              </li>
            </ul>
          </section>
        </div>

        <div className="border-t border-white/10 bg-black/15">
          <div className="mx-auto flex max-w-7xl flex-col gap-3 px-6 py-4 text-sm text-slate-400 sm:flex-row sm:items-center sm:justify-between lg:px-8">
            <span>LDS Department</span>
            <Link href="/login" className="transition-colors hover:text-white">
              Staff sign in
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
