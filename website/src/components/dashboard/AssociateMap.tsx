import { useEffect } from 'react';
import { MapContainer, TileLayer, Polyline, Marker, Popup, Tooltip, useMap } from 'react-leaflet';
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
}

// Map Auto-Updater Component
function MapUpdater({ center, zoom }: { center: [number, number], zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo(center, zoom, { animate: true, duration: 1.5 });
  }, [center, zoom, map]);
  return null;
}

export function AssociateMap({
  isFetchingLocation,
  handleFetchLocation,
  mapCenter,
  mapZoom,
  route,
  timeline
}: AssociateMapProps) {
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
        {route.length > 0 && <Polyline positions={route} color="#ef4444" weight={4} opacity={0.9} dashArray="6, 8" />}
        {timeline.filter(t => t.lat !== undefined && t.lng !== undefined).length > 1 && (
          <Polyline 
            positions={timeline.filter(t => t.lat !== undefined && t.lng !== undefined).map(t => [t.lat, t.lng] as [number, number])} 
            color="#3b82f6" 
            weight={3} 
            opacity={0.8} 
            dashArray="4, 6" 
          />
        )}
        {route.length > 0 && (
          <Marker 
            position={route[route.length - 1]}
            icon={L.divIcon({ className: 'bg-transparent', html: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" style="width: 32px; height: 32px; color: #991b1b; filter: drop-shadow(0px 3px 3px rgba(0,0,0,0.4));"><path fill-rule="evenodd" d="M11.54 22.351l.07.04.028.016a.76.76 0 00.723 0l.028-.015.071-.041a16.975 16.975 0 001.144-.742 19.58 19.58 0 002.683-2.282c1.944-1.99 3.963-4.98 3.963-8.827a8.25 8.25 0 00-16.5 0c0 3.846 2.02 6.837 3.963 8.827a19.58 19.58 0 002.682 2.282 16.975 16.975 0 001.145.742zM12 13.5a3 3 0 100-6 3 3 0 000 6z" clip-rule="evenodd" /></svg>', iconSize: [32, 32], iconAnchor: [16, 32] })}
          >
            <Popup className="rounded-xl">Current Location</Popup>
          </Marker>
        )}
        {timeline.filter(t => t.lat !== undefined && t.lng !== undefined).map((stop, idx) => {
          let iconHtml = '';
          let iconSize: [number, number] = [24, 24];
          let iconAnchor: [number, number] = [12, 24];
          
          if (stop.type === 'visit') {
            iconHtml = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" style="width: 32px; height: 32px; color: #3b82f6; filter: drop-shadow(0px 3px 3px rgba(0,0,0,0.4));"><path fill-rule="evenodd" d="M11.54 22.351l.07.04.028.016a.76.76 0 00.723 0l.028-.015.071-.041a16.975 16.975 0 001.144-.742 19.58 19.58 0 002.683-2.282c1.944-1.99 3.963-4.98 3.963-8.827a8.25 8.25 0 00-16.5 0c0 3.846 2.02 6.837 3.963 8.827a19.58 19.58 0 002.682 2.282 16.975 16.975 0 001.145.742zM12 13.5a3 3 0 100-6 3 3 0 000 6z" clip-rule="evenodd" /></svg>';
            iconSize = [32, 32];
            iconAnchor = [16, 32];
          } else if (stop.type === 'request') {
            iconHtml = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" style="width: 28px; height: 28px; color: #f97316; filter: drop-shadow(0px 2px 2px rgba(0,0,0,0.3));"><path fill-rule="evenodd" d="M11.54 22.351l.07.04.028.016a.76.76 0 00.723 0l.028-.015.071-.041a16.975 16.975 0 001.144-.742 19.58 19.58 0 002.683-2.282c1.944-1.99 3.963-4.98 3.963-8.827a8.25 8.25 0 00-16.5 0c0 3.846 2.02 6.837 3.963 8.827a19.58 19.58 0 002.682 2.282 16.975 16.975 0 001.145.742zM12 13.5a3 3 0 100-6 3 3 0 000 6z" clip-rule="evenodd" /></svg>';
            iconSize = [28, 28];
            iconAnchor = [14, 28];
          } else {
            iconHtml = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" style="width: 12px; height: 12px; color: #a1a1aa; filter: drop-shadow(0px 1px 1px rgba(0,0,0,0.2));"><circle cx="12" cy="12" r="6" /></svg>';
            iconSize = [12, 12];
            iconAnchor = [6, 6];
          }

          return (
            <Marker 
              key={idx} 
              position={[stop.lat, stop.lng]}
              icon={L.divIcon({ className: 'bg-transparent', html: iconHtml, iconSize, iconAnchor })}
            >
              <Tooltip direction="top" offset={[0, -(iconSize[1] / 2)]} opacity={1} className="font-sans text-xs">
                <div className="font-medium text-zinc-900">{stop.event}</div>
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
