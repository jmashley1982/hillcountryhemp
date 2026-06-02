import logo from "@assets/txwhlsl_logo_1780368105227.png";

export function B2BBannerAd() {
  return (
    <div className="block w-full bg-black border-b border-border" data-testid="b2b-banner-ad">
      <div className="flex items-center gap-3 px-3 py-2 sm:gap-4 sm:px-6 sm:py-4 max-w-6xl mx-auto">
        <img
          src={logo}
          alt="Texas Wholesale"
          className="h-10 sm:h-16 w-auto object-contain shrink-0 rounded-sm"
        />
        <div className="min-w-0 flex-1">
          <p className="text-xs sm:text-base font-bold uppercase tracking-wider text-[#FE4A49] leading-tight">
            Texas Wholesale
          </p>
          <p className="text-[11px] sm:text-sm font-medium text-white/80 leading-tight line-clamp-1">
            San Antonio wholesaler — huge selection of hemp &amp; vape gear
          </p>
        </div>
        <a
          href="https://www.txwsa.com/"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl bg-[#99CC66] text-black font-bold uppercase tracking-wider text-[11px] sm:text-sm hover:brightness-105 transition-all shrink-0"
        >
          <img
            src={logo}
            alt=""
            className="hidden sm:block h-6 w-auto object-contain"
          />
          <span>Shop Now</span>
        </a>
      </div>
    </div>
  );
}
