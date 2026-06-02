import { useEffect, useState } from "react";
import { useGetPopup } from "@workspace/api-client-react";
import { X } from "lucide-react";

export function PopupAd() {
  const { data: popup } = useGetPopup();
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!popup || popup.is_active !== 1 || !popup.image_path) return;
    const seen = sessionStorage.getItem("thc-popup-seen");
    if (!seen) {
      setShow(true);
    }
  }, [popup]);

  const handleClose = () => {
    sessionStorage.setItem("thc-popup-seen", "true");
    setShow(false);
  };

  if (!show || !popup?.image_path) return null;

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={handleClose}
      data-testid="popup-ad-overlay"
    >
      <div
        className="relative max-w-sm w-full mx-4"
        style={{ maxHeight: "90vh", overflowY: "auto" }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={handleClose}
          className="absolute -top-4 -right-4 bg-white rounded-full p-1.5 shadow-xl border-2 border-gray-200 hover:bg-gray-100 transition-colors z-10"
          data-testid="button-close-popup"
        >
          <X className="h-5 w-5 text-gray-800" />
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
              className="w-full rounded-xl shadow-2xl border-4 border-white"
            />
          </a>
        ) : (
          <img
            src={`/api/uploads/${popup.image_path}`}
            alt="Special Offer"
            className="w-full rounded-xl shadow-2xl border-4 border-white"
          />
        )}
      </div>
    </div>
  );
}
