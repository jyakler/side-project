"use client";

import { useEffect, useRef, useState } from "react";
import type { LayerGroup, Map as LeafletMap } from "leaflet";
import { MapIcon } from "lucide-react";
import "leaflet/dist/leaflet.css";

import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";

import type { Destination, LatLng } from "../model/destination";

// Seoul City Hall, used until a destination or position is known.
const DEFAULT_CENTER: LatLng = { lat: 37.5665, lng: 126.978 };

type DraftPin = LatLng & { radius: number };

type Props = {
  destinations: Destination[];
  draft: DraftPin | null;
  position: LatLng | null;
  /** Changes whenever the map should move to `focus`. */
  focus: (LatLng & { key: number }) | null;
  onPick: (point: LatLng) => void;
};

function cssColor(token: string, fallback: string) {
  const value = getComputedStyle(document.documentElement).getPropertyValue(token).trim();
  return value || fallback;
}

type Leaflet = typeof import("leaflet");

export function DestinationMap({ destinations, draft, position, focus, onPick }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<{ L: Leaflet; map: LeafletMap; pins: LayerGroup; me: LayerGroup } | null>(null);
  const onPickRef = useRef(onPick);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    onPickRef.current = onPick;
  }, [onPick]);

  useEffect(() => {
    let cancelled = false;
    let map: LeafletMap | null = null;
    // Leaflet touches `window` on import, so load it only in the browser.
    import("leaflet")
      .then((L) => {
        if (cancelled || !containerRef.current) return;
        map = L.map(containerRef.current).setView([DEFAULT_CENTER.lat, DEFAULT_CENTER.lng], 13);
        L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
          maxZoom: 19,
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        }).addTo(map);
        map.on("click", (event) => onPickRef.current({ lat: event.latlng.lat, lng: event.latlng.lng }));
        mapRef.current = { L, map, pins: L.layerGroup().addTo(map), me: L.layerGroup().addTo(map) };
        setReady(true);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
      map?.remove();
      mapRef.current = null;
    };
  }, []);

  // Keep the map sized to its container (panel height changes on narrow screens).
  useEffect(() => {
    const container = containerRef.current;
    if (!ready || !container) return;
    const observer = new ResizeObserver(() => mapRef.current?.map.invalidateSize());
    observer.observe(container);
    return () => observer.disconnect();
  }, [ready]);

  useEffect(() => {
    if (!ready || !focus || !mapRef.current) return;
    mapRef.current.map.flyTo([focus.lat, focus.lng], Math.max(mapRef.current.map.getZoom(), 15));
  }, [ready, focus]);

  // Destination pins and radius circles.
  useEffect(() => {
    if (!ready || !mapRef.current) return;
    const { L, pins } = mapRef.current;
    const color = cssColor("--primary", "#2563eb");
    pins.clearLayers();

    for (const destination of destinations) {
      const center: [number, number] = [destination.lat, destination.lng];
      L.circle(center, { radius: destination.radius, color, weight: 2, fillOpacity: 0.15 }).addTo(pins);
      L.circleMarker(center, { radius: 7, color, weight: 3, fillColor: "#fff", fillOpacity: 1 })
        .bindTooltip(destination.name)
        .addTo(pins);
    }

    if (draft) {
      const center: [number, number] = [draft.lat, draft.lng];
      L.circle(center, { radius: draft.radius, color, weight: 2, dashArray: "6 6", fillOpacity: 0.08 }).addTo(pins);
      L.circleMarker(center, { radius: 7, color, weight: 3, fillColor: color, fillOpacity: 1 }).addTo(pins);
    }
  }, [ready, destinations, draft]);

  // Current position dot (drawn locally, never sent anywhere).
  useEffect(() => {
    if (!ready || !mapRef.current) return;
    const { L, me } = mapRef.current;
    me.clearLayers();
    if (!position) return;
    const color = cssColor("--destructive", "#dc2626");
    L.circleMarker([position.lat, position.lng], { radius: 8, color: "#fff", weight: 3, fillColor: color, fillOpacity: 1 })
      .bindTooltip("현재 위치")
      .addTo(me);
  }, [ready, position]);

  if (failed) {
    return (
      <Empty className="h-full bg-muted">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <MapIcon />
          </EmptyMedia>
          <EmptyTitle>지도를 불러오지 못했습니다</EmptyTitle>
          <EmptyDescription>네트워크 연결을 확인한 뒤 다시 열어 주세요.</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return <div ref={containerRef} className="isolate h-full w-full bg-muted" data-testid="destination-map" />;
}
