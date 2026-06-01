export default function Advertise() {
  return (
    <div className="container mx-auto px-4 py-16 max-w-4xl">
      <div className="text-center mb-16">
        <h1 className="text-5xl md:text-7xl text-primary mb-6">Get Noticed.</h1>
        <p className="text-xl md:text-2xl font-medium text-muted-foreground max-w-2xl mx-auto">
          Put your brand or shop in front of thousands of Texas Hill Country adults searching for premium hemp products.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
        <div className="bg-card border-2 border-border p-8 rounded-xl shadow-sm hover:border-primary transition-colors">
          <h2 className="text-2xl text-primary mb-4">Featured Shop</h2>
          <p className="font-medium text-muted-foreground mb-6">
            Stand out on the map with a gold star marker and pin your listing to the top of the search results in your area. Includes unlimited photos and coupon uploads.
          </p>
          <div className="text-3xl font-display text-secondary mb-2">$99 <span className="text-sm text-muted-foreground font-sans uppercase tracking-widest font-bold">/ month</span></div>
        </div>

        <div className="bg-card border-2 border-border p-8 rounded-xl shadow-sm hover:border-primary transition-colors">
          <h2 className="text-2xl text-primary mb-4">Banner & Popup Ads</h2>
          <p className="font-medium text-muted-foreground mb-6">
            Dominate the screen. Get a site-wide banner ad below the navigation or an exclusive first-visit popup overlay to guarantee impressions for your brand or product launch.
          </p>
          <div className="text-3xl font-display text-secondary mb-2">Custom <span className="text-sm text-muted-foreground font-sans uppercase tracking-widest font-bold">Pricing</span></div>
        </div>
      </div>

      <div className="bg-primary text-primary-foreground p-8 md:p-12 rounded-2xl text-center shadow-xl border-b-8 border-black/20">
        <h2 className="text-3xl md:text-4xl mb-6 font-display">Ready to dominate the Hill Country?</h2>
        <p className="text-xl font-medium mb-8 max-w-xl mx-auto opacity-90">
          Drop us a line to secure your placement. Inventory is limited to maintain maximum visibility for our partners.
        </p>
        <a 
          href="mailto:ads@thcfinder.com" 
          className="inline-block bg-secondary text-secondary-foreground px-8 py-4 rounded-lg font-bold text-lg uppercase tracking-wider hover:bg-secondary/90 transition-colors shadow-lg border-b-4 border-black/20"
        >
          Email ads@thcfinder.com
        </a>
      </div>
    </div>
  );
}
