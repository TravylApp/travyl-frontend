import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service",
};

export default function TermsOfServicePage() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-16 text-foreground">
      <h1 className="text-4xl font-bold mb-2" style={{ fontFamily: "var(--font-brand)" }}>
        Terms of Service
      </h1>
      <p className="text-sm text-muted-foreground mb-10">Last updated: March 26, 2026</p>

      <div className="space-y-8 text-[15px] leading-relaxed text-foreground/85">
        <section>
          <h2 className="text-xl font-semibold mb-3 text-foreground">1. Acceptance of Terms</h2>
          <p>
            By accessing or using Travyl (&quot;the Service&quot;), operated at{" "}
            <strong>gotravyl.com</strong> and through our iOS and Android mobile applications, you
            agree to be bound by these Terms of Service. If you do not agree, do not use the
            Service.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3 text-foreground">2. Description of Service</h2>
          <p>
            Travyl is a collaborative travel planning platform. The Service allows you to create
            trips, build day-by-day itineraries, discover destinations and activities, collaborate
            with other users in real time, and organize travel logistics including packing lists,
            budgets, and saved places.
          </p>
          <p className="mt-2">
            Travyl does not directly sell or book flights, hotels, or other travel services. When
            booking links are provided, they redirect to third-party providers. We are not
            responsible for the accuracy, availability, or pricing of third-party travel services.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3 text-foreground">3. User Accounts</h2>
          <ul className="list-disc pl-6 space-y-1">
            <li>You must be at least 13 years old to create an account.</li>
            <li>You are responsible for maintaining the security of your account credentials.</li>
            <li>You may sign up using email/password or through Google, Apple, Facebook, or Microsoft authentication.</li>
            <li>You agree to provide accurate and current information when creating your account.</li>
            <li>We reserve the right to suspend or terminate accounts that violate these terms.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3 text-foreground">4. User Content</h2>
          <p>
            &quot;User Content&quot; includes trips, itineraries, activities, notes, packing lists,
            budget entries, saved places, and any other content you create or upload through the
            Service.
          </p>
          <ul className="list-disc pl-6 mt-2 space-y-1">
            <li>
              <strong>Ownership:</strong> You retain ownership of your User Content. By using the
              Service, you grant us a limited, non-exclusive license to store, display, and transmit
              your content as necessary to operate the Service (e.g., showing your trip to
              collaborators you invite).
            </li>
            <li>
              <strong>Shared content:</strong> When you invite collaborators to a trip or set a trip
              to &quot;public&quot; or &quot;link&quot; visibility, you grant those users permission
              to view and (if granted editor access) modify the trip content.
            </li>
            <li>
              <strong>Deletion:</strong> You may delete your trips and content at any time. Deleted
              content is removed from our active systems, though it may persist in backups for a
              limited period.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3 text-foreground">5. Acceptable Use</h2>
          <p>You agree not to:</p>
          <ul className="list-disc pl-6 mt-2 space-y-1">
            <li>Use the Service for any unlawful purpose</li>
            <li>Upload content that is defamatory, obscene, or infringes on intellectual property rights</li>
            <li>Attempt to gain unauthorized access to other users&apos; accounts or data</li>
            <li>Use automated scripts, bots, or scrapers to access the Service</li>
            <li>Interfere with or disrupt the Service&apos;s infrastructure</li>
            <li>Impersonate another person or entity</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3 text-foreground">6. AI-Generated Content</h2>
          <p>
            Travyl uses artificial intelligence (powered by AWS Bedrock) to generate trip
            recommendations, activity suggestions, packing list suggestions, and destination
            enrichment data. This content is provided for informational purposes only.
          </p>
          <ul className="list-disc pl-6 mt-2 space-y-1">
            <li>AI-generated suggestions may contain inaccuracies regarding prices, hours, availability, or other details.</li>
            <li>You are responsible for verifying the accuracy of any information before making travel decisions or bookings.</li>
            <li>We do not guarantee the accuracy, completeness, or timeliness of AI-generated content.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3 text-foreground">7. Third-Party Services</h2>
          <p>
            The Service integrates with third-party providers for venue data (Foursquare,
            TripAdvisor, SerpAPI), images (Pexels), mapping, weather, and other travel information.
            We are not responsible for the content, accuracy, or availability of these third-party
            services.
          </p>
          <p className="mt-2">
            Links to external booking sites (airlines, hotels, etc.) are provided as a convenience.
            Your transactions with third-party providers are solely between you and those providers.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3 text-foreground">8. Intellectual Property</h2>
          <p>
            The Travyl name, logo, and all related branding, designs, and software are the property
            of Travyl and are protected by applicable intellectual property laws. You may not copy,
            modify, distribute, or create derivative works of the Service without our prior written
            consent.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3 text-foreground">9. Limitation of Liability</h2>
          <p>
            To the maximum extent permitted by law, Travyl and its operators shall not be liable for
            any indirect, incidental, special, consequential, or punitive damages resulting from your
            use of the Service, including but not limited to:
          </p>
          <ul className="list-disc pl-6 mt-2 space-y-1">
            <li>Travel plans that do not proceed as expected</li>
            <li>Inaccurate information from AI-generated content or third-party data providers</li>
            <li>Loss of data due to service interruptions</li>
            <li>Unauthorized access to your account</li>
          </ul>
          <p className="mt-2">
            The Service is provided &quot;as is&quot; and &quot;as available&quot; without warranties
            of any kind, express or implied.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3 text-foreground">10. Account Termination</h2>
          <p>
            You may delete your account at any time by contacting us. We may suspend or terminate
            your account if you violate these terms or engage in activity that harms the Service or
            other users. Upon termination, your right to use the Service ceases immediately.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3 text-foreground">11. Changes to These Terms</h2>
          <p>
            We may update these Terms of Service from time to time. We will notify you of material
            changes by posting the updated terms on this page and updating the &quot;Last
            updated&quot; date. Continued use of the Service after changes constitutes acceptance of
            the new terms.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3 text-foreground">12. Governing Law</h2>
          <p>
            These Terms shall be governed by and construed in accordance with the laws of the State
            of California, without regard to its conflict of law provisions.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3 text-foreground">13. Contact Us</h2>
          <p>
            If you have questions about these Terms of Service, contact us at:{" "}
            <a href="mailto:legal@gotravyl.com" className="text-[#1e3a5f] dark:text-[#60a5fa] underline">
              legal@gotravyl.com
            </a>
          </p>
        </section>
      </div>
    </div>
  );
}
