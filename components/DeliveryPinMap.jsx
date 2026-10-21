'use client';

import { useEffect, useRef, useState } from 'react';
import 'leaflet/dist/leaflet.css';
import {
  EMIRATE_CENTERS,
  UAE_MAP_BOUNDS,
  UAE_MAP_CENTER,
  isInsideUae,
} from '@/lib/uaeBounds';

// "Pin your exact location" map for checkout. UAE ONLY:
//  - the map can't be scrolled or zoomed out of the UAE
//  - a pin outside the UAE outline is refused (and the server checks again)
// The pin is sent with the address as lat / lng, and the delivery fee is
// then measured to that exact spot instead of guessing from address text.

const OUTSIDE_MESSAGE = 'Please choose a spot inside the United Arab Emirates.';

const PIN_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" width="34" height="44" viewBox="0 0 34 44">' +
  '<path d="M17 0C7.6 0 0 7.5 0 16.8 0 29.4 17 44 17 44s17-14.6 17-27.2C34 7.5 26.4 0 17 0z" fill="#c8102e" stroke="#ffffff" stroke-width="2"/>' +
  '<circle cx="17" cy="16.5" r="6" fill="#ffffff"/></svg>';

export default function DeliveryPinMap({ lat, lng, emirate, status = 'idle', onChange }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const leafletRef = useRef(null);
  const onChangeRef = useRef(onChange);
  const [ready, setReady] = useState(false);
  const [message, setMessage] = useState('');
  const [locating, setLocating] = useState(false);

  onChangeRef.current = onChange;

  const hasPin = Number.isFinite(Number(lat)) && Number.isFinite(Number(lng)) && lat !== '' && lng !== '' && lat != null && lng != null;

  // Put (or move) the marker, or remove it when there is no pin.
  function syncMarker(L, map, nextLat, nextLng, draggable = true) {
    if (nextLat == null || nextLng == null) {
      if (markerRef.current) {
        map.removeLayer(markerRef.current);
        markerRef.current = null;
      }
      return;
    }

    if (markerRef.current) {
      markerRef.current.setLatLng([nextLat, nextLng]);
      return;
    }

    const icon = L.divIcon({
      className: '',
      html: PIN_SVG,
      iconSize: [34, 44],
      iconAnchor: [17, 44],
    });

    const marker = L.marker([nextLat, nextLng], { icon, draggable }).addTo(map);
    marker.on('dragend', () => {
      const p = marker.getLatLng();
      if (!isInsideUae(p.lat, p.lng)) {
        setMessage(OUTSIDE_MESSAGE);
        // snap back to the last good pin
        const back = lastGood.current;
        if (back) marker.setLatLng([back.lat, back.lng]);
        return;
      }
      setMessage('');
      placePin(p.lat, p.lng, false);
    });
    markerRef.current = marker;
  }

  const lastGood = useRef(null);

  function placePin(nextLat, nextLng, moveMarker = true) {
    const rounded = {
      lat: Math.round(nextLat * 1e6) / 1e6,
      lng: Math.round(nextLng * 1e6) / 1e6,
    };
    lastGood.current = rounded;
    if (moveMarker && leafletRef.current && mapRef.current) {
      syncMarker(leafletRef.current, mapRef.current, rounded.lat, rounded.lng);
    }
    onChangeRef.current?.(rounded);
  }

  // Create the map once.
  useEffect(() => {
    let cancelled = false;

    (async () => {
      const L = (await import('leaflet')).default;
      if (cancelled || !containerRef.current || mapRef.current) return;

      leafletRef.current = L;

      const start = hasPin
        ? { lat: Number(lat), lng: Number(lng) }
        : EMIRATE_CENTERS[emirate] || UAE_MAP_CENTER;

      const map = L.map(containerRef.current, {
        center: [start.lat, start.lng],
        zoom: hasPin ? 17 : 11,
        minZoom: 7,
        maxBounds: UAE_MAP_BOUNDS,
        maxBoundsViscosity: 1.0,
        worldCopyJump: false,
      });

      // Esri "World Street Map" tiles: English street and place names, and
      // no API key needed.
      L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',
        {
          maxZoom: 19,
          attribution:
            'Tiles &copy; Esri &mdash; Source: Esri, DeLorme, NAVTEQ, USGS, and the GIS User Community',
        }
      ).addTo(map);

      map.on('click', (event) => {
        const { lat: clickLat, lng: clickLng } = event.latlng;
        if (!isInsideUae(clickLat, clickLng)) {
          setMessage(OUTSIDE_MESSAGE);
          return;
        }
        setMessage('');
        placePin(clickLat, clickLng);
      });

      mapRef.current = map;

      if (hasPin) {
        lastGood.current = { lat: Number(lat), lng: Number(lng) };
        syncMarker(L, map, Number(lat), Number(lng));
      }

      // The map sits in a layout that can still be settling.
      setTimeout(() => map.invalidateSize(), 150);
      setReady(true);
    })();

    return () => {
      cancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        markerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep the marker in step with the pin held by the checkout form.
  useEffect(() => {
    if (!ready || !mapRef.current || !leafletRef.current) return;
    if (hasPin) {
      lastGood.current = { lat: Number(lat), lng: Number(lng) };
      syncMarker(leafletRef.current, mapRef.current, Number(lat), Number(lng));
    } else {
      lastGood.current = null;
      syncMarker(leafletRef.current, mapRef.current, null, null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lat, lng, ready]);

  // No pin yet: when the customer picks an emirate, show that emirate.
  useEffect(() => {
    if (!ready || !mapRef.current || hasPin) return;
    const center = EMIRATE_CENTERS[emirate];
    if (center) mapRef.current.setView([center.lat, center.lng], 11);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [emirate, ready]);

  function useMyLocation() {
    if (!navigator.geolocation) {
      setMessage('Your browser cannot share your location. Please tap the map instead.');
      return;
    }
    setLocating(true);
    setMessage('');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocating(false);
        const { latitude, longitude } = position.coords;
        if (!isInsideUae(latitude, longitude)) {
          setMessage(`Your current location is outside the UAE. ${OUTSIDE_MESSAGE}`);
          return;
        }
        placePin(latitude, longitude);
        mapRef.current?.setView([latitude, longitude], 17);
      },
      () => {
        setLocating(false);
        setMessage('We could not get your location. Please tap the map to drop the pin.');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  function removePin() {
    setMessage('');
    lastGood.current = null;
    onChangeRef.current?.(null);
  }

  return (
    <div>
      <style>{`
        .stitch-pin-map .leaflet-container { font: inherit; }
        .stitch-pin-map .leaflet-tile,
        .stitch-pin-map .leaflet-container img { max-width: none !important; max-height: none !important; }
        .stitch-pin-map .leaflet-container a { color: #0b57d0; }
      `}</style>

      <label className="block text-xs uppercase tracking-widest text-thread/50 mb-2">
        Pin your exact location
      </label>

      <div className="stitch-pin-map relative z-0 isolate overflow-hidden rounded-sm border border-white/15">
        <div ref={containerRef} className="h-72 w-full bg-canvas2" />
        {!ready && (
          <div className="absolute inset-0 flex items-center justify-center text-sm text-thread/40 bg-canvas2">
            Loading map&hellip;
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3 mt-3">
        <button
          type="button"
          onClick={useMyLocation}
          disabled={locating}
          className="text-xs uppercase tracking-widest border border-gold/60 text-gold px-3 py-2 rounded-sm hover:bg-gold/10 disabled:opacity-50"
        >
          {locating ? 'Finding you…' : 'Use my current location'}
        </button>

        {hasPin && (
          <button
            type="button"
            onClick={removePin}
            className="text-xs uppercase tracking-widest border border-white/20 text-thread/60 px-3 py-2 rounded-sm hover:bg-white/5"
          >
            Remove pin
          </button>
        )}
      </div>

      {message && (
        <p className="text-stitchRed text-sm mt-3 leading-relaxed" role="alert">
          {message}
        </p>
      )}

      {!message && (
        <p className="text-thread/40 text-xs mt-3 leading-relaxed">
          {hasPin && status === 'loading'
            ? 'Filling in your address…'
            : hasPin && status === 'done'
            ? 'Address filled in from your pin. Please check it and correct anything that is wrong. You can drag the pin to adjust.'
            : hasPin && status === 'failed'
            ? 'Pin saved, but we could not fill in the address. Please type it in. You can drag the pin to adjust.'
            : hasPin
            ? 'Pin saved. Drag it to adjust. Delivery is available inside the UAE only.'
            : 'Tap the map to drop a pin at your door, or use your current location. Delivery is available inside the UAE only.'}
        </p>
      )}
    </div>
  );
}
