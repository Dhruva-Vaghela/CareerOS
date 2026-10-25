import React, { useEffect, useState } from 'react';

export const OnboardingOrbitalBackground: React.FC = () => {
  const [mouseOffset, setMouseOffset] = useState({ x: 0, y: 0 });

  useEffect(() => {
    // Only apply gentle parallax on desktop if reduced motion is not preferred
    if (typeof window === 'undefined') return;
    const isMobile = window.innerWidth < 1024;
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (isMobile || prefersReducedMotion) return;

    const handleMouseMove = (e: MouseEvent) => {
      const x = (e.clientX / window.innerWidth - 0.5) * 12; // subtle max ±6px
      const y = (e.clientY / window.innerHeight - 0.5) * 12; // subtle max ±6px
      setMouseOffset({ x, y });
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <div className="onboarding-bg-layer" aria-hidden="true">
      {/* Subtle Ambient Lavender & Blue Glow Radiance */}
      <div className="onboarding-ambient-glow glow-top-right" />
      <div className="onboarding-ambient-glow glow-bottom-left" />

      {/* Parallax Floating Container */}
      <div
        className="onboarding-3d-stage"
        style={{
          transform: `translate3d(${mouseOffset.x}px, ${mouseOffset.y}px, 0)`,
        }}
      >
        {/* Orbital Curves SVG */}
        <svg
          className="onboarding-orbit-svg"
          viewBox="0 0 1200 900"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="orb-track-grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#818cf8" stopOpacity="0.45" />
              <stop offset="50%" stopColor="#c084fc" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#60a5fa" stopOpacity="0.4" />
            </linearGradient>
            <linearGradient id="orb-track-faint" x1="100%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#a855f7" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.15" />
            </linearGradient>
          </defs>

          {/* Primary Large Orbital Ellipse */}
          <ellipse
            cx="750"
            cy="380"
            rx="460"
            ry="230"
            transform="rotate(-18 750 380)"
            stroke="url(#orb-track-grad)"
            strokeWidth="1.2"
            strokeDasharray="6 5"
          />

          {/* Counter Fine Orbital Ellipse */}
          <ellipse
            cx="480"
            cy="520"
            rx="380"
            ry="180"
            transform="rotate(22 480 520)"
            stroke="url(#orb-track-faint)"
            strokeWidth="1"
          />

          {/* Subtle Outer Horizon Arc */}
          <path
            d="M 120 780 Q 600 680, 1080 840"
            stroke="rgba(192, 132, 252, 0.2)"
            strokeWidth="1"
            strokeDasharray="4 6"
          />
        </svg>

        {/* Translucent 3D Glass Ring with Center 4-Point Compass Star */}
        <div className="onboarding-ring-wrapper">
          <div className="onboarding-glass-ring">
            <svg
              viewBox="0 0 260 260"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="onboarding-ring-svg"
            >
              <defs>
                <linearGradient id="ring-specular-grad" x1="20" y1="20" x2="240" y2="240" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#93c5fd" stopOpacity="0.85" />
                  <stop offset="45%" stopColor="#c084fc" stopOpacity="0.7" />
                  <stop offset="75%" stopColor="#818cf8" stopOpacity="0.9" />
                  <stop offset="100%" stopColor="#60a5fa" stopOpacity="0.75" />
                </linearGradient>
                <radialGradient id="ring-frosted-sheen" cx="130" cy="130" r="120" gradientUnits="userSpaceOnUse">
                  <stop offset="70%" stopColor="#ffffff" stopOpacity="0.4" />
                  <stop offset="90%" stopColor="#e0e7ff" stopOpacity="0.2" />
                  <stop offset="100%" stopColor="#c4b5fd" stopOpacity="0" />
                </radialGradient>
                <filter id="ring-glow-filter" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="3" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
              </defs>

              {/* Glass Torus Body */}
              <ellipse
                cx="130"
                cy="130"
                rx="102"
                ry="78"
                fill="url(#ring-frosted-sheen)"
                stroke="url(#ring-specular-grad)"
                strokeWidth="22"
                strokeLinecap="round"
                filter="url(#ring-glow-filter)"
              />

              {/* Inner Rim Bevel */}
              <ellipse
                cx="130"
                cy="130"
                rx="80"
                ry="58"
                fill="none"
                stroke="rgba(255, 255, 255, 0.75)"
                strokeWidth="2"
              />

              {/* Top Specular Arc */}
              <path
                d="M 52 98 A 102 78 0 0 1 208 98"
                fill="none"
                stroke="#ffffff"
                strokeWidth="2.5"
                strokeLinecap="round"
                opacity="0.9"
              />
            </svg>

            {/* Central 4-Point Compass Star */}
            <div className="onboarding-center-star">
              <svg
                viewBox="0 0 60 60"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="onboarding-star-svg"
              >
                <defs>
                  <linearGradient id="star-facet-a" x1="30" y1="8" x2="30" y2="30" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor="#c084fc" />
                    <stop offset="100%" stopColor="#7c3aed" />
                  </linearGradient>
                  <linearGradient id="star-facet-b" x1="52" y1="30" x2="30" y2="30" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor="#818cf8" />
                    <stop offset="100%" stopColor="#6366f1" />
                  </linearGradient>
                  <linearGradient id="star-facet-c" x1="30" y1="52" x2="30" y2="30" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor="#a855f7" />
                    <stop offset="100%" stopColor="#4f46e5" />
                  </linearGradient>
                  <linearGradient id="star-facet-d" x1="8" y1="30" x2="30" y2="30" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor="#a78bfa" />
                    <stop offset="100%" stopColor="#581c87" />
                  </linearGradient>
                </defs>

                <path d="M 30 6 C 31 22, 31 22, 54 30 C 31 31, 31 31, 30 54 C 29 31, 29 31, 6 30 C 29 29, 29 29, 30 6 Z" fill="url(#star-facet-b)" />
                <path d="M 30 6 L 30 30 L 54 30 Z" fill="url(#star-facet-a)" opacity="0.9" />
                <path d="M 54 30 L 30 30 L 30 54 Z" fill="url(#star-facet-c)" opacity="0.9" />
                <path d="M 30 54 L 30 30 L 6 30 Z" fill="url(#star-facet-d)" opacity="0.95" />
                <path d="M 6 30 L 30 30 L 30 6 Z" fill="url(#star-facet-a)" opacity="0.8" />

                <circle cx="30" cy="30" r="2.5" fill="#ffffff" />
                <circle cx="30" cy="30" r="5" fill="rgba(255, 255, 255, 0.45)" />
              </svg>
            </div>
          </div>
        </div>

        {/* 3 Small Floating Spheres with Soft Gradients */}
        {/* Sphere 1: Soft Violet / Electric Purple (Upper Right) */}
        <div className="onboarding-sphere onboarding-sphere-violet" />

        {/* Sphere 2: Soft Indigo / Pale Blue (Lower Left) */}
        <div className="onboarding-sphere onboarding-sphere-blue" />

        {/* Sphere 3: Soft Lavender Accent (Mid Left) */}
        <div className="onboarding-sphere onboarding-sphere-lavender" />
      </div>
    </div>
  );
};
