import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { formatPKR } from '@/lib/currency';

interface MapZone {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
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
  fitToZones?: boolean;
}

export const LeafletMap = ({ center, zoom, zones, onZoneBook, className, fitToZones }: LeafletMapProps) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);
  const zoneLayerRef = useRef<L.LayerGroup | null>(null);
  const userMarkerRef = useRef<L.CircleMarker | null>(null);
  const userAccuracyRef = useRef<L.Circle | null>(null);
  const locateControlRef = useRef<L.Control | null>(null);
  const geoWatchIdRef = useRef<number | null>(null);
  const latestUserLatLngRef = useRef<L.LatLng | null>(null);
  const didAutoCenterOnUserRef = useRef(false);

  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return;

    const map = L.map(mapRef.current).setView(center, zoom);
    mapInstance.current = map;

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a>',
    }).addTo(map);

    if ('geolocation' in navigator) {
      const updateUserLocation = (lat: number, lng: number, accuracy?: number) => {
        if (!mapInstance.current) return;

        const latLng = L.latLng(lat, lng);
        latestUserLatLngRef.current = latLng;

        if (!userMarkerRef.current) {
          userMarkerRef.current = L.circleMarker(latLng, {
            radius: 7,
            color: '#1d4ed8',
            weight: 2,
            fillColor: '#3b82f6',
            fillOpacity: 0.9,
          }).addTo(mapInstance.current);
          userMarkerRef.current.bindTooltip('You are here', { direction: 'top', offset: [0, -6], opacity: 0.9 });
        } else {
          userMarkerRef.current.setLatLng(latLng);
        }

        if (typeof accuracy === 'number' && Number.isFinite(accuracy)) {
          if (!userAccuracyRef.current) {
            userAccuracyRef.current = L.circle(latLng, {
              radius: accuracy,
              color: '#60a5fa',
              weight: 1,
              fillColor: '#93c5fd',
              fillOpacity: 0.25,
            }).addTo(mapInstance.current);
          } else {
            userAccuracyRef.current.setLatLng(latLng);
            userAccuracyRef.current.setRadius(accuracy);
          }
        }
      };

      const autoCenterOnUser = (lat: number, lng: number) => {
        if (!mapInstance.current || didAutoCenterOnUserRef.current) return;
        didAutoCenterOnUserRef.current = true;
        mapInstance.current.setView(L.latLng(lat, lng), Math.max(zoom, 16), { animate: false });
      };

      navigator.geolocation.getCurrentPosition(
        (pos) => {
          updateUserLocation(pos.coords.latitude, pos.coords.longitude, pos.coords.accuracy);
          autoCenterOnUser(pos.coords.latitude, pos.coords.longitude);
        },
        () => {
          // Permission denied / unavailable — map still works without user location.
        },
        { enableHighAccuracy: true, maximumAge: 10_000, timeout: 10_000 },
      );

      geoWatchIdRef.current = navigator.geolocation.watchPosition(
        (pos) => {
          updateUserLocation(pos.coords.latitude, pos.coords.longitude, pos.coords.accuracy);
          autoCenterOnUser(pos.coords.latitude, pos.coords.longitude);
        },
        () => {
          // Permission denied / unavailable — map still works without user location.
        },
        { enableHighAccuracy: true, maximumAge: 10_000, timeout: 10_000 },
      );

      const LocateControl = L.Control.extend({
        onAdd: () => {
          const container = L.DomUtil.create('div', 'leaflet-bar leaflet-control');
          const button = L.DomUtil.create('a', '', container);
          button.setAttribute('href', '#');
          button.setAttribute('title', 'Center on my location');
          button.style.width = '30px';
          button.style.height = '30px';
          button.style.display = 'grid';
          button.style.placeItems = 'center';
          button.style.fontSize = '16px';
          button.style.lineHeight = '30px';
          button.style.background = '#fff';
          button.style.color = '#111827';
          button.textContent = '⌖';

          L.DomEvent.disableClickPropagation(container);
          L.DomEvent.on(button, 'click', (e) => {
            L.DomEvent.preventDefault(e);
            const latest = latestUserLatLngRef.current;
            if (!latest || !mapInstance.current) return;
            mapInstance.current.setView(latest, Math.max(mapInstance.current.getZoom(), 16), { animate: true });
          });

          return container;
        },
      });

      locateControlRef.current = new LocateControl({ position: 'topleft' });
      locateControlRef.current.addTo(map);
    }

    return () => {
      if (geoWatchIdRef.current !== null && 'geolocation' in navigator) {
        navigator.geolocation.clearWatch(geoWatchIdRef.current);
        geoWatchIdRef.current = null;
      }

      locateControlRef.current?.remove();
      locateControlRef.current = null;

      userMarkerRef.current?.remove();
      userMarkerRef.current = null;

      userAccuracyRef.current?.remove();
      userAccuracyRef.current = null;

      latestUserLatLngRef.current = null;
      didAutoCenterOnUserRef.current = false;

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

    const boundsPoints: L.LatLng[] = [];

    zones.forEach((zone) => {
      const zoneCenter = L.latLng(zone.lat, zone.lng);
      boundsPoints.push(zoneCenter);

      const availabilityPct = zone.capacity > 0 ? Math.round((zone.availableSlots / zone.capacity) * 100) : 0;
      const badgeColor = availabilityPct >= 50 ? '#16a34a' : availabilityPct >= 20 ? '#f59e0b' : '#ef4444';
      const formattedRate = formatPKR(zone.pricePerHour);

      const marker = L.marker(zoneCenter, {
        icon: L.divIcon({
          className: '',
          html: `
            <div style="position:relative;width:30px;height:30px">
              <div style="
                display:flex;align-items:center;justify-content:center;
                width:30px;height:30px;border-radius:999px;
                background:${zone.color};
                border:2px solid #ffffff;
                box-shadow:0 4px 10px rgba(0,0,0,0.18);
              "></div>
              <div style="
                position:absolute;transform:translate(-50%, -50%);
                left:50%;top:50%;
                min-width:22px;height:18px;padding:0 6px;border-radius:999px;
                background:${badgeColor};color:#fff;font-size:11px;font-weight:700;
                display:flex;align-items:center;justify-content:center;
                box-shadow:0 2px 8px rgba(0,0,0,0.15);
              ">${zone.availableSlots}</div>
            </div>
          `,
          iconSize: [30, 30],
          iconAnchor: [15, 15],
        }),
        keyboard: false,
      }).addTo(layerGroup);

      const popupContent = document.createElement('div');
      popupContent.style.minWidth = '200px';
      popupContent.innerHTML = `
        <h3 style="font-weight:bold;font-size:14px;margin:0 0 4px">${zone.name}</h3>
        <p style="font-size:12px;color:#666;margin:0 0 8px">${zone.address}</p>
        <div style="display:flex;gap:8px;flex-wrap:wrap;font-size:12px;margin-bottom:10px">
          <span style="padding:2px 8px;border-radius:999px;background:rgba(59,130,246,0.12);color:#1d4ed8">
            ${formattedRate}/hr
          </span>
          <span style="padding:2px 8px;border-radius:999px;background:rgba(34,197,94,0.12);color:#15803d">
            ${zone.availableSlots}/${zone.capacity} free
          </span>
        </div>
      `;

      if (onZoneBook) {
        const btn = document.createElement('button');
        btn.textContent = 'Book Now';
        btn.style.cssText = 'width:100%;background:#4361ee;color:white;font-size:12px;padding:8px;border:none;border-radius:8px;cursor:pointer;';
        btn.onmouseenter = () => { btn.style.background = '#3651d4'; };
        btn.onmouseleave = () => { btn.style.background = '#4361ee'; };
        btn.onclick = () => onZoneBook(zone.id);
        popupContent.appendChild(btn);
      }

      marker.bindPopup(popupContent);

      if (zone.polygon.length) {
        const polygon = L.polygon(zone.polygon, {
          color: zone.color,
          fillColor: zone.color,
          fillOpacity: 0.22,
          weight: 2,
        }).addTo(layerGroup);
        zone.polygon.forEach(([lat, lng]) => boundsPoints.push(L.latLng(lat, lng)));
        polygon.on('click', () => {
          marker.openPopup();
        });
      }

    });

    if (fitToZones && boundsPoints.length) {
      const bounds = L.latLngBounds(boundsPoints);
      mapInstance.current.fitBounds(bounds.pad(0.12), { animate: false });
    }

    return () => {
      layerGroup.remove();
    };
  }, [zones, onZoneBook, fitToZones]);

  return <div ref={mapRef} className={className} style={{ minHeight: '400px', height: '100%', width: '100%' }} />;
};
