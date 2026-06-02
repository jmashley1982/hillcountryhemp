import logo from "@assets/txwhlsl_logo_1780368105227.png";

export function B2BBannerAd() {
  return (
    <a
      href="https://texaswholesaler.com"
      target="_blank"
      rel="noopener noreferrer"
      className="block w-full bg-black border-b border-border"
      data-testid="b2b-banner-ad"
    >
      <div className="flex items-center gap-4 px-4 py-3 sm:px-6 sm:py-4 max-w-6xl mx-auto">
        <img
          src={logo}
          alt="Texas Wholesale"
          className="h-14 sm:h-16 w-auto object-contain shrink-0 rounded-sm"
        />
        <div className="min-w-0">
          <p className="text-sm sm:text-base font-bold uppercase tracking-wider text-[#FE4A49]">
            Texas Wholesale
          </p>
          <p className="text-xs sm:text-sm font-medium text-white/90 truncate">
            San Antonio wholesaler — huge selection of hemp & vape gear
          </p>
        </div>
      </div>
    </a>
  );
}
