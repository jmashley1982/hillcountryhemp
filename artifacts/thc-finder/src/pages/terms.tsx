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
        <p className="text-sm text-muted-foreground">Last updated: June 1, 2026</p>
      </div>

      <p className="text-muted-foreground leading-relaxed">
        Please read these Terms of Service carefully. By accessing or using Texas Hill Country Hemp
        Finder ("THC Hemp Finder," "we," "us," or "our") you agree to be bound by these Terms. If
        you do not agree, please do not use the service.
      </p>

      <section className="space-y-3">
        <h2 className="font-heading text-xl text-foreground">1. Age Restriction (21+)</h2>
        <p className="text-muted-foreground leading-relaxed">
          This platform is intended <strong className="text-foreground">only</strong> for
          individuals who are at least 21 years of age. By confirming the age gate or continuing to
          use the site, you represent and warrant that you meet this requirement. We do not knowingly
          collect information from anyone under 21. If we learn that a person under 21 has used the
          site we will block access and delete any related data promptly.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="font-heading text-xl text-foreground">2. Service Description</h2>
        <p className="text-muted-foreground leading-relaxed">
          THC Hemp Finder is an interactive directory and map connecting adult consumers with local
          businesses that sell legal hemp products and smoking accessories in Texas. We want to be
          clear about what we are <em>not</em>:
        </p>
        <ul className="list-disc list-inside space-y-1.5 text-muted-foreground leading-relaxed ml-2">
          <li>We do not sell, manufacture, or distribute any hemp or cannabis products.</li>
          <li>We do not vouch for the quality, legality, or safety of any product sold by a listed business.</li>
          <li>We do not provide medical advice or endorse any product for therapeutic use.</li>
        </ul>
        <p className="text-muted-foreground leading-relaxed">
          All information on the site is provided for general informational purposes only.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="font-heading text-xl text-foreground">3. Business Listings &amp; User-Generated Content</h2>
        <div className="space-y-4 text-muted-foreground leading-relaxed">
          <div>
            <p className="font-semibold text-foreground mb-1">3.1 Accuracy</p>
            <p>
              Businesses that register and create listings are solely responsible for the accuracy
              of their information — including address, hours, products, and coupons. We do not
              independently verify listing content, though we reserve the right to approve, reject,
              or remove any listing at our sole discretion.
            </p>
          </div>
          <div>
            <p className="font-semibold text-foreground mb-1">3.2 License to Display</p>
            <p>
              By submitting a listing you grant us a non-exclusive, royalty-free, worldwide license
              to display, reproduce, and distribute your submitted content — including logos, photos,
              and coupon images — solely in connection with operating this platform.
            </p>
          </div>
          <div>
            <p className="font-semibold text-foreground mb-1">3.3 Prohibited Content</p>
            <p>Listings must not contain:</p>
            <ul className="list-disc list-inside space-y-1 ml-2 mt-1">
              <li>False or misleading claims.</li>
              <li>Content promoting illegal substances or activities.</li>
              <li>Images or text that infringe on third-party intellectual property.</li>
              <li>Offensive, defamatory, or obscene material.</li>
            </ul>
            <p className="mt-1">We may remove any content that violates these terms without prior notice.</p>
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="font-heading text-xl text-foreground">4. Coupons &amp; Promotions</h2>
        <p className="text-muted-foreground leading-relaxed">
          Coupons displayed on business detail pages are uploaded and managed exclusively by the
          respective business. THC Hemp Finder is not a party to any transaction between a customer
          and a business, and we make no guarantees regarding the validity, redemption, or value of
          any coupon. Any disputes or issues with a coupon must be resolved directly with the
          issuing business.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="font-heading text-xl text-foreground">5. Advertising</h2>
        <div className="space-y-4 text-muted-foreground leading-relaxed">
          <div>
            <p className="font-semibold text-foreground mb-1">5.1 Ad Sales</p>
            <p>
              All advertising — including featured listings, banner ads, popup ads, and featured
              brands — is sold directly by THC Hemp Finder. Advertisers agree to provide content
              that complies with all applicable laws and our content standards. We reserve the right
              to reject or remove any advertisement for any reason.
            </p>
          </div>
          <div>
            <p className="font-semibold text-foreground mb-1">5.2 No Endorsement</p>
            <p>
              Featured listings, banners, popup ads, and featured brands are paid placements.
              Display of an advertisement does not imply our endorsement of the advertiser or their
              products, nor does it create any liability on our part for the advertiser's products
              or services.
            </p>
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="font-heading text-xl text-foreground">6. Intellectual Property</h2>
        <p className="text-muted-foreground leading-relaxed">
          The THC Hemp Finder name, logo, site design, and custom code are owned by us. You may not
          copy, modify, or redistribute any part of the platform without our written permission. All
          business trademarks, logos, and brand names remain the property of their respective owners.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="font-heading text-xl text-foreground">7. Disclaimers &amp; Limitation of Liability</h2>
        <div className="space-y-4 text-muted-foreground leading-relaxed">
          <div>
            <p className="font-semibold text-foreground mb-1">7.1 General Disclaimer</p>
            <p className="uppercase text-sm">
              The service is provided "as is" and "as available" without warranties of any kind,
              either express or implied, including but not limited to implied warranties of
              merchantability, fitness for a particular purpose, or non-infringement.
            </p>
          </div>
          <div>
            <p className="font-semibold text-foreground mb-1">7.2 No Liability for User Interactions</p>
            <p>
              We are not responsible for any interactions, transactions, or disputes between users
              and businesses listed on the platform. You use the service at your own risk.
            </p>
          </div>
          <div>
            <p className="font-semibold text-foreground mb-1">7.3 Limitation of Liability</p>
            <p className="uppercase text-sm">
              To the fullest extent permitted by law, THC Hemp Finder and its owners, operators,
              and affiliates shall not be liable for any indirect, incidental, special,
              consequential, or punitive damages arising out of your use of the platform, even if
              advised of the possibility of such damages. Our total liability to you for any claim
              shall not exceed the amount you have paid to us (if any) in the twelve months
              preceding the claim.
            </p>
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="font-heading text-xl text-foreground">8. Indemnification</h2>
        <p className="text-muted-foreground leading-relaxed">
          You agree to indemnify, defend, and hold harmless THC Hemp Finder and its owners,
          employees, and agents from any claims, losses, damages, or expenses (including reasonable
          attorneys' fees) arising from your use of the platform, any content you submit (including
          listings, coupons, and photos), your violation of these Terms, or your violation of any
          third-party rights.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="font-heading text-xl text-foreground">9. Termination</h2>
        <p className="text-muted-foreground leading-relaxed">
          We reserve the right to suspend or terminate your account at any time and for any reason,
          including violation of these Terms, without prior notice. You may also delete your account
          and remove your listings at any time by contacting us.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="font-heading text-xl text-foreground">10. Third-Party Links &amp; Services</h2>
        <p className="text-muted-foreground leading-relaxed">
          The site may contain links to external websites or services, such as individual business
          websites. We are not responsible for the content, privacy practices, or availability of
          those third-party sites. Visiting them is at your own discretion and risk.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="font-heading text-xl text-foreground">11. Governing Law &amp; Dispute Resolution</h2>
        <p className="text-muted-foreground leading-relaxed">
          These Terms are governed by the laws of the State of Texas, without regard to
          conflict-of-law principles. Any dispute arising out of these Terms or your use of the
          platform shall be resolved exclusively in the state or federal courts located in{" "}
          <strong className="text-foreground">Comal County, Texas</strong>. You consent to personal
          jurisdiction in those courts.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="font-heading text-xl text-foreground">12. Changes to These Terms</h2>
        <p className="text-muted-foreground leading-relaxed">
          We may update these Terms from time to time and will post the revised version with an
          updated "Last Updated" date at the top of this page. Continued use of the platform after
          changes are posted constitutes your acceptance of the revised Terms. We encourage you to
          review this page periodically.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="font-heading text-xl text-foreground">13. Contact</h2>
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
