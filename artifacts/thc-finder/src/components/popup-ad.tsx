import { useEffect, useState } from "react";
import { useGetPopup } from "@workspace/api-client-react";
import { useLocation } from "wouter";
import { X } from "lucide-react";

const CUSTOMER_ROUTES = ["/", "/advertise"];

function isCustomerRoute(location: string): boolean {
  if (CUSTOMER_ROUTES.includes(location)) return true;
  if (location.startsWith("/business/")) return true;
  return false;
}

export function PopupAd() {
  const [location] = useLocation();
  const { data: popup } = useGetPopup();
  const [show, setShow] = useState(false);
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(max-width: 767px)").matches,
  );

  useEffect(() => {
    const mql = window.matchMedia("(max-width: 767px)");
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, []);

  useEffect(() => {
    const hasImage = popup?.image_path || popup?.mobile_image_path;
    if (!popup || popup.is_active !== 1 || !hasImage) return;
    if (!isCustomerRoute(location)) return;
    const seen = sessionStorage.getItem("thc-popup-seen");
    if (!seen) {
      setShow(true);
    }
  }, [popup, location]);

  useEffect(() => {
    if (!isCustomerRoute(location)) {
      setShow(false);
    }
  }, [location]);

  const handleClose = () => {
    sessionStorage.setItem("thc-popup-seen", "true");
    setShow(false);
  };

  const hasImage = popup?.image_path || popup?.mobile_image_path;
  if (!show || !hasImage) return null;

  const useMobileSlot = isMobile && !!popup.mobile_image_path;
  const activePath = useMobileSlot
    ? popup.mobile_image_path!
    : (popup.image_path ?? popup.mobile_image_path!);
  const activeLink = useMobileSlot
    ? (popup.mobile_link_url || popup.link_url)
    : popup.link_url;

  const imgClass = "w-full max-h-[82vh] object-contain rounded-xl shadow-2xl border-4 border-white block";

  return (
    <div
      className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/70 backdrop-blur-sm p-6"
      onClick={handleClose}
      data-testid="popup-ad-overlay"
    >
      <div
        className="relative max-w-sm w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={handleClose}
          className="absolute -top-5 -right-5 bg-white rounded-full p-2 shadow-2xl border-2 border-gray-400 hover:bg-gray-100 transition-colors z-10"
          data-testid="button-close-popup"
          aria-label="Close"
        >
          <X className="h-5 w-5 text-gray-900" />
        </button>

        {activeLink ? (
          <a href={activeLink} target="_blank" rel="noopener noreferrer" onClick={handleClose}>
            <img src={`/api/uploads/${activePath}`} alt="Special Offer" className={imgClass} />
          </a>
        ) : (
          <img src={`/api/uploads/${activePath}`} alt="Special Offer" className={imgClass} />
        )}
      </div>
    </div>
  );
}
