import { useEffect, useMemo, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

export type ZonePoint = { lat: number; lng: number };

export type ZoneLocationPickerMapProps = {
  latitude: number;
  longitude: number;
  zoneSizeMeters: number;
  polygon?: ZonePoint[];
  color?: string;
  onChange: (next: { latitude: number; longitude: number; polygon: ZonePoint[] }) => void;
  className?: string;
};

const metersToLatDelta = (meters: number) => meters / 111_320;
const metersToLngDelta = (meters: number, atLatitude: number) => meters / (111_320 * Math.cos((atLatitude * Math.PI) / 180));

const buildRectanglePolygon = (latitude: number, longitude: number, sizeMeters: number): ZonePoint[] => {
  const half = Math.max(10, sizeMeters) / 2;
  const dLat = metersToLatDelta(half);
  const dLng = metersToLngDelta(half, latitude);
  return [
    { lat: latitude + dLat, lng: longitude - dLng },
    { lat: latitude + dLat, lng: longitude + dLng },
    { lat: latitude - dLat, lng: longitude + dLng },
    { lat: latitude - dLat, lng: longitude - dLng },
  ];
};

export const ZoneLocationPickerMap = ({
  latitude,
  longitude,
  zoneSizeMeters,
  polygon,
  color = '#3b82f6',
  onChange,
  className,
}: ZoneLocationPickerMapProps) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const polygonRef = useRef<L.Polygon | null>(null);
  const zoneSizeRef = useRef(zoneSizeMeters);

  zoneSizeRef.current = zoneSizeMeters;

  const polygonToRender = useMemo(
    () => (polygon && polygon.length >= 3 ? polygon : buildRectanglePolygon(latitude, longitude, zoneSizeMeters)),
    [polygon, latitude, longitude, zoneSizeMeters],
  );

  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return;

    const map = L.map(mapRef.current, { zoomControl: true }).setView([latitude, longitude], 16);
    mapInstance.current = map;

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a>',
    }).addTo(map);

    map.on('click', (e) => {
      onChange({
        latitude: e.latlng.lat,
        longitude: e.latlng.lng,
        polygon: buildRectanglePolygon(e.latlng.lat, e.latlng.lng, zoneSizeRef.current),
      });
    });

    return () => {
      map.remove();
      mapInstance.current = null;
      markerRef.current = null;
      polygonRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!mapInstance.current) return;

    const map = mapInstance.current;
    const latLng: L.LatLngExpression = [latitude, longitude];

    if (!markerRef.current) {
      markerRef.current = L.marker(latLng, { draggable: true }).addTo(map);
      markerRef.current.on('dragend', () => {
        const pos = markerRef.current?.getLatLng();
        if (!pos) return;
        onChange({
          latitude: pos.lat,
          longitude: pos.lng,
          polygon: buildRectanglePolygon(pos.lat, pos.lng, zoneSizeRef.current),
        });
      });
    } else {
      markerRef.current.setLatLng(latLng);
    }

    if (!polygonRef.current) {
      polygonRef.current = L.polygon(polygonToRender.map((p) => [p.lat, p.lng]), {
        color,
        fillColor: color,
        fillOpacity: 0.22,
        weight: 2,
      }).addTo(map);
    } else {
      polygonRef.current.setLatLngs(polygonToRender.map((p) => [p.lat, p.lng]));
      polygonRef.current.setStyle({ color, fillColor: color });
    }
  }, [latitude, longitude, polygonToRender, color, zoneSizeMeters, onChange]);

  return <div ref={mapRef} className={className} style={{ height: '320px', width: '100%', borderRadius: 12 }} />;
};
