// src/components/MapView.tsx
"use client";

import { useCallback, useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";
import type * as L from "leaflet";

import type { Person } from "@/lib/types";

export default function MapView({
  persons,
  height = "70vh",
}: {
  persons: Person[];
  height?: string;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  // Leaflet objects live across renders in refs (the module itself is
  // dynamically imported below because it touches `window` at import time
  // and must never execute during the server prerender / static export).
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.LayerGroup | null>(null);
  const leafletRef = useRef<typeof L | null>(null);
  const personsRef = useRef<Person[]>(persons);

  // Redraw ONLY the markers layer. Cheap and race-free: the map object and
  // its DOM are never torn down here, so zoom/wheel handlers always belong
  // to a live map.
  const redrawMarkers = useCallback(() => {
    const leaflet = leafletRef.current;
    const map = mapRef.current;
    const markers = markersRef.current;
    if (!leaflet || !map || !markers) return;

    markers.clearLayers();

    // Red dot markers (no image assets needed → works fully offline)
    const icon = leaflet.divIcon({
      className: "custom-div-icon",
      html: '<div style="background-color:#c0392b;width:14px;height:14px;border-radius:50%;border:2px solid #fff;"></div>',
      iconSize: [14, 14],
      iconAnchor: [7, 7],
    });

    for (const person of personsRef.current) {
      if (!person.last_seen_location) continue;
      const { latitude, longitude, name } = person.last_seen_location;
      leaflet
        .marker([latitude, longitude], { icon })
        .addTo(markers)
        .bindPopup(
          `<strong>${person.full_name}</strong><br/>${name}<br/><a href="/persons/${person.id}/">View case →</a>`
        );
    }
  }, []);

  // 1) Map lifecycle — created EXACTLY ONCE per mount, removed exactly once
  //    on unmount. Never re-run on prop changes (a data change only redraws
  //    markers), which removes the teardown/re-create race that previously
  //    crashed scroll-wheel zoom ("_leaflet_pos" TypeError).
  useEffect(() => {
    let cancelled = false;

    (async () => {
      const leaflet = await import("leaflet");
      if (cancelled || !containerRef.current || mapRef.current) return;

      // Default view: centre of Tanzania
      const map = leaflet
        .map(containerRef.current)
        .setView([-6.369, 34.8888], 6);

      leaflet
        .tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
          maxZoom: 18,
        })
        .addTo(map);

      // All markers live in one LayerGroup so they can be redrawn without
      // touching the map itself.
      const markers = leaflet.layerGroup().addTo(map);

      leafletRef.current = leaflet;
      mapRef.current = map;
      markersRef.current = markers;

      redrawMarkers();
    })();

    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
      markersRef.current = null;
      leafletRef.current = null;
    };
  }, [redrawMarkers]);

  // 2) Marker data — redraw the layer group whenever the persons prop
  //    changes. Works even when the map finishes initializing after this
  //    effect first runs (async import): the lifecycle effect calls
  //    redrawMarkers() once it is ready.
  useEffect(() => {
    personsRef.current = persons;
    redrawMarkers();
  }, [persons, redrawMarkers]);

  return (
    <div
      ref={containerRef}
      style={{ height, width: "100%" }}
      className="z-0 overflow-hidden rounded-xl"
    />
  );
}

