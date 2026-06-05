import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";

export default function Privacy() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12 space-y-8 text-foreground">
      <div>
        <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-[#99CC66] transition-colors mb-6">
          <ArrowLeft className="h-4 w-4" /> Back to Map
        </Link>
        <h1 className="font-heading text-4xl text-[#99CC66] mb-2">Privacy Policy</h1>
        <p className="text-sm text-muted-foreground">Effective date: June 1, 2026</p>
      </div>

      <p className="text-muted-foreground leading-relaxed">
        Texas Hill Country Hemp Finder ("we," "us," or "our") operates this website as a directory
        service for licensed hemp retailers in Texas. This Privacy Policy explains how we collect,
        use, and protect your information when you visit or use our site.
      </p>

      <section className="space-y-3">
        <h2 className="font-heading text-xl text-foreground">1. Information We Collect</h2>
        <div className="space-y-2 text-muted-foreground leading-relaxed">
          <p><strong className="text-foreground">Visitors:</strong> We collect standard web-server logs (IP address, browser type, pages visited, and timestamps) and a session cookie used solely to remember your age-verification confirmation and whether you have already seen the welcome popup.</p>
          <p><strong className="text-foreground">Registered business owners:</strong> When you create an account we collect your email address and a securely hashed password. We do not store your password in plain text.</p>
          <p><strong className="text-foreground">Business listings:</strong> Information you submit for a listing — business name, address, phone number, website, hours, photos, coupons, and brand associations — is displayed publicly on the map.</p>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="font-heading text-xl text-foreground">2. How We Use Your Information</h2>
        <ul className="list-disc list-inside space-y-1.5 text-muted-foreground leading-relaxed">
          <li>To display your business listing on the map and in search results.</li>
          <li>To send administrative emails related to your account or listing status (approval, rejection, or claim decisions).</li>
          <li>To enforce the 21+ age requirement and prevent repeat popup impressions within a session.</li>
          <li>To monitor and improve site performance and security.</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="font-heading text-xl text-foreground">3. Cookies &amp; Local Storage</h2>
        <p className="text-muted-foreground leading-relaxed">
          We use one session cookie to maintain your login state (if you are registered) and a
          sessionStorage entry to track whether you have seen the welcome popup during your current
          browser session. We use a localStorage entry to remember your age-gate confirmation across
          visits. We do not use third-party advertising or analytics cookies.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="font-heading text-xl text-foreground">4. Data Sharing</h2>
        <p className="text-muted-foreground leading-relaxed">
          We do not sell, rent, or share your personal information with third parties for marketing
          purposes. Business listing information you submit is public by design and may be indexed by
          search engines. We may disclose information if required by law or to protect the rights and
          safety of our users.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="font-heading text-xl text-foreground">5. Data Retention</h2>
        <p className="text-muted-foreground leading-relaxed">
          Account and listing data is retained for as long as your account is active. You may
          request deletion of your account and associated data by contacting us at the address below.
          Deleted listings are removed from the public map immediately.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="font-heading text-xl text-foreground">6. Security</h2>
        <p className="text-muted-foreground leading-relaxed">
          We use industry-standard measures to protect data in transit (HTTPS/TLS) and at rest.
          Passwords are hashed using bcrypt before storage. No system is perfectly secure; please
          use a strong, unique password for your account.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="font-heading text-xl text-foreground">7. Children's Privacy</h2>
        <p className="text-muted-foreground leading-relaxed">
          This site is strictly intended for adults 21 years of age and older. We do not knowingly
          collect any information from persons under 21. If you believe a minor has submitted
          information to this site, please contact us immediately.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="font-heading text-xl text-foreground">8. Changes to This Policy</h2>
        <p className="text-muted-foreground leading-relaxed">
          We may update this policy from time to time. Changes will be reflected by a revised
          effective date at the top of this page. Continued use of the site after changes
          constitutes acceptance of the updated policy.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="font-heading text-xl text-foreground">9. Contact</h2>
        <p className="text-muted-foreground leading-relaxed">
          Questions about this Privacy Policy can be sent to:{" "}
          <a href="mailto:info@texashillcountryhempfinder.com" className="text-[#99CC66] hover:underline">
            info@texashillcountryhempfinder.com
          </a>
        </p>
      </section>

      <div className="pt-4 border-t border-border">
        <Link href="/terms" className="text-sm text-[#99CC66] hover:underline">View Terms of Service →</Link>
      </div>
    </div>
  );
}
