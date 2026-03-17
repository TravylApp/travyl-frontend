'use client';

import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { GlobeLocation } from '@travyl/shared';

function createPushPinIcon(color: string, isSelected: boolean) {
  const s = isSelected ? 22 : 16;
  const ring = isSelected ? 3 : 2;
  return L.divIcon({
    className: '',
    html: `
      <div style="position:relative;width:${s}px;height:${s + 8}px;cursor:pointer;filter:drop-shadow(0 2px 3px rgba(0,0,0,0.35));">
        <div style="
          width:${s}px;height:${s}px;border-radius:50%;
          background:radial-gradient(circle at 38% 32%, #fff 0%, ${color} 45%, ${color}cc 100%);
          border:${ring}px solid rgba(255,255,255,0.9);
          box-shadow:inset 0 -3px 6px rgba(0,0,0,0.25), inset 0 2px 4px rgba(255,255,255,0.5);
          ${isSelected ? 'transform:scale(1.15);' : ''}
          transition:transform 0.2s;
        "></div>
        <div style="
          position:absolute;left:50%;top:${s - 1}px;transform:translateX(-50%);
          width:2px;height:8px;
          background:linear-gradient(to bottom,#777,#444);
          border-radius:0 0 1px 1px;
        "></div>
      </div>
    `,
    iconSize: [s, s + 8],
    iconAnchor: [s / 2, s + 8],
    popupAnchor: [0, -(s + 6)],
  });
}

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function buildPostcardPopup(loc: GlobeLocation): string {
  const seed = hashStr(loc.id);
  const tilt = ((seed % 40) / 10 - 2).toFixed(1);
  const stampHue = seed % 360;

  const img = loc.imageUrl
    ? `<div style="position:relative;overflow:hidden;height:90px;border-radius:2px;">
        <img src="${loc.imageUrl}" style="width:100%;height:100%;object-fit:cover;filter:saturate(1.1) contrast(1.05);" />
        <div style="position:absolute;inset:0;background:linear-gradient(135deg,rgba(255,220,150,0.12) 0%,transparent 50%);"></div>
       </div>`
    : `<div style="height:90px;background:linear-gradient(135deg,#E8D5B0 0%,#D4B88A 100%);border-radius:2px;display:flex;align-items:center;justify-content:center;">
        <span style="font-size:28px;">&#128506;</span>
       </div>`;

  const ratingHtml = loc.rating
    ? `<span style="display:inline-flex;align-items:center;gap:2px;font-size:10px;color:#B8860B;font-weight:700;">&#9733; ${loc.rating}</span>`
    : '';
  const dateHtml = loc.date
    ? `<span style="font-size:9px;color:#8B7355;font-style:italic;">${loc.date}</span>`
    : '';

  return `
    <div style="transform:rotate(${tilt}deg);min-width:200px;max-width:230px;font-family:system-ui,sans-serif;filter:drop-shadow(0 4px 12px rgba(0,0,0,0.3));">
      <div style="background:linear-gradient(145deg,#FFF8EC 0%,#F5E6CC 40%,#EDD9B5 100%);border:1px solid #D4C4A0;border-radius:3px;padding:8px;position:relative;overflow:hidden;">
        <div style="position:absolute;inset:0;opacity:0.06;pointer-events:none;"></div>
        <div style="position:absolute;top:6px;right:6px;width:32px;height:38px;background:linear-gradient(135deg,hsl(${stampHue},55%,85%) 0%,hsl(${stampHue},45%,75%) 100%);border:2px dashed hsl(${stampHue},30%,65%);border-radius:1px;display:flex;align-items:center;justify-content:center;flex-direction:column;transform:rotate(${((seed >> 4) % 6 - 3)}deg);opacity:0.85;z-index:2;">
          <span style="font-size:10px;">&#9992;</span>
          <span style="font-size:6px;color:hsl(${stampHue},40%,35%);font-weight:700;margin-top:1px;">AIRMAIL</span>
        </div>
        <div style="position:absolute;top:2px;right:18px;width:44px;height:44px;border:2px solid rgba(180,50,50,0.2);border-radius:50%;transform:rotate(${((seed >> 8) % 30 - 15)}deg);z-index:3;">
          <div style="position:absolute;top:50%;left:-4px;right:-4px;height:1px;background:rgba(180,50,50,0.15);"></div>
          <div style="position:absolute;top:calc(50% - 4px);left:-4px;right:-4px;height:1px;background:rgba(180,50,50,0.12);"></div>
          <div style="position:absolute;top:calc(50% + 4px);left:-4px;right:-4px;height:1px;background:rgba(180,50,50,0.12);"></div>
        </div>
        <div style="margin-bottom:6px;position:relative;z-index:1;">
          <p style="font-size:9px;color:#A0896A;font-style:italic;margin:0 0 1px;letter-spacing:0.5px;">Greetings from</p>
          <p style="font-size:16px;font-weight:800;color:#4A3520;margin:0;letter-spacing:-0.5px;line-height:1.1;max-width:150px;text-shadow:0 1px 0 rgba(255,255,255,0.3);">${loc.name}</p>
        </div>
        <div style="position:relative;z-index:1;margin-bottom:6px;border:3px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,0.15);border-radius:2px;">
          ${img}
        </div>
        <div style="position:relative;z-index:1;">
          <div style="display:flex;align-items:center;gap:4px;margin-bottom:3px;">
            <span style="font-size:10px;">&#128205;</span>
            <span style="font-size:10px;color:#7A6B52;font-weight:600;">${loc.location}</span>
          </div>
          <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
            <span style="padding:1px 6px;border-radius:2px;font-size:8px;font-weight:700;background:#E8D5B0;color:#6B5B47;border:1px solid #D4C4A0;letter-spacing:0.3px;text-transform:uppercase;">${loc.category}</span>
            ${ratingHtml}${dateHtml}
          </div>
          ${loc.board ? `<p style="font-size:8px;color:#A0896A;margin:4px 0 0;font-style:italic;">&#128203; ${loc.board}</p>` : ''}
        </div>
        <div style="position:absolute;bottom:4px;right:4px;width:20px;height:20px;border-right:1px solid #D4C4A0;border-bottom:1px solid #D4C4A0;opacity:0.5;"></div>
        <div style="position:absolute;top:4px;left:4px;width:20px;height:20px;border-left:1px solid #D4C4A0;border-top:1px solid #D4C4A0;opacity:0.5;"></div>
      </div>
      <div style="position:absolute;top:-6px;left:50%;transform:translateX(-50%);width:14px;height:14px;border-radius:50%;background:radial-gradient(circle at 38% 32%,#fff 0%,#E53E3E 45%);border:2px solid rgba(255,255,255,0.9);box-shadow:0 2px 4px rgba(0,0,0,0.3);z-index:10;"></div>
    </div>
  `;
}

interface CorkBoardMapProps {
  locations: GlobeLocation[];
  activeBoard?: string | null;
  selectedLocationId?: string | null;
  onSelectLocation?: (id: string | null) => void;
  height?: string;
}

export function CorkBoardMap({
  locations,
  activeBoard,
  selectedLocationId,
  onSelectLocation,
  height = '100%',
}: CorkBoardMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.LayerGroup | null>(null);
  const onSelectRef = useRef(onSelectLocation);
  onSelectRef.current = onSelectLocation;

  const filtered = activeBoard
    ? locations.filter((l) => l.board === activeBoard)
    : locations;

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: [30, 10],
      zoom: 2,
      zoomControl: false,
      scrollWheelZoom: true,
      minZoom: 2,
      maxZoom: 8,
    });

    L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/NatGeo_World_Map/MapServer/tile/{z}/{y}/{x}',
      { attribution: 'Tiles &copy; Esri &mdash; National Geographic', maxZoom: 12 }
    ).addTo(map);

    L.control.zoom({ position: 'bottomright' }).addTo(map);
    markersRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;

    setTimeout(() => map.invalidateSize(), 100);

    return () => {
      map.remove();
      mapRef.current = null;
      markersRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const markerGroup = markersRef.current;
    if (!map || !markerGroup) return;

    markerGroup.clearLayers();

    filtered.forEach((loc) => {
      const isSelected = loc.id === selectedLocationId;
      const marker = L.marker([loc.lat, loc.lng], {
        icon: createPushPinIcon(loc.color, isSelected),
        zIndexOffset: isSelected ? 1000 : 0,
      });

      marker.bindPopup(buildPostcardPopup(loc), {
        className: 'cork-postcard-popup',
        closeButton: false,
        maxWidth: 250,
        offset: [0, -4],
      });

      marker.on('click', () => onSelectRef.current?.(loc.id));
      markerGroup.addLayer(marker);
    });

    if (filtered.length > 0) {
      const bounds = L.latLngBounds(filtered.map((l) => [l.lat, l.lng] as [number, number]));
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 5 });
    }
  }, [filtered, selectedLocationId]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selectedLocationId) return;

    const loc = locations.find((l) => l.id === selectedLocationId);
    if (!loc) return;

    map.flyTo([loc.lat, loc.lng], 5, { duration: 1 });

    const markerGroup = markersRef.current;
    if (markerGroup) {
      markerGroup.eachLayer((layer: any) => {
        if (layer.getLatLng) {
          const ll = layer.getLatLng();
          if (Math.abs(ll.lat - loc.lat) < 0.001 && Math.abs(ll.lng - loc.lng) < 0.001) {
            layer.openPopup();
          }
        }
      });
    }
  }, [selectedLocationId, locations]);

  return (
    <div className="cork-map-container relative overflow-hidden" style={{ height, minHeight: '250px' }}>
      <div ref={containerRef} style={{ height: '100%', width: '100%' }} />
      <style>{`
        .cork-map-container { background: #C4A265; }
        .cork-map-container .leaflet-tile-pane { filter: sepia(0.25) saturate(0.85) brightness(0.95) contrast(1.05); }
        .cork-map-container .leaflet-control-zoom { border: none !important; box-shadow: 0 2px 8px rgba(0,0,0,0.3) !important; border-radius: 8px !important; overflow: hidden; }
        .cork-map-container .leaflet-control-zoom a { background: rgba(92,61,30,0.9) !important; color: #E8D5B0 !important; border: none !important; border-bottom: 1px solid rgba(255,255,255,0.1) !important; width: 32px !important; height: 32px !important; line-height: 32px !important; font-size: 15px !important; }
        .cork-map-container .leaflet-control-zoom a:hover { background: rgba(110,75,35,0.95) !important; color: #FFF8EC !important; }
        .cork-map-container .leaflet-control-zoom a:last-child { border-bottom: none !important; }
        .cork-postcard-popup .leaflet-popup-content-wrapper { background: transparent !important; box-shadow: none !important; border-radius: 0 !important; padding: 0 !important; }
        .cork-postcard-popup .leaflet-popup-content { margin: 0 !important; }
        .cork-postcard-popup .leaflet-popup-tip { display: none !important; }
        .cork-map-container .leaflet-container { background: #C4A265 !important; }
      `}</style>
    </div>
  );
}
