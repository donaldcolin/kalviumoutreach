import L from 'leaflet';

// Fix for default Leaflet marker icon in React
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// ─── Distinct Marker Icons ──────────────────────────────────────────────────

// Current/Latest GPS location — red pulsing pin
export const currentLocationIcon = L.divIcon({
  className: 'bg-transparent',
  html: `<div style="position:relative;width:30px;height:30px;">
    <div style="position:absolute;inset:0;border-radius:50%;background:rgba(239,68,68,0.2);animation:pulse-ring 1.5s ease-out infinite;"></div>
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#dc2626" style="width:30px;height:30px;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.4));position:relative;z-index:2;">
      <path fill-rule="evenodd" d="M11.54 22.351l.07.04.028.016a.76.76 0 00.723 0l.028-.015.071-.041a16.975 16.975 0 001.144-.742 19.58 19.58 0 002.683-2.282c1.944-1.99 3.963-4.98 3.963-8.827a8.25 8.25 0 00-16.5 0c0 3.846 2.02 6.837 3.963 8.827a19.58 19.58 0 002.682 2.282 16.975 16.975 0 001.145.742zM12 13.5a3 3 0 100-6 3 3 0 000 6z" clip-rule="evenodd" />
    </svg>
  </div>
  <style>@keyframes pulse-ring{0%{transform:scale(0.5);opacity:1}100%{transform:scale(2.5);opacity:0}}</style>`,
  iconSize: [30, 30],
  iconAnchor: [15, 30],
});

// Location request — orange crosshair
export const requestIcon = L.divIcon({
  className: 'bg-transparent',
  html: `<div style="display:flex;align-items:center;justify-content:center;filter:drop-shadow(0 2px 2px rgba(0,0,0,0.3));">
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#f97316" style="width:24px;height:24px;">
      <path fill-rule="evenodd" d="M12 1.5a.75.75 0 01.75.75V4.5a.75.75 0 01-1.5 0V2.25A.75.75 0 0112 1.5zM5.636 4.136a.75.75 0 011.06 0l1.592 1.591a.75.75 0 01-1.061 1.06l-1.591-1.59a.75.75 0 010-1.061zm12.728 0a.75.75 0 010 1.06l-1.591 1.592a.75.75 0 11-1.06-1.061l1.59-1.591a.75.75 0 011.061 0zm-6.816 4.496a.75.75 0 01.82.311l5.228 7.917a.75.75 0 01-.777 1.148l-2.097-.43 1.045 3.9a.75.75 0 01-1.45.388l-1.044-3.899-1.601 1.42a.75.75 0 01-1.247-.606l.569-9.47a.75.75 0 01.554-.679z" clip-rule="evenodd" />
    </svg>
  </div>`,
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

// CRM Activity — emerald clipboard
export const crmIcon = L.divIcon({
  className: 'bg-transparent',
  html: `<div style="display:flex;align-items:center;justify-content:center;filter:drop-shadow(0 2px 2px rgba(0,0,0,0.3));">
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#10b981" style="width:24px;height:24px;">
      <path fill-rule="evenodd" d="M7.502 6h7.128A3.375 3.375 0 0118 9.375v9.375a3 3 0 003-3V6.108c0-1.505-1.125-2.811-2.664-2.94a48.972 48.972 0 00-.673-.05A3 3 0 0015 1.5h-1.5a3 3 0 00-2.663 1.618c-.225.015-.45.032-.673.05C8.662 3.295 7.554 4.542 7.502 6zM13.5 3A1.5 1.5 0 0012 4.5h4.5A1.5 1.5 0 0015 3h-1.5z" clip-rule="evenodd" />
      <path fill-rule="evenodd" d="M3 9.375C3 8.339 3.84 7.5 4.875 7.5h9.75c1.036 0 1.875.84 1.875 1.875v11.25c0 1.035-.84 1.875-1.875 1.875h-9.75A1.875 1.875 0 013 20.625V9.375zm9.586 4.594a.75.75 0 00-1.172-.938l-2.476 3.096-.908-.907a.75.75 0 00-1.06 1.06l1.5 1.5a.75.75 0 001.116-.062l3-3.749z" clip-rule="evenodd" />
    </svg>
  </div>`,
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

// School mark — Lucide School SVG
export const schoolIcon = L.divIcon({
  className: 'bg-transparent',
  html: `<div style="display:flex;align-items:center;justify-content:center;filter:drop-shadow(0 2px 2px rgba(0,0,0,0.3));">
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:24px;height:24px;">
      <path d="M14 21v-3a2 2 0 0 0-4 0v3" />
      <path d="M18 4.933V21" />
      <path d="m4 6 7.106-3.79a2 2 0 0 1 1.788 0L20 6" />
      <path d="m6 11-3.52 2.147a1 1 0 0 0-.48.854V19a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-5a1 1 0 0 0-.48-.853L18 11" />
      <path d="M6 4.933V21" />
      <circle cx="12" cy="9" r="2" />
    </svg>
  </div>`,
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

// Start point — Lucide Flag SVG
export const startIcon = L.divIcon({
  className: 'bg-transparent',
  html: `<div style="display:flex;align-items:center;justify-content:center;filter:drop-shadow(0 2px 2px rgba(0,0,0,0.3));">
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:24px;height:24px;">
      <path d="M4 22V4a1 1 0 0 1 .4-.8A6 6 0 0 1 8 2c3 0 5 2 7.333 2q2 0 3.067-.8A1 1 0 0 1 20 4v10a1 1 0 0 1-.4.8A6 6 0 0 1 16 16c-3 0-5-2-8-2a6 6 0 0 0-4 1.528" />
    </svg>
  </div>`,
  iconSize: [24, 24],
  iconAnchor: [4, 24], // Base of the flag pole
});

// Ongoing Walk-in — pulsing green marker
export const ongoingWalkInIcon = L.divIcon({
  className: 'bg-transparent',
  html: `<div style="position:relative;width:24px;height:24px;display:flex;align-items:center;justify-content:center;">
    <div style="position:absolute;inset:0;border-radius:50%;background:rgba(34,197,94,0.3);animation:pulse-ring 1.5s ease-out infinite;"></div>
    <div style="width:12px;height:12px;background:#22c55e;border-radius:50%;border:2px solid #fff;position:relative;z-index:2;box-shadow:0 2px 4px rgba(0,0,0,0.3);"></div>
  </div>`,
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});
