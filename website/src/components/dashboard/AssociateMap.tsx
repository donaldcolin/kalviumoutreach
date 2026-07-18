import { useEffect } from 'react';
import { MapContainer, TileLayer, Polyline, Marker, Popup, Tooltip, useMap, CircleMarker } from 'react-leaflet';
import L from 'leaflet';

// Fix for default Leaflet marker icon in React
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface AssociateMapProps {
  isFetchingLocation: boolean;
  handleFetchLocation: () => void;
  mapCenter: [number, number];
  mapZoom: number;
  route: [number, number][];
  timeline: any[];
  ongoingWalkIn?: any;
}

// Map Auto-Updater Component
function MapUpdater({ center, zoom }: { center: [number, number], zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo(center, zoom, { animate: true, duration: 1.5 });
  }, [center, zoom, map]);
  return null;
}

// ─── Distinct Marker Icons ──────────────────────────────────────────────────

// Current/Latest GPS location — red pulsing pin
const currentLocationIcon = L.divIcon({
  className: 'bg-transparent',
  html: `<div style="position:relative;width:36px;height:36px;">
    <div style="position:absolute;inset:0;border-radius:50%;background:rgba(239,68,68,0.2);animation:pulse-ring 1.5s ease-out infinite;"></div>
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#dc2626" style="width:36px;height:36px;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.4));position:relative;z-index:2;">
      <path fill-rule="evenodd" d="M11.54 22.351l.07.04.028.016a.76.76 0 00.723 0l.028-.015.071-.041a16.975 16.975 0 001.144-.742 19.58 19.58 0 002.683-2.282c1.944-1.99 3.963-4.98 3.963-8.827a8.25 8.25 0 00-16.5 0c0 3.846 2.02 6.837 3.963 8.827a19.58 19.58 0 002.682 2.282 16.975 16.975 0 001.145.742zM12 13.5a3 3 0 100-6 3 3 0 000 6z" clip-rule="evenodd" />
    </svg>
  </div>
  <style>@keyframes pulse-ring{0%{transform:scale(0.5);opacity:1}100%{transform:scale(2.5);opacity:0}}</style>`,
  iconSize: [36, 36],
  iconAnchor: [18, 36],
});


// Location request — orange circle with crosshair icon
const requestIcon = L.divIcon({
  className: 'bg-transparent',
  html: `<div style="width:30px;height:30px;background:#f97316;border-radius:50%;border:3px solid #fff;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(249,115,22,0.5);">
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white" style="width:16px;height:16px;">
      <path fill-rule="evenodd" d="M12 1.5a.75.75 0 01.75.75V4.5a.75.75 0 01-1.5 0V2.25A.75.75 0 0112 1.5zM5.636 4.136a.75.75 0 011.06 0l1.592 1.591a.75.75 0 01-1.061 1.06l-1.591-1.59a.75.75 0 010-1.061zm12.728 0a.75.75 0 010 1.06l-1.591 1.592a.75.75 0 11-1.06-1.061l1.59-1.591a.75.75 0 011.061 0zm-6.816 4.496a.75.75 0 01.82.311l5.228 7.917a.75.75 0 01-.777 1.148l-2.097-.43 1.045 3.9a.75.75 0 01-1.45.388l-1.044-3.899-1.601 1.42a.75.75 0 01-1.247-.606l.569-9.47a.75.75 0 01.554-.679z" clip-rule="evenodd" />
    </svg>
  </div>`,
  iconSize: [30, 30],
  iconAnchor: [15, 15],
});

// CRM Activity — emerald rounded-square with clipboard icon
const crmIcon = L.divIcon({
  className: 'bg-transparent',
  html: `<div style="width:34px;height:34px;background:#10b981;border-radius:8px;border:3px solid #fff;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(16,185,129,0.5);transform:rotate(-3deg);">
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white" style="width:18px;height:18px;">
      <path fill-rule="evenodd" d="M7.502 6h7.128A3.375 3.375 0 0118 9.375v9.375a3 3 0 003-3V6.108c0-1.505-1.125-2.811-2.664-2.94a48.972 48.972 0 00-.673-.05A3 3 0 0015 1.5h-1.5a3 3 0 00-2.663 1.618c-.225.015-.45.032-.673.05C8.662 3.295 7.554 4.542 7.502 6zM13.5 3A1.5 1.5 0 0012 4.5h4.5A1.5 1.5 0 0015 3h-1.5z" clip-rule="evenodd" />
      <path fill-rule="evenodd" d="M3 9.375C3 8.339 3.84 7.5 4.875 7.5h9.75c1.036 0 1.875.84 1.875 1.875v11.25c0 1.035-.84 1.875-1.875 1.875h-9.75A1.875 1.875 0 013 20.625V9.375zm9.586 4.594a.75.75 0 00-1.172-.938l-2.476 3.096-.908-.907a.75.75 0 00-1.06 1.06l1.5 1.5a.75.75 0 001.116-.062l3-3.749z" clip-rule="evenodd" />
    </svg>
  </div>`,
  iconSize: [34, 34],
  iconAnchor: [17, 17],
});

// Start point — green circle with flag icon
const startIcon = L.divIcon({
  className: 'bg-transparent',
  html: `<div style="width:30px;height:30px;background:#22c55e;border-radius:50%;border:3px solid #fff;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(34,197,94,0.5);">
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white" style="width:14px;height:14px;">
      <path fill-rule="evenodd" d="M3 2.25a.75.75 0 01.75.75v.54l1.838-.46a9.75 9.75 0 016.725.738l.108.054a8.25 8.25 0 005.58.652l3.109-.732a.75.75 0 01.917.81 47.784 47.784 0 00.005 10.337.75.75 0 01-.574.812l-3.114.733a9.75 9.75 0 01-6.594-.77l-.108-.054a8.25 8.25 0 00-5.69-.625l-1.81.452A.75.75 0 013 14.625V3A.75.75 0 013.75 2.25z" clip-rule="evenodd" />
    </svg>
  </div>`,
  iconSize: [30, 30],
  iconAnchor: [15, 15],
});

// Ongoing Walk-in — pulsing green marker
const ongoingWalkInIcon = L.divIcon({
  className: 'bg-transparent',
  html: `<div style="position:relative;width:40px;height:40px;display:flex;align-items:center;justify-content:center;">
    <div style="position:absolute;inset:0;border-radius:50%;background:rgba(34,197,94,0.3);animation:pulse-ring 1.5s ease-out infinite;"></div>
    <div style="position:absolute;inset:8px;border-radius:50%;background:rgba(34,197,94,0.5);animation:pulse-ring 1.5s ease-out infinite;animation-delay:0.5s"></div>
    <div style="width:20px;height:20px;background:#22c55e;border-radius:50%;border:2px solid #fff;position:relative;z-index:2;box-shadow:0 2px 4px rgba(0,0,0,0.3);"></div>
  </div>`,
  iconSize: [40, 40],
  iconAnchor: [20, 20],
});

// ─── Map Legend ──────────────────────────────────────────────────────────────

function MapLegend() {
  return (
    <div className="absolute bottom-4 left-4 z-[400] bg-white/95 backdrop-blur-sm border border-zinc-200 rounded-xl shadow-lg p-3 text-[11px] space-y-2 min-w-[160px]">
      <p className="font-bold text-zinc-700 uppercase tracking-wider text-[10px] mb-2">Legend</p>
      <div className="flex items-center gap-2">
        <span className="w-3 h-3 rounded-full bg-red-600 ring-2 ring-red-200 shrink-0" />
        <span className="text-zinc-700 font-medium">Current Location</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="w-3 h-3 rounded-full bg-green-500 ring-2 ring-green-200 shrink-0" />
        <span className="text-zinc-700 font-medium">Route Start</span>
      </div>

      <div className="flex items-center gap-2">
        <span className="w-3 h-3 rounded bg-emerald-500 shrink-0" />
        <span className="text-zinc-700 font-medium">CRM Activity</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="w-3 h-3 rounded-full bg-orange-500 ring-2 ring-orange-200 shrink-0" />
        <span className="text-zinc-700 font-medium">Location Request</span>
      </div>
      <hr className="border-zinc-100" />
      <div className="flex items-center gap-2">
        <span className="w-5 h-0 border-t-2 border-dashed border-red-500 shrink-0" />
        <span className="text-zinc-500">GPS Route</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="w-5 h-0 border-t-2 border-dashed border-blue-500 shrink-0" />
        <span className="text-zinc-500">Activity Trail</span>
      </div>
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────

export function AssociateMap({
  isFetchingLocation,
  handleFetchLocation,
  mapCenter,
  mapZoom,
  route,
  timeline,
  ongoingWalkIn
}: AssociateMapProps) {
  const geoTimeline = timeline.filter(t => t.lat != null && t.lng != null);

  return (
    <div className="flex-1 bg-zinc-100 border border-zinc-200 shadow-[0_2px_10px_-3px_rgba(0,0,0,0.05)] relative overflow-hidden group rounded-xl">
      <div className="absolute top-4 right-4 z-[400]">
        <button
          onClick={handleFetchLocation}
          disabled={isFetchingLocation}
          className="bg-white/90 backdrop-blur text-zinc-900 border border-zinc-200 px-4 py-2 text-xs font-bold tracking-wider uppercase hover:bg-zinc-900 hover:text-white transition-all disabled:opacity-50 disabled:hover:bg-white disabled:hover:text-zinc-900 shadow-sm rounded-xl"
        >
          {isFetchingLocation ? 'Fetching...' : 'Request Location'}
        </button>
      </div>
      <MapLegend />
      <MapContainer
        center={mapCenter}
        zoom={mapZoom}
        style={{ width: '100%', height: '100%', zIndex: 10 }}
      >
        <MapUpdater center={mapCenter} zoom={mapZoom} />
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          attribution='&copy; OpenStreetMap &copy; CARTO'
        />

        {/* GPS Route polyline (red dashed) */}
        {route.length > 0 && (
          <Polyline positions={route} color="#ef4444" weight={4} opacity={0.7} dashArray="8, 10" />
        )}

        {/* Activity trail polyline (blue dashed) — connects timeline events with geo */}
        {geoTimeline.length > 1 && (
          <Polyline
            positions={geoTimeline.map(t => [t.lat, t.lng] as [number, number])}
            color="#3b82f6"
            weight={3}
            opacity={0.6}
            dashArray="6, 8"
          />
        )}

        {/* Route start marker (green flag) */}
        {route.length > 0 && (
          <Marker position={route[0]} icon={startIcon}>
            <Tooltip direction="top" offset={[0, -15]} opacity={1} className="font-sans text-xs">
              <div className="font-semibold text-green-700">🟢 Route Start</div>
            </Tooltip>
          </Marker>
        )}

        {/* Current/latest location marker (red pulsing pin) */}
        {route.length > 0 && (
          <Marker position={route[route.length - 1]} icon={currentLocationIcon}>
            <Popup className="rounded-xl">
              <div className="font-sans">
                <strong className="block text-red-700 mb-1">📍 Current Location</strong>
                <span className="text-zinc-500 text-xs">Latest GPS position</span>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Ongoing Walk-In marker */}
        {ongoingWalkIn?.startLocation && (
          <Marker position={[ongoingWalkIn.startLocation.lat, ongoingWalkIn.startLocation.lng]} icon={ongoingWalkInIcon}>
            <Tooltip direction="top" offset={[0, -15]} opacity={1} className="font-sans text-xs">
              <div className="font-semibold text-green-700">📍 In Walk-In: {ongoingWalkIn.schoolName}</div>
            </Tooltip>
            <Popup className="rounded-xl">
              <div className="font-sans">
                <strong className="block text-green-700 mb-1">📍 Live Walk-In</strong>
                <span className="text-zinc-600 text-sm">{ongoingWalkIn.schoolName}</span>
                <div className="text-zinc-400 text-xs mt-1">Started: {new Date(ongoingWalkIn.startTime).toLocaleTimeString()}</div>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Timeline event markers — each type gets a distinct icon */}
        {geoTimeline.map((stop, idx) => {
          let icon = crmIcon;
          let tooltipLabel = '';

          if (stop.type === 'crm') {
            icon = crmIcon;
            tooltipLabel = '📋';
          } else if (stop.type === 'request') {
            icon = requestIcon;
            tooltipLabel = '📡';
          } else {
            // Generic ping — render as a small circle marker, not a big icon
            return (
              <CircleMarker
                key={`ping-${idx}`}
                center={[stop.lat, stop.lng]}
                radius={4}
                pathOptions={{ color: '#a1a1aa', fillColor: '#d4d4d8', fillOpacity: 0.7, weight: 1.5 }}
              >
                <Tooltip direction="top" offset={[0, -6]} opacity={1} className="font-sans text-xs">
                  <div className="font-medium text-zinc-600">{stop.event}</div>
                  <div className="text-zinc-400">{stop.time}</div>
                </Tooltip>
              </CircleMarker>
            );
          }

          return (
            <Marker
              key={idx}
              position={[stop.lat, stop.lng]}
              icon={icon}
            >
              <Tooltip direction="top" offset={[0, -17]} opacity={1} className="font-sans text-xs">
                <div className="font-semibold text-zinc-900">{tooltipLabel} {stop.event}</div>
                <div className="text-zinc-500">{stop.time}</div>
              </Tooltip>
              <Popup className="rounded-xl">
                <div className="font-sans">
                  <strong className="block text-zinc-900 mb-1">{stop.time}</strong>
                  <span className="text-zinc-600">{stop.event}</span>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}
