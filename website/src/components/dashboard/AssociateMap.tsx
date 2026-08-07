import { useEffect, useState,  useRef } from 'react';
import { MapContainer, TileLayer, Polyline, Marker, Popup, Tooltip, useMap, CircleMarker } from 'react-leaflet';

import { School, Clipboard, Radio, MapPin, Flag, Route, Navigation } from 'lucide-react';

import { currentLocationIcon, requestIcon, crmIcon, schoolIcon, startIcon, ongoingWalkInIcon } from './map/mapIcons';
import { readCache, writeCache, snapToRoads } from '../../lib/osrmService';

interface AssociateMapProps {
  mapCenter: [number, number];
  mapZoom: number;
  route: [number, number][];
  timeline: any[];
  ongoingWalkIn?: any;
  routeCacheKey?: string;
}

// Map Auto-Updater Component
function MapUpdater({ center, zoom }: { center: [number, number], zoom: number }) {
  const map = useMap();
  useEffect(() => {
    if (center && typeof center[0] === 'number' && typeof center[1] === 'number' && !isNaN(center[0]) && !isNaN(center[1])) {
      map.setView(center, zoom);
    }
  }, [center, zoom, map]);
  return null;
}
// ─── Main Component ─────────────────────────────────────────────────────────

export function AssociateMap({
  mapCenter,
  mapZoom,
  route,
  timeline,
  ongoingWalkIn,
  routeCacheKey = '',
}: AssociateMapProps) {
  const geoTimeline = timeline.filter(t => t.lat != null && typeof t.lat === 'number' && !isNaN(t.lat) && t.lng != null && typeof t.lng === 'number' && !isNaN(t.lng));
  const validRoute = route.filter(pt => pt[0] != null && !isNaN(pt[0]) && pt[1] != null && !isNaN(pt[1]));

  // Road-snapped route state
  const [snappedRoute, setSnappedRoute] = useState<[number, number][] | null>(null);
  const [snapStatus, setSnapStatus] = useState<'idle' | 'loading' | 'done' | 'failed'>('idle');
  const [useSnapped, setUseSnapped] = useState(true); // toggle: true = road-snapped, false = raw GPS
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    // Abort any in-flight OSRM request from previous route/associate
    abortRef.current?.abort();

    // Reset snapped route whenever the route data changes
    setSnappedRoute(null);
    setSnapStatus('idle');

    if (validRoute.length < 2 || !routeCacheKey) return;

    // Check localStorage cache first
    const cached = readCache(routeCacheKey);
    if (cached) {
      setSnappedRoute(cached);
      setSnapStatus('done');
      return;
    }

    const controller = new AbortController();
    abortRef.current = controller;

    setSnapStatus('loading');

    snapToRoads(validRoute, controller.signal).then((result) => {
      // If this request was aborted while in-flight, ignore the result
      if (controller.signal.aborted) return;

      if (result) {
        writeCache(routeCacheKey, result);
        setSnappedRoute(result);
        setSnapStatus('done');
      } else {
        setSnappedRoute(null);
        setSnapStatus('failed');
      }
    });

    return () => {
      controller.abort();
    };
  }, [route, routeCacheKey]);

  // Determine which route to display
  const showSnapped = useSnapped && snappedRoute && snappedRoute.length > 0;

  return (
    <div className="flex-1 bg-gray-100 border border-gray-200 shadow-sm relative overflow-hidden group rounded-xl">

      {/* Road Snap Toggle */}
      {validRoute.length > 0 && (
        <div className="absolute top-4 left-4 z-[400]">
          {snapStatus === 'loading' ? (
            <div className="flex items-center gap-2 bg-white border border-gray-100 text-gray-700 px-4 py-2 rounded-full text-xs font-bold shadow-md animate-pulse">
              <span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />
              Snapping to roads...
            </div>
          ) : snapStatus === 'done' ? (
            <button
              onClick={() => setUseSnapped(prev => !prev)}
              className={`
                flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold shadow-md
                transition-all duration-300 cursor-pointer select-none border
                ${showSnapped
                  ? 'bg-green-50 border-green-200 text-green-700 hover:bg-green-100'
                  : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                }
              `}
              title={showSnapped ? 'Click to show raw GPS route' : 'Click to show road-snapped route'}
            >
              {showSnapped ? (
                <>
                  <Route size={14} className="text-green-600" />
                  Road-snapped
                </>
              ) : (
                <>
                  <Navigation size={14} className="text-gray-500" />
                  Raw GPS
                </>
              )}
              {/* Toggle pill */}
              <div className={`
                relative w-8 h-5 rounded-full transition-colors duration-300 ml-1
                ${showSnapped ? 'bg-green-500' : 'bg-gray-300'}
              `}>
                <div className={`
                  absolute top-[2px] w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-300
                  ${showSnapped ? 'translate-x-[14px]' : 'translate-x-[2px]'}
                `} />
              </div>
            </button>
          ) : snapStatus === 'failed' ? (
            <div className="flex items-center gap-2 bg-white border border-amber-200 text-amber-700 px-4 py-2 rounded-full text-xs font-bold shadow-md">
              <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
              GPS route (snap failed)
            </div>
          ) : null}
        </div>
      )}
      <MapContainer
        center={mapCenter}
        zoom={mapZoom}
        zoomControl={false}
        style={{ width: '100%', height: '100%', zIndex: 10 }}
      >
        <MapUpdater center={mapCenter} zoom={mapZoom} />
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; OpenStreetMap &copy; CARTO'
        />

        {/* Road-snapped route (solid green) — shown when toggle is ON and data is available */}
        {showSnapped && (
          <Polyline
            positions={snappedRoute}
            color="#16a34a"
            weight={5}
            opacity={0.85}
          />
        )}

        {/* Raw GPS route — shown when toggle is OFF, or snapping failed/loading */}
        {validRoute.length > 0 && !showSnapped && (
          <Polyline
            positions={validRoute}
            color="#ef4444"
            weight={4}
            opacity={0.7}
            dashArray="8, 10"
          />
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
        {validRoute.length > 0 && (
          <Marker position={validRoute[0]} icon={startIcon}>
            <Tooltip direction="top" offset={[0, -15]} opacity={1} className="font-sans text-xs">
              <div className="font-semibold text-green-700 flex items-center gap-1"><Flag size={12} /> Route Start</div>
            </Tooltip>
          </Marker>
        )}

        {/* Current/latest location marker (red pulsing pin) */}
        {validRoute.length > 0 && (
          <Marker position={validRoute[validRoute.length - 1]} icon={currentLocationIcon}>
            <Popup className="rounded-xl">
              <div className="font-sans">
                <strong className="block text-red-700 mb-1 flex items-center gap-1"><MapPin size={12} /> Current Location</strong>
                <span className="text-gray-500 text-xs">Latest GPS position</span>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Ongoing Walk-In marker */}
        {ongoingWalkIn?.startLocation && (
          <Marker position={[ongoingWalkIn.startLocation.lat, ongoingWalkIn.startLocation.lng]} icon={ongoingWalkInIcon}>
            <Tooltip direction="top" offset={[0, -15]} opacity={1} className="font-sans text-xs">
              <div className="font-semibold text-green-700 flex items-center gap-1"><MapPin size={12} /> In Walk-In: {ongoingWalkIn.schoolName}</div>
            </Tooltip>
            <Popup className="rounded-xl">
              <div className="font-sans">
                <strong className="block text-green-700 mb-1 flex items-center gap-1"><MapPin size={12} /> Live Walk-In</strong>
                <span className="text-gray-600 text-sm">{ongoingWalkIn.schoolName}</span>
                <div className="text-gray-400 text-xs mt-1">Started: {new Date(ongoingWalkIn.startTime).toLocaleTimeString()}</div>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Timeline event markers — each type gets a distinct icon */}
        {geoTimeline.map((stop, idx) => {
          let icon = crmIcon;
          let tooltipLabel: React.ReactNode = null;

          if (stop.type === 'crm') {
            const isSchool = stop.data?.schoolName || stop.data?.typeOfWalkIn?.toLowerCase().includes('school');
            if (isSchool) {
              icon = schoolIcon;
              tooltipLabel = <School size={12} className="inline-block text-blue-500 mr-1" />;
            } else {
              icon = crmIcon;
              tooltipLabel = <Clipboard size={12} className="inline-block text-emerald-500 mr-1" />;
            }
          } else if (stop.type === 'request') {
            icon = requestIcon;
            tooltipLabel = <Radio size={12} className="inline-block text-orange-500 mr-1" />;
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
                  <div className="font-medium text-gray-600">{stop.event}</div>
                  <div className="text-gray-400">{stop.time}</div>
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
                <div className="font-semibold text-gray-900 flex items-center gap-1">{tooltipLabel} <span>{stop.event}</span></div>
                <div className="text-gray-500">{stop.time}</div>
              </Tooltip>
              <Popup className="rounded-xl">
                <div className="font-sans">
                  <strong className="block text-gray-900 mb-1">{stop.time}</strong>
                  <span className="text-gray-600">{stop.event}</span>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}

