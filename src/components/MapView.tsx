// src/components/MapView.tsx
"use client";

import { useEffect, useRef } from "react";
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
  const mapRef = useRef<L.Map | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      // Lazy-import leaflet: it touches `window` at module scope, so it must
      // never execute while the page is being prerendered on the server.
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

      // Red dot markers (no image assets needed → works fully offline)
      const icon = leaflet.divIcon({
        className: "custom-div-icon",
        html: '<div style="background-color:#c0392b;width:14px;height:14px;border-radius:50%;border:2px solid #fff;"></div>',
        iconSize: [14, 14],
        iconAnchor: [7, 7],
      });

      for (const person of persons) {
        if (!person.last_seen_location) continue;
        const { latitude, longitude, name } = person.last_seen_location;
        leaflet
          .marker([latitude, longitude], { icon })
          .addTo(map)
          .bindPopup(
            `<strong>${person.full_name}</strong><br/>${name}<br/><a href="/persons/${person.id}/">View case →</a>`
          );
      }

      mapRef.current = map;
    })();

    return () => {
      cancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [persons]);

  return (
    <div
      ref={containerRef}
      style={{ height, width: "100%" }}
      className="z-0 overflow-hidden rounded-xl"
    />
  );
}
