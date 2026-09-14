// src/components/BloodStainsBackground.tsx
"use client";

export default function BloodStainsBackground() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden select-none opacity-85 mix-blend-multiply"
    >
      {/* SVG Filters & Gradients for Blood Dropped on Paper */}
      <svg className="absolute h-0 w-0" aria-hidden="true">
        <defs>
          {/* Paper Absorption Bleed Halo Filter */}
          <filter id="paper-soak" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="1.2" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>

          {/* Blood Drop Color Gradient (Center Liquid to Paper Edge) */}
          <radialGradient id="blood-paper-drop" cx="40%" cy="40%" r="60%">
            <stop offset="0%" stopColor="#c51d1d" />
            <stop offset="40%" stopColor="#991b1b" />
            <stop offset="75%" stopColor="#7f1d1d" />
            <stop offset="95%" stopColor="#450a0a" />
            <stop offset="100%" stopColor="#310404" />
          </radialGradient>

          {/* Dried/Soaked Paper Ring Edge Gradient */}
          <radialGradient id="soak-halo" cx="50%" cy="50%" r="50%">
            <stop offset="60%" stopColor="#7f1d1d" stopOpacity="0" />
            <stop offset="85%" stopColor="#580d0d" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#3b0707" stopOpacity="0.7" />
          </radialGradient>
        </defs>
      </svg>

      {/* --- Top-Left: Blood Drops on Paper --- */}
      <svg
        className="absolute top-6 left-6 w-52 h-52"
        viewBox="0 0 180 180"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Drop 1: Main paper impact drop */}
        <g filter="url(#paper-soak)">
          {/* Paper soak halo */}
          <path
            d="M32 18 C42 16, 52 24, 50 36 C48 48, 36 52, 24 48 C14 44, 12 32, 18 22 C22 16, 26 19, 32 18 Z"
            fill="url(#soak-halo)"
            transform="scale(1.15) translate(-3, -3)"
          />
          {/* Liquid blood drop */}
          <path
            d="M32 18 C42 16, 52 24, 50 36 C48 48, 36 52, 24 48 C14 44, 12 32, 18 22 C22 16, 26 19, 32 18 Z"
            fill="url(#blood-paper-drop)"
          />
          {/* Wet sheen highlight */}
          <ellipse cx="26" cy="26" rx="2.5" ry="4" fill="#ffb4b4" opacity="0.6" transform="rotate(-25 26 26)" />
        </g>

        {/* Satellite micro drops from paper impact */}
        <circle cx="58" cy="18" r="2.8" fill="url(#blood-paper-drop)" filter="url(#paper-soak)" />
        <circle cx="64" cy="28" r="1.8" fill="url(#blood-paper-drop)" />
        <circle cx="14" cy="56" r="2.2" fill="url(#blood-paper-drop)" />
        <circle cx="54" cy="46" r="3.2" fill="url(#blood-paper-drop)" filter="url(#paper-soak)" />
        <circle cx="68" cy="56" r="1.6" fill="url(#blood-paper-drop)" />

        {/* Drop 2: Secondary paper drop */}
        <g filter="url(#paper-soak)">
          <path
            d="M85 42 C94 40, 102 48, 100 58 C98 68, 88 72, 78 68 C70 64, 68 54, 72 46 C76 40, 80 43, 85 42 Z"
            fill="url(#blood-paper-drop)"
          />
          <ellipse cx="79" cy="50" rx="2" ry="3" fill="#ffb4b4" opacity="0.6" transform="rotate(-20 79 50)" />
        </g>
        <circle cx="108" cy="44" r="2" fill="url(#blood-paper-drop)" />
        <circle cx="114" cy="58" r="1.5" fill="url(#blood-paper-drop)" />
        <circle cx="82" cy="78" r="2.5" fill="url(#blood-paper-drop)" filter="url(#paper-soak)" />
        <circle cx="96" cy="86" r="1.8" fill="url(#blood-paper-drop)" />
      </svg>

      {/* --- Top-Right: Blood Drops Soaked on Paper --- */}
      <svg
        className="absolute top-6 right-6 w-52 h-52"
        viewBox="0 0 180 180"
        xmlns="http://www.w3.org/2000/svg"
      >
        <g filter="url(#paper-soak)">
          <path
            d="M142 22 C152 20, 160 28, 158 38 C156 48, 146 54, 136 50 C126 46, 124 34, 130 26 C134 20, 138 23, 142 22 Z"
            fill="url(#blood-paper-drop)"
          />
          <ellipse cx="137" cy="30" rx="2" ry="3.5" fill="#ffb4b4" opacity="0.6" transform="rotate(-25 137 30)" />
        </g>
        <circle cx="122" cy="18" r="2.4" fill="url(#blood-paper-drop)" />
        <circle cx="168" cy="26" r="1.8" fill="url(#blood-paper-drop)" />
        <circle cx="164" cy="44" r="2.8" fill="url(#blood-paper-drop)" filter="url(#paper-soak)" />
        <circle cx="126" cy="56" r="3.2" fill="url(#blood-paper-drop)" filter="url(#paper-soak)" />
        <ellipse cx="124.5" cy="54" rx="0.8" ry="1.4" fill="#ffb4b4" opacity="0.6" />
        <circle cx="112" cy="48" r="1.5" fill="url(#blood-paper-drop)" />
        <circle cx="144" cy="68" r="2" fill="url(#blood-paper-drop)" />
        <circle cx="132" cy="82" r="1.6" fill="url(#blood-paper-drop)" />
      </svg>

      {/* --- Bottom-Left: Blood Drops Impacting Paper --- */}
      <svg
        className="absolute bottom-6 left-6 w-52 h-52"
        viewBox="0 0 180 180"
        xmlns="http://www.w3.org/2000/svg"
      >
        <g filter="url(#paper-soak)">
          <path
            d="M36 132 C46 130, 54 138, 52 148 C50 158, 40 162, 30 158 C20 154, 18 142, 24 134 C28 128, 32 133, 36 132 Z"
            fill="url(#blood-paper-drop)"
          />
          <ellipse cx="30" cy="140" rx="2.2" ry="3.5" fill="#ffb4b4" opacity="0.65" transform="rotate(-20 30 140)" />
        </g>
        <circle cx="58" cy="128" r="2.6" fill="url(#blood-paper-drop)" />
        <circle cx="20" cy="120" r="1.8" fill="url(#blood-paper-drop)" />
        <circle cx="62" cy="144" r="3" fill="url(#blood-paper-drop)" filter="url(#paper-soak)" />
        <circle cx="48" cy="164" r="2" fill="url(#blood-paper-drop)" />
        <circle cx="76" cy="132" r="1.6" fill="url(#blood-paper-drop)" />
        <circle cx="84" cy="148" r="2.2" fill="url(#blood-paper-drop)" />
      </svg>

      {/* --- Bottom-Right: Paper Blood Drops --- */}
      <svg
        className="absolute bottom-6 right-6 w-52 h-52"
        viewBox="0 0 180 180"
        xmlns="http://www.w3.org/2000/svg"
      >
        <g filter="url(#paper-soak)">
          <path
            d="M144 134 C154 132, 162 140, 160 150 C158 160, 148 164, 138 160 C128 156, 126 144, 132 136 C136 130, 140 135, 144 134 Z"
            fill="url(#blood-paper-drop)"
          />
          <ellipse cx="138" cy="142" rx="2.2" ry="3.5" fill="#ffb4b4" opacity="0.6" transform="rotate(-20 138 142)" />
        </g>
        <circle cx="122" cy="130" r="2.5" fill="url(#blood-paper-drop)" />
        <circle cx="166" cy="126" r="1.8" fill="url(#blood-paper-drop)" />
        <circle cx="118" cy="148" r="3.2" fill="url(#blood-paper-drop)" filter="url(#paper-soak)" />
        <circle cx="134" cy="166" r="2" fill="url(#blood-paper-drop)" />
        <circle cx="106" cy="138" r="1.5" fill="url(#blood-paper-drop)" />
        <circle cx="98" cy="154" r="2.1" fill="url(#blood-paper-drop)" />
      </svg>
    </div>
  );
}
