import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "About Us",
};

export default function AboutPage() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-16 text-foreground">
      <h1 className="text-4xl font-bold mb-6" style={{ fontFamily: "var(--font-brand)" }}>
        About Travyl
      </h1>

      <div className="space-y-6 text-[15px] leading-relaxed text-foreground/85">
        <p className="text-lg text-foreground/90">
          Travyl is a collaborative travel planning platform that helps you go from idea to
          itinerary in minutes.
        </p>

        <p>
          We believe trip planning should be exciting, not exhausting. Whether you&apos;re mapping
          out a solo backpacking adventure, coordinating a family vacation, or organizing a group
          trip with friends, Travyl gives you everything in one place: destinations, day-by-day
          itineraries, hotels, flights, restaurants, packing lists, and budgets.
        </p>

        <p>
          Built for real collaboration, Travyl lets you plan together in real time. Invite your
          travel partners, edit the calendar simultaneously, vote on activities, and keep everyone on
          the same page — literally.
        </p>

        <h2 className="text-xl font-semibold mt-8 mb-3 text-foreground">What makes Travyl different</h2>
        <ul className="list-disc pl-6 space-y-2">
          <li>
            <strong>AI-powered planning</strong> — Tell us where you want to go and we&apos;ll
            generate a personalized itinerary with activities, restaurants, and logistics tailored to
            your preferences.
          </li>
          <li>
            <strong>Real-time collaboration</strong> — Plan together on a shared calendar. See
            changes as they happen, no refresh needed.
          </li>
          <li>
            <strong>Everything in one place</strong> — Hotels, flights, restaurants, activities,
            packing lists, budgets, and notes. No more juggling 10 tabs and a shared spreadsheet.
          </li>
          <li>
            <strong>Works everywhere</strong> — Available on web, iOS, and Android. Your trips sync
            across all your devices.
          </li>
        </ul>

        <h2 className="text-xl font-semibold mt-8 mb-3 text-foreground">Get in touch</h2>
        <p>
          Have questions, feedback, or partnership inquiries? Reach out at{" "}
          <a href="mailto:hello@gotravyl.com" className="text-[#1e3a5f] dark:text-[#60a5fa] underline">
            hello@gotravyl.com
          </a>
        </p>
        <p>
          Follow us on{" "}
          <a
            href="https://instagram.com/travyl"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#1e3a5f] dark:text-[#60a5fa] underline"
          >
            Instagram
          </a>{" "}
          for travel inspiration and product updates.
        </p>

        <div className="mt-10 pt-6 border-t border-foreground/10">
          <p className="text-sm text-muted-foreground">
            <Link href="/privacy" className="underline hover:text-foreground transition-colors">Privacy Policy</Link>
            {" "}&middot;{" "}
            <Link href="/terms" className="underline hover:text-foreground transition-colors">Terms of Service</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
