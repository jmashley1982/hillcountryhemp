import logo from "@assets/txwhlsl_logo_1780368105227.png";

export function B2BBannerAd() {
  return (
    <a
      href="https://www.txwsa.com/"
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
        <div className="min-w-0 flex-1">
          <p className="text-sm sm:text-base font-bold uppercase tracking-wider text-[#FE4A49]">
            Texas Wholesale
          </p>
          <p className="text-xs sm:text-sm font-medium text-white/90 truncate">
            San Antonio wholesaler — huge selection of hemp & vape gear
          </p>
        </div>
        <a
          href="https://www.txwsa.com/"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#99CC66] text-black font-bold uppercase tracking-wider text-xs sm:text-sm hover:brightness-105 transition-all shrink-0"
          onClick={(e) => e.stopPropagation()}
        >
          <img
            src={logo}
            alt=""
            className="h-6 w-auto object-contain"
          />
          <span>Shop Now</span>
        </a>
      </div>
    </a>
  );
}
