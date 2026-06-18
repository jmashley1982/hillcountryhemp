export default function Advertise() {
  const CONTACT_EMAIL = "hempfindertx@gmail.com";

  return (
    <div className="container mx-auto px-4 py-16 max-w-4xl">
      <div className="text-center mb-16">
        <h1 className="text-5xl md:text-7xl text-primary mb-6">Get Noticed.</h1>
        <p className="text-xl md:text-2xl font-medium text-muted-foreground max-w-2xl mx-auto">
          Put your brand or store in front of Texas Hill Country adults searching for premium hemp products. Advertising spots are limited — reach out early to lock in your placement.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
        <div className="bg-card border-2 border-border p-8 rounded-xl shadow-sm hover:border-primary transition-colors">
          <h2 className="text-2xl text-primary mb-4">Featured Store Listing</h2>
          <p className="font-medium text-muted-foreground mb-6">
            Stand out on the map with a gold star marker and appear at the top of search results in your area. Great for shops that want consistent, year-round visibility to local and visiting customers.
          </p>
          <p className="text-sm font-bold text-muted-foreground/60 uppercase tracking-wider">Pricing coming soon — contact us for early access</p>
        </div>

        <div className="bg-card border-2 border-border p-8 rounded-xl shadow-sm hover:border-primary transition-colors">
          <h2 className="text-2xl text-primary mb-4">Banner Ads</h2>
          <p className="font-medium text-muted-foreground mb-6">
            A site-wide banner ad sits just below the navigation on every page — putting your brand in front of every visitor the moment they land. Ideal for store openings, product launches, or seasonal promotions.
          </p>
          <p className="text-sm font-bold text-muted-foreground/60 uppercase tracking-wider">Pricing coming soon — contact us for early access</p>
        </div>

        <div className="bg-card border-2 border-border p-8 rounded-xl shadow-sm hover:border-primary transition-colors">
          <h2 className="text-2xl text-primary mb-4">Popup Ads</h2>
          <p className="font-medium text-muted-foreground mb-6">
            An exclusive first-visit popup overlay guarantees an impression every time a new visitor opens the app. Maximum exposure for new brand launches, limited drops, or events.
          </p>
          <p className="text-sm font-bold text-muted-foreground/60 uppercase tracking-wider">Pricing coming soon — contact us for early access</p>
        </div>

        <div className="bg-card border-2 border-border p-8 rounded-xl shadow-sm hover:border-primary transition-colors">
          <h2 className="text-2xl text-primary mb-4">Brand Spotlight</h2>
          <p className="font-medium text-muted-foreground mb-6">
            Get your brand featured across every shop page that carries your products. When customers browse a store that stocks your line, your brand rises to the top of their brand list — a direct connection between shelf presence and discovery.
          </p>
          <p className="text-sm font-bold text-muted-foreground/60 uppercase tracking-wider">Pricing coming soon — contact us for early access</p>
        </div>
      </div>

      <div className="bg-primary text-primary-foreground p-8 md:p-12 rounded-2xl text-center shadow-xl border-b-8 border-black/20">
        <h2 className="text-3xl md:text-4xl mb-4 font-display">Interested? Let's talk.</h2>
        <p className="text-lg font-medium mb-2 max-w-xl mx-auto opacity-90">
          We're in Beta and finalizing advertising packages. Reach out now to get early-access rates and secure the best placements before launch.
        </p>
        <p className="text-sm opacity-70 mb-8 max-w-md mx-auto">
          Inventory is limited — we keep ad slots scarce on purpose so every partner gets real visibility.
        </p>
        <a
          href={`mailto:${CONTACT_EMAIL}?subject=Advertising%20Inquiry%20%E2%80%94%20Hill%20Country%20Hemp%20Finder`}
          className="inline-block bg-secondary text-secondary-foreground px-8 py-4 rounded-lg font-bold text-lg uppercase tracking-wider hover:bg-secondary/90 transition-colors shadow-lg border-b-4 border-black/20 max-w-full"
        >
          <span className="break-all">Email {CONTACT_EMAIL}</span>
        </a>
      </div>
    </div>
  );
}
