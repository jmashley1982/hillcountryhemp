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

  useEffect(() => {
    if (!popup || popup.is_active !== 1 || !popup.image_path) return;
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

  if (!show || !popup?.image_path) return null;

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

        {popup.link_url ? (
          <a
            href={popup.link_url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={handleClose}
          >
            <img
              src={`/api/uploads/${popup.image_path}`}
              alt="Special Offer"
              className={imgClass}
            />
          </a>
        ) : (
          <img
            src={`/api/uploads/${popup.image_path}`}
            alt="Special Offer"
            className={imgClass}
          />
        )}
      </div>
    </div>
  );
}
