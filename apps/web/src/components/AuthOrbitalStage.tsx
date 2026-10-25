import React from 'react';

interface AuthOrbitalStageProps {
  tilt: { x: number; y: number };
}

export const AuthOrbitalStage: React.FC<AuthOrbitalStageProps> = ({ tilt }) => {
  return (
    <div className="cos-orbital-stage-wrapper" aria-hidden="true">
      <div
        className="cos-orbital-stage"
        style={{
          transform: `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
        }}
      >
        {/* Glowing Concentric Pedestal */}
        <div className="cos-pedestal-glow" />
        <div className="cos-pedestal-rim-1" />
        <div className="cos-pedestal-rim-2" />

        {/* Orbit Dash Ring */}
        <div className="cos-orbit-track" />

        {/* Translucent 3D Glass Ring (Torus) */}
        <div className="cos-glass-ring-container">
          <svg
            viewBox="0 0 300 300"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="cos-glass-ring-svg"
          >
            <defs>
              {/* Glass Ring Outer Stroke Gradient */}
              <linearGradient id="cos-glass-stroke" x1="20" y1="30" x2="280" y2="270" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#93c5fd" stopOpacity="0.85" />
                <stop offset="40%" stopColor="#c084fc" stopOpacity="0.75" />
                <stop offset="70%" stopColor="#818cf8" stopOpacity="0.95" />
                <stop offset="100%" stopColor="#60a5fa" stopOpacity="0.8" />
              </linearGradient>

              {/* Glass Inner Frosted Sheen */}
              <radialGradient id="cos-glass-sheen" cx="150" cy="150" r="140" gradientUnits="userSpaceOnUse">
                <stop offset="70%" stopColor="#ffffff" stopOpacity="0.35" />
                <stop offset="90%" stopColor="#e0e7ff" stopOpacity="0.15" />
                <stop offset="100%" stopColor="#c4b5fd" stopOpacity="0" />
              </radialGradient>

              {/* Specular Edge Glow Filter */}
              <filter id="cos-specular-glow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>

            {/* Outer Glass Torus Body */}
            <ellipse
              cx="150"
              cy="150"
              rx="118"
              ry="92"
              fill="url(#cos-glass-sheen)"
              stroke="url(#cos-glass-stroke)"
              strokeWidth="28"
              strokeLinecap="round"
              filter="url(#cos-specular-glow)"
            />

            {/* Inner Bevel Specular Rim */}
            <ellipse
              cx="150"
              cy="150"
              rx="92"
              ry="68"
              fill="none"
              stroke="rgba(255, 255, 255, 0.75)"
              strokeWidth="2.5"
            />

            {/* Outer Edge Specular Arc */}
            <path
              d="M 60 110 A 118 92 0 0 1 240 110"
              fill="none"
              stroke="#ffffff"
              strokeWidth="3"
              strokeLinecap="round"
              opacity="0.9"
            />
          </svg>
        </div>

        {/* Central 4-Point Compass Star */}
        <div className="cos-central-star">
          <svg
            viewBox="0 0 100 100"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="cos-star-svg"
          >
            <defs>
              {/* Facet Gradients for 3D Diamond Look */}
              <linearGradient id="cos-star-facet-top" x1="50" y1="12" x2="50" y2="50" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#c084fc" />
                <stop offset="100%" stopColor="#7c3aed" />
              </linearGradient>
              <linearGradient id="cos-star-facet-right" x1="88" y1="50" x2="50" y2="50" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#818cf8" />
                <stop offset="100%" stopColor="#6366f1" />
              </linearGradient>
              <linearGradient id="cos-star-facet-bottom" x1="50" y1="88" x2="50" y2="50" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#a855f7" />
                <stop offset="100%" stopColor="#4f46e5" />
              </linearGradient>
              <linearGradient id="cos-star-facet-left" x1="12" y1="50" x2="50" y2="50" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#a78bfa" />
                <stop offset="100%" stopColor="#581c87" />
              </linearGradient>
            </defs>

            {/* 4 Faceted Quadrants */}
            <path d="M 50 10 C 50.8 32, 50.8 32, 50 50 C 49.2 32, 49.2 32, 50 10 Z" fill="url(#cos-star-facet-top)" />
            <path
              d="M 50 10 C 52 38, 52 38, 90 50 C 52 52, 52 52, 50 90 C 48 52, 48 52, 10 50 C 48 48, 48 48, 50 10 Z"
              fill="url(#cos-star-facet-right)"
            />
            <path
              d="M 50 10 L 50 50 L 90 50 Z"
              fill="url(#cos-star-facet-top)"
              opacity="0.85"
            />
            <path
              d="M 90 50 L 50 50 L 50 90 Z"
              fill="url(#cos-star-facet-bottom)"
              opacity="0.9"
            />
            <path
              d="M 50 90 L 50 50 L 10 50 Z"
              fill="url(#cos-star-facet-left)"
              opacity="0.95"
            />
            <path
              d="M 10 50 L 50 50 L 50 10 Z"
              fill="url(#cos-star-facet-top)"
              opacity="0.75"
            />

            {/* Central Specular Glow Core */}
            <circle cx="50" cy="50" r="4" fill="#ffffff" />
            <circle cx="50" cy="50" r="8" fill="rgba(255, 255, 255, 0.45)" />
          </svg>
        </div>

        {/* Softly Glowing Orbital Spheres */}
        <div className="cos-sphere cos-sphere-1" />
        <div className="cos-sphere cos-sphere-2" />
        <div className="cos-sphere cos-sphere-3" />
        <div className="cos-sphere cos-sphere-4" />
      </div>
    </div>
  );
};
