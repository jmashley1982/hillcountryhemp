import { useEffect, useState } from "react";

interface B2BBannerData {
  id: number;
  image_path: string | null;
  link_url: string | null;
}

export function B2BBannerAd() {
  const [banner, setBanner] = useState<B2BBannerData | null>(null);

  useEffect(() => {
    fetch("/api/admin/b2b-banner")
      .then((r) => r.json())
      .then((data: B2BBannerData) => {
        if (data.image_path) setBanner(data);
      })
      .catch(() => {});
  }, []);

  if (!banner?.image_path) return null;

  return (
    <a
      href={banner.link_url || "#"}
      className="block w-full bg-black border-b border-border"
      target={banner.link_url ? "_blank" : undefined}
      rel="noopener noreferrer"
      data-testid="b2b-banner-ad"
    >
      <img
        src={`/api/uploads/${banner.image_path}`}
        alt="Business Advertisement"
        className="w-full h-auto block opacity-90 hover:opacity-100 transition-opacity"
      />
    </a>
  );
}
