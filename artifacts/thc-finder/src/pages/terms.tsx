import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";

export default function Terms() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12 space-y-8 text-foreground">
      <div>
        <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-[#99CC66] transition-colors mb-6">
          <ArrowLeft className="h-4 w-4" /> Back to Map
        </Link>
        <h1 className="font-heading text-4xl text-[#99CC66] mb-2">Terms of Service</h1>
        <p className="text-sm text-muted-foreground">Effective date: June 1, 2026</p>
      </div>

      <p className="text-muted-foreground leading-relaxed">
        Welcome to Texas Hill Country Hemp Finder. By accessing or using this website you agree to
        be bound by these Terms of Service. If you do not agree, please do not use the site.
      </p>

      <section className="space-y-3">
        <h2 className="font-heading text-xl text-foreground">1. Age Requirement</h2>
        <p className="text-muted-foreground leading-relaxed">
          You must be at least <strong className="text-foreground">21 years of age</strong> to use
          this website. By confirming the age gate you represent and warrant that you meet this
          requirement. We reserve the right to terminate access for any user we believe to be under
          21.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="font-heading text-xl text-foreground">2. Hemp Products Only</h2>
        <p className="text-muted-foreground leading-relaxed">
          This directory lists retailers of <strong className="text-foreground">legal hemp-derived products</strong> as
          defined under the 2018 Farm Bill and applicable Texas state law. All listed products must
          contain no more than 0.3% Delta-9 THC by dry weight. We do not facilitate the sale of
          marijuana or any substance that is illegal under federal or Texas law.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="font-heading text-xl text-foreground">3. Business Listings</h2>
        <div className="space-y-2 text-muted-foreground leading-relaxed">
          <p>By submitting a business listing you represent that:</p>
          <ul className="list-disc list-inside space-y-1.5 ml-2">
            <li>The information provided is accurate and current.</li>
            <li>You are authorized to submit the listing on behalf of the business.</li>
            <li>The business holds all required local, state, and federal licenses and permits.</li>
            <li>The business sells only lawfully manufactured hemp-derived products.</li>
          </ul>
          <p>
            Listings are subject to admin review and may be rejected or removed at our sole
            discretion. We reserve the right to remove any listing that we believe violates these
            Terms or applicable law, without prior notice.
          </p>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="font-heading text-xl text-foreground">4. Claiming a Listing</h2>
        <p className="text-muted-foreground leading-relaxed">
          Unclaimed listings are pre-populated by our admins to help consumers find businesses.
          If you are the owner or authorized representative of a business shown on the map, you may
          submit a claim request. False or fraudulent claims may result in immediate account
          termination.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="font-heading text-xl text-foreground">5. User Accounts</h2>
        <p className="text-muted-foreground leading-relaxed">
          You are responsible for maintaining the confidentiality of your account credentials and
          for all activity that occurs under your account. Notify us immediately at{" "}
          <a href="mailto:info@texashillcountryhempfinder.com" className="text-[#99CC66] hover:underline">
            info@texashillcountryhempfinder.com
          </a>{" "}
          if you suspect unauthorized use of your account.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="font-heading text-xl text-foreground">6. Prohibited Conduct</h2>
        <ul className="list-disc list-inside space-y-1.5 text-muted-foreground leading-relaxed ml-2">
          <li>Submitting false, misleading, or fraudulent listing information.</li>
          <li>Using the site to list or promote illegal substances.</li>
          <li>Attempting to scrape, copy, or replicate the directory data at scale without written permission.</li>
          <li>Interfering with the security or functionality of the site.</li>
          <li>Using the site if you are under 21 years of age.</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="font-heading text-xl text-foreground">7. Intellectual Property</h2>
        <p className="text-muted-foreground leading-relaxed">
          The Texas Hill Country Hemp Finder name, logo, and site design are our exclusive property.
          Business owners retain ownership of the photos, logos, and text they upload; by uploading
          content you grant us a non-exclusive, royalty-free license to display that content on the
          site for the purpose of operating the directory.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="font-heading text-xl text-foreground">8. Disclaimers</h2>
        <p className="text-muted-foreground leading-relaxed">
          This site is provided <strong className="text-foreground">"as is"</strong> without
          warranties of any kind. We do not verify the accuracy of business-provided information
          beyond basic listing review, and we are not responsible for the quality, safety, legality,
          or availability of any products sold by listed businesses. Nothing on this site constitutes
          medical, legal, or financial advice.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="font-heading text-xl text-foreground">9. Limitation of Liability</h2>
        <p className="text-muted-foreground leading-relaxed">
          To the fullest extent permitted by law, Texas Hill Country Hemp Finder and its operators
          shall not be liable for any indirect, incidental, special, consequential, or punitive
          damages arising from your use of — or inability to use — this site or any listed business.
          Our total liability for any claim shall not exceed $100.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="font-heading text-xl text-foreground">10. Governing Law</h2>
        <p className="text-muted-foreground leading-relaxed">
          These Terms are governed by the laws of the State of Texas, without regard to conflict-of-law
          principles. Any dispute arising from these Terms shall be resolved exclusively in the state
          or federal courts located in Travis County, Texas.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="font-heading text-xl text-foreground">11. Changes to These Terms</h2>
        <p className="text-muted-foreground leading-relaxed">
          We reserve the right to update these Terms at any time. Changes take effect upon posting.
          Continued use of the site after changes are posted constitutes acceptance of the revised Terms.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="font-heading text-xl text-foreground">12. Contact</h2>
        <p className="text-muted-foreground leading-relaxed">
          Questions about these Terms can be sent to:{" "}
          <a href="mailto:info@texashillcountryhempfinder.com" className="text-[#99CC66] hover:underline">
            info@texashillcountryhempfinder.com
          </a>
        </p>
      </section>

      <div className="pt-4 border-t border-border">
        <Link href="/privacy" className="text-sm text-[#99CC66] hover:underline">View Privacy Policy →</Link>
      </div>
    </div>
  );
}
