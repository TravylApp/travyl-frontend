import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Travel Blog",
};

const POSTS = [
  {
    slug: "how-to-plan-a-weekend-trip",
    title: "How to Plan a Weekend Trip in 30 Minutes",
    excerpt:
      "Short on time? Here's how to go from zero to a fully planned weekend getaway using Travyl's AI-powered trip planner.",
    category: "Tips & Tricks",
    date: "May 1, 2026",
  },
  {
    slug: "best-solo-travel-destinations-2026",
    title: "Best Solo Travel Destinations for 2026",
    excerpt:
      "From Tokyo to Lisbon, discover the top destinations for solo travelers looking for adventure, culture, and connection.",
    category: "Destinations",
    date: "April 22, 2026",
  },
  {
    slug: "group-trip-planning-made-easy",
    title: "Group Trip Planning Made Easy",
    excerpt:
      "Planning a trip with friends doesn't have to be chaotic. Learn how real-time collaboration keeps everyone aligned.",
    category: "Guides",
    date: "April 10, 2026",
  },
  {
    slug: "packing-light-smart-strategies",
    title: "Packing Light: Smart Strategies for Any Trip",
    excerpt:
      "Travel lighter and smarter with these essential packing strategies that work whether you're gone for a weekend or a month.",
    category: "Tips & Tricks",
    date: "March 28, 2026",
  },
  {
    slug: "why-collaborative-travel-planning-works",
    title: "Why Collaborative Travel Planning Works Better",
    excerpt:
      "Stop the back-and-forth. Here's why planning together in real time leads to better trips and happier travel companions.",
    category: "Guides",
    date: "March 15, 2026",
  },
] as const;

export default function BlogPage() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-16 text-foreground">
      <h1
        className="text-4xl font-bold mb-2"
        style={{ fontFamily: "var(--font-brand)" }}
      >
        Travel Blog
      </h1>
      <p className="text-[15px] text-foreground/70 mb-12">
        Travel tips, destination guides, and stories from the road.
      </p>

      <div className="space-y-8">
        {POSTS.map((post) => (
          <article
            key={post.slug}
            className="group border-b border-foreground/10 pb-8 last:border-b-0"
          >
            <div className="flex items-center gap-3 text-xs text-foreground/50 mb-2">
              <span className="font-medium text-[#1e3a5f] dark:text-[#60a5fa]">
                {post.category}
              </span>
              <span>&middot;</span>
              <time>{post.date}</time>
            </div>
            <Link href={`/blog/${post.slug}`}>
              <h2 className="text-xl font-semibold mb-2 text-foreground group-hover:text-[#1e3a5f] dark:group-hover:text-[#60a5fa] transition-colors">
                {post.title}
              </h2>
            </Link>
            <p className="text-[15px] text-foreground/70 leading-relaxed">
              {post.excerpt}
            </p>
          </article>
        ))}
      </div>
    </div>
  );
}
