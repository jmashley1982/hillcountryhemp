import { useEffect, useRef, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import { Link } from "wouter";
import { Star, Navigation } from "lucide-react";
import { Button } from "./ui/button";

// Fix default marker icons
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const greenIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const goldIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-gold.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [30, 49],
  iconAnchor: [15, 49],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

interface BusinessMarker {
  id: number;
  name: string;
  address: string;
  lat?: number | null;
  lng?: number | null;
  is_featured: number;
  categories?: string[];
}

interface MapControllerProps {
  userLocation: [number, number] | null;
}

function MapController({ userLocation }: MapControllerProps) {
  const map = useMap();
  useEffect(() => {
    if (userLocation) {
      map.flyTo(userLocation, 13, { duration: 1.5 });
    }
  }, [userLocation, map]);
  return null;
}

function MapResizeHandler() {
  const map = useMap();
  useEffect(() => {
    const invalidate = () => map.invalidateSize();
    const t1 = setTimeout(invalidate, 0);
    const t2 = setTimeout(invalidate, 250);
    const container = map.getContainer();
    const ro = new ResizeObserver(() => invalidate());
    ro.observe(container);
    window.addEventListener("resize", invalidate);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      ro.disconnect();
      window.removeEventListener("resize", invalidate);
    };
  }, [map]);
  return null;
}

interface BusinessMapProps {
  businesses: BusinessMarker[];
  onSelectBusiness?: (id: number) => void;
}

export function BusinessMap({ businesses, onSelectBusiness }: BusinessMapProps) {
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [locating, setLocating] = useState(false);

  const mappable = businesses.filter(
    (b) => b.lat != null && b.lng != null,
  ) as (BusinessMarker & { lat: number; lng: number })[];

  const handleLocate = () => {
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation([pos.coords.latitude, pos.coords.longitude]);
        setLocating(false);
      },
      () => setLocating(false),
    );
  };

  return (
    <div className="relative w-full h-full" data-testid="business-map">
      <MapContainer
        center={[29.7, -98.1]}
        zoom={10}
        className="w-full h-full z-0"
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapController userLocation={userLocation} />
        <MapResizeHandler />
        {mappable.map((b) => (
          <Marker
            key={b.id}
            position={[b.lat, b.lng]}
            icon={b.is_featured ? goldIcon : greenIcon}
            eventHandlers={{
              click: () => onSelectBusiness?.(b.id),
            }}
          />
        ))}
        {userLocation && (
          <Marker position={userLocation}>
            <Popup>
              <p className="font-bold text-sm">Your Location</p>
            </Popup>
          </Marker>
        )}
      </MapContainer>

      {/* Map overlay buttons */}
      <div className="absolute top-4 right-4 z-[1000] flex flex-col gap-2">
        <Button
          size="sm"
          variant="secondary"
          className="font-bold shadow-lg border-2 bg-white hover:bg-gray-50 text-gray-800"
          onClick={handleLocate}
          disabled={locating}
          data-testid="button-locate"
        >
          <Navigation className="h-4 w-4 mr-1" />
          {locating ? "Locating..." : "My Location"}
        </Button>
      </div>

      {/* Legend */}
      <div className="absolute bottom-8 left-4 z-[1000] bg-white/90 backdrop-blur-sm rounded-lg p-3 border-2 border-gray-200 shadow-md">
        <div className="flex items-center gap-2 text-xs font-bold text-gray-700 mb-1.5">
          <span className="inline-block w-3 h-3 rounded-full bg-green-700" /> Shop
        </div>
        <div className="flex items-center gap-2 text-xs font-bold text-yellow-600">
          <Star className="h-3 w-3 fill-current" /> Featured
        </div>
      </div>
    </div>
  );
}
