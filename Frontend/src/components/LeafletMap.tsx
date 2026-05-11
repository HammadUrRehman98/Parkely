import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface MapZone {
  id: string;
  name: string;
  address: string;
  polygon: [number, number][];
  color: string;
  availableSlots: number;
  capacity: number;
  pricePerHour: number;
}

interface LeafletMapProps {
  center: [number, number];
  zoom: number;
  zones: MapZone[];
  onZoneBook?: (zoneId: string) => void;
  className?: string;
}

export const LeafletMap = ({ center, zoom, zones, onZoneBook, className }: LeafletMapProps) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);
  const zoneLayerRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return;

    const map = L.map(mapRef.current).setView(center, zoom);
    mapInstance.current = map;

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a>',
    }).addTo(map);

    return () => {
      map.remove();
      mapInstance.current = null;
      zoneLayerRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!mapInstance.current) return;

    if (zoneLayerRef.current) {
      zoneLayerRef.current.remove();
    }

    const layerGroup = L.layerGroup().addTo(mapInstance.current);
    zoneLayerRef.current = layerGroup;

    zones.forEach((zone) => {
      if (zone.polygon.length === 0) return;
      const polygon = L.polygon(zone.polygon, {
        color: zone.color,
        fillColor: zone.color,
        fillOpacity: 0.3,
      }).addTo(layerGroup);

      const popupContent = document.createElement('div');
      popupContent.style.minWidth = '180px';
      popupContent.innerHTML = `
        <h3 style="font-weight:bold;font-size:14px;margin:0 0 4px">${zone.name}</h3>
        <p style="font-size:12px;color:#666;margin:0 0 8px">${zone.address}</p>
        <div style="font-size:12px;margin-bottom:8px">
          <p style="margin:2px 0">Available: <strong>${zone.availableSlots}/${zone.capacity}</strong></p>
          <p style="margin:2px 0">Price: <strong>$${zone.pricePerHour}/hr</strong></p>
        </div>
      `;

      const btn = document.createElement('button');
      btn.textContent = 'Book Now';
      btn.style.cssText = 'width:100%;background:#4361ee;color:white;font-size:12px;padding:6px;border:none;border-radius:6px;cursor:pointer;';
      btn.onmouseenter = () => { btn.style.background = '#3651d4'; };
      btn.onmouseleave = () => { btn.style.background = '#4361ee'; };
      btn.onclick = () => onZoneBook?.(zone.id);
      popupContent.appendChild(btn);

      polygon.bindPopup(popupContent);
    });

    return () => {
      layerGroup.remove();
    };
  }, [zones, onZoneBook]);

  return <div ref={mapRef} className={className} style={{ minHeight: '400px', height: '100%', width: '100%' }} />;
};
