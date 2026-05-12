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
