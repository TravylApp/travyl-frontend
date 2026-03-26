import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy",
};

export default function PrivacyPolicyPage() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-16 text-foreground">
      <h1 className="text-4xl font-bold mb-2" style={{ fontFamily: "var(--font-brand)" }}>
        Privacy Policy
      </h1>
      <p className="text-sm text-muted-foreground mb-10">Last updated: March 26, 2026</p>

      <div className="space-y-8 text-[15px] leading-relaxed text-foreground/85">
        <section>
          <h2 className="text-xl font-semibold mb-3 text-foreground">1. Introduction</h2>
          <p>
            Travyl (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;) operates the website at{" "}
            <strong>gotravyl.com</strong> and the Travyl mobile applications for iOS and Android
            (collectively, the &quot;Service&quot;). This Privacy Policy explains how we collect,
            use, disclose, and safeguard your information when you use our Service.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3 text-foreground">2. Information We Collect</h2>

          <h3 className="text-base font-semibold mt-4 mb-2 text-foreground">2.1 Account Information</h3>
          <p>When you create an account, we collect:</p>
          <ul className="list-disc pl-6 mt-2 space-y-1">
            <li>Email address</li>
            <li>Display name</li>
            <li>Profile photo (optional)</li>
            <li>Authentication data from third-party providers if you sign in via Google, Apple, Facebook, or Microsoft</li>
          </ul>

          <h3 className="text-base font-semibold mt-4 mb-2 text-foreground">2.2 Trip &amp; Travel Data</h3>
          <p>When you use Travyl to plan trips, we collect:</p>
          <ul className="list-disc pl-6 mt-2 space-y-1">
            <li>Trip details: destinations, dates, budget, number of travelers</li>
            <li>Itinerary activities: names, times, locations, estimated costs, and notes</li>
            <li>Packing lists, budget entries, and saved places</li>
            <li>Travel preferences: travel style, pace, budget range, and cabin class</li>
          </ul>

          <h3 className="text-base font-semibold mt-4 mb-2 text-foreground">2.3 Usage Data</h3>
          <p>We automatically collect:</p>
          <ul className="list-disc pl-6 mt-2 space-y-1">
            <li>Interaction data (e.g., which suggestions you view, dismiss, or add to your trip) to improve recommendations</li>
            <li>Device and browser information for compatibility and debugging</li>
            <li>Audit logs of itinerary changes for collaborative editing features</li>
          </ul>

          <h3 className="text-base font-semibold mt-4 mb-2 text-foreground">2.4 Cookies &amp; Local Storage</h3>
          <p>We use:</p>
          <ul className="list-disc pl-6 mt-2 space-y-1">
            <li><strong>Essential cookies</strong>: Supabase authentication session tokens (required for sign-in)</li>
            <li><strong>Local storage</strong>: Theme preference (light/dark) and language selection</li>
          </ul>
          <p className="mt-2">We do not use advertising or third-party tracking cookies.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3 text-foreground">3. How We Use Your Information</h2>
          <ul className="list-disc pl-6 space-y-1">
            <li>To provide and maintain the Service, including trip planning and itinerary generation</li>
            <li>To personalize recommendations based on your travel preferences and past interactions</li>
            <li>To enable real-time collaborative trip editing with other users you invite</li>
            <li>To send transactional emails (e.g., trip invitations, password resets)</li>
            <li>To improve the Service through aggregated, anonymized usage analytics</li>
            <li>To detect and prevent fraud or abuse</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3 text-foreground">4. Third-Party Services</h2>
          <p>
            We use the following third-party services to operate Travyl. These services may process
            your data as described:
          </p>
          <ul className="list-disc pl-6 mt-2 space-y-2">
            <li>
              <strong>Supabase</strong> — Database hosting, user authentication, and real-time
              collaboration. Your account data, trips, and activities are stored in Supabase&apos;s
              PostgreSQL database.
            </li>
            <li>
              <strong>Amazon Web Services (AWS)</strong> — Cloud infrastructure including AI-powered
              features (Amazon Bedrock for trip enrichment and recommendations), caching (DynamoDB),
              email delivery (SES), and content delivery (CloudFront). Trip context data is processed
              by AWS services to generate personalized suggestions.
            </li>
            <li>
              <strong>Foursquare, SerpAPI, TripAdvisor</strong> — Location and venue data providers.
              When you search for destinations or activities, we send location queries (coordinates,
              place names) to these services to retrieve venue information. We do not send your
              personal data to these providers.
            </li>
            <li>
              <strong>Pexels</strong> — Destination photography. We fetch images based on destination
              names. No personal data is shared.
            </li>
            <li>
              <strong>Google, Apple, Facebook, Microsoft</strong> — OAuth authentication providers. If you
              choose to sign in with these services, we receive your name, email, and profile photo
              as authorized by you during the sign-in flow.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3 text-foreground">5. Data Sharing &amp; Collaboration</h2>
          <p>
            <strong>Trip collaborators:</strong> When you invite someone to collaborate on a trip,
            they can view and edit trip details, itinerary, packing lists, and budget. You control
            who has access and can revoke access at any time.
          </p>
          <p className="mt-2">
            <strong>Public/link-shared trips:</strong> If you set a trip&apos;s visibility to
            &quot;link&quot; or &quot;public,&quot; anyone with the link can view (but not edit) the
            trip. You can change visibility or revoke shared links at any time.
          </p>
          <p className="mt-2">
            We do not sell your personal information to third parties. We do not share your data with
            advertisers.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3 text-foreground">6. Data Retention</h2>
          <p>
            We retain your account data for as long as your account is active. Trip data is retained
            until you delete it. Recommendation cache data expires automatically (typically within 6
            hours). Interaction data used for personalization expires within 30 days.
          </p>
          <p className="mt-2">
            You can delete your account and all associated data by contacting us at the email below.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3 text-foreground">7. Data Security</h2>
          <p>
            We implement industry-standard security measures including encrypted connections (TLS),
            row-level security policies on all database tables, hashed passwords (handled by
            Supabase Auth), and access-controlled AWS infrastructure. However, no method of
            transmission over the Internet is 100% secure.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3 text-foreground">8. Your Rights</h2>
          <p>Depending on your jurisdiction, you may have the right to:</p>
          <ul className="list-disc pl-6 mt-2 space-y-1">
            <li>Access the personal data we hold about you</li>
            <li>Request correction of inaccurate data</li>
            <li>Request deletion of your data</li>
            <li>Export your trip data</li>
            <li>Withdraw consent for optional data processing</li>
          </ul>
          <p className="mt-2">To exercise these rights, contact us at the email below.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3 text-foreground">9. Children&apos;s Privacy</h2>
          <p>
            Travyl is not intended for children under 13. We do not knowingly collect personal
            information from children under 13. If you believe we have collected data from a child,
            please contact us.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3 text-foreground">10. Changes to This Policy</h2>
          <p>
            We may update this Privacy Policy from time to time. We will notify you of material
            changes by posting the new policy on this page and updating the &quot;Last updated&quot;
            date.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3 text-foreground">11. Contact Us</h2>
          <p>
            If you have questions about this Privacy Policy or your data, contact us at:{" "}
            <a href="mailto:privacy@gotravyl.com" className="text-[#1e3a5f] dark:text-[#60a5fa] underline">
              privacy@gotravyl.com
            </a>
          </p>
        </section>
      </div>
    </div>
  );
}
