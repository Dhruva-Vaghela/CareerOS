import React from 'react';

interface CareerOSLogoProps {
  size?: number;
  variant?: 'light' | 'dark';
  showWordmark?: boolean;
  className?: string;
}

export const CareerOSLogo: React.FC<CareerOSLogoProps> = ({
  size = 36,
  variant = 'light',
  showWordmark = true,
  className = '',
}) => {
  const isDark = variant === 'dark';
  const textColor = isDark ? '#ffffff' : '#0f172a';

  return (
    <div
      className={`career-os-logo-wrap ${className}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: `${Math.max(8, size * 0.28)}px`,
        textDecoration: 'none',
        userSelect: 'none',
      }}
      aria-label="Career OS Home"
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ flexShrink: 0 }}
      >
        <defs>
          <linearGradient id="cos-orbit-grad" x1="4" y1="8" x2="36" y2="34" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#4f46e5" />
            <stop offset="55%" stopColor="#8b5cf6" />
            <stop offset="100%" stopColor="#ec4899" />
          </linearGradient>
          <linearGradient id="cos-star-grad" x1="12" y1="12" x2="28" y2="28" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#6366f1" />
            <stop offset="50%" stopColor="#7c3aed" />
            <stop offset="100%" stopColor="#4f46e5" />
          </linearGradient>
          <radialGradient id="cos-glow" cx="20" cy="20" r="14" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#a855f7" stopOpacity="0.4" />
            <stop offset="70%" stopColor="#6366f1" stopOpacity="0.1" />
            <stop offset="100%" stopColor="#4f46e5" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Ambient Glow */}
        <circle cx="20" cy="20" r="16" fill="url(#cos-glow)" />

        {/* Counter Orbit Path (faint) */}
        <ellipse
          cx="20"
          cy="20"
          rx="15"
          ry="6"
          transform="rotate(35 20 20)"
          fill="none"
          stroke="#818cf8"
          strokeWidth="1"
          strokeOpacity="0.45"
          strokeDasharray="4 3"
        />

        {/* Primary Celestial Orbit Ring */}
        <ellipse
          cx="20"
          cy="20"
          rx="15.5"
          ry="7"
          transform="rotate(-26 20 20)"
          fill="none"
          stroke="url(#cos-orbit-grad)"
          strokeWidth="2.5"
          strokeLinecap="round"
        />

        {/* Satellite Node on Orbital Ring */}
        <circle cx="31.5" cy="13.2" r="2.2" fill="#c084fc" />
        <circle cx="31.5" cy="13.2" r="1.1" fill="#ffffff" />

        {/* Secondary Satellite Node */}
        <circle cx="9.2" cy="25.5" r="1.5" fill="#818cf8" />

        {/* Central 4-Point Compass Star */}
        <path
          d="M 20 8.5 C 20.8 15.5, 20.8 15.5, 31.5 20 C 20.8 20.8, 20.8 20.8, 20 31.5 C 19.2 20.8, 19.2 20.8, 8.5 20 C 19.2 19.2, 19.2 19.2, 20 8.5 Z"
          fill="url(#cos-star-grad)"
        />

        {/* Inner Star Highlight Core */}
        <circle cx="20" cy="20" r="2.2" fill="#ffffff" />
      </svg>

      {showWordmark && (
        <span
          style={{
            fontSize: `${Math.round(size * 0.58)}px`,
            fontWeight: 800,
            letterSpacing: '-0.03em',
            lineHeight: 1,
            color: textColor,
            display: 'flex',
            alignItems: 'baseline',
            gap: '3px',
          }}
        >
          <span>Career</span>
          <span
            style={{
              background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 60%, #9333ea 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              fontWeight: 850,
            }}
          >
            OS
          </span>
        </span>
      )}
    </div>
  );
};
