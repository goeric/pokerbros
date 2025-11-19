import React from 'react';

interface PokerBrosLogoProps {
  size?: number;
  className?: string;
  variant?: 'primary' | 'simplified';
}

export default function PokerBrosLogo({
  size = 64,
  className = '',
  variant = 'primary'
}: PokerBrosLogoProps) {
  if (variant === 'simplified') {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
      >
        <defs>
          <linearGradient id="chipBodyMobile" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#D92828"/>
            <stop offset="1" stopColor="#500000"/>
          </linearGradient>
          <linearGradient id="goldFoilMobile" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#F3E5AB"/>
            <stop offset="1" stopColor="#D4AF37"/>
          </linearGradient>
        </defs>
        <circle cx="50" cy="50" r="48" fill="url(#chipBodyMobile)"/>
        <circle cx="50" cy="50" r="43" stroke="white" strokeWidth="10" strokeDasharray="12 24" opacity="0.9"/>
        <circle cx="50" cy="50" r="28" fill="#111111" stroke="url(#goldFoilMobile)" strokeWidth="1"/>
        <path d="M50 36C53 32 59 32 62 36C66 40 62 52 50 58C38 52 34 40 38 36C41 32 47 32 50 36Z" fill="url(#goldFoilMobile)"/>
      </svg>
    );
  }

  // Primary detailed version
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <linearGradient id="chipBody" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#D92828"/>
          <stop offset="0.5" stopColor="#8B0000"/>
          <stop offset="1" stopColor="#500000"/>
        </linearGradient>
        <linearGradient id="goldFoil" x1="20" y1="20" x2="80" y2="80" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#F3E5AB"/>
          <stop offset="0.3" stopColor="#D4AF37"/>
          <stop offset="0.6" stopColor="#8B7325"/>
          <stop offset="1" stopColor="#F3E5AB"/>
        </linearGradient>
      </defs>
      <g>
        {/* Main Chip */}
        <circle cx="50" cy="50" r="48" fill="url(#chipBody)"/>
        <circle cx="50" cy="50" r="47" stroke="url(#goldFoil)" strokeWidth="1" opacity="0.6"/>

        {/* Casino Edge Spots */}
        <circle cx="50" cy="50" r="43" stroke="white" strokeWidth="10" strokeDasharray="12 24" opacity="0.9"/>

        {/* Inner Ring */}
        <circle cx="50" cy="50" r="34" stroke="url(#goldFoil)" strokeWidth="1.5" strokeDasharray="1 1"/>

        {/* Inlay */}
        <circle cx="50" cy="50" r="28" fill="#111111" stroke="url(#goldFoil)" strokeWidth="0.5"/>

        {/* Spade */}
        <g transform="translate(50 48) scale(0.8)">
          <path d="M0 -12C3 -16 9 -16 12 -12C16 -8 12 4 0 10C-12 4 -16 -8 -12 -12C-9 -16 -3 -16 0 -12Z" fill="url(#goldFoil)"/>
          <path d="M0 10V18" stroke="url(#goldFoil)" strokeWidth="3" strokeLinecap="round"/>
          <path d="M-5 18H5" stroke="url(#goldFoil)" strokeWidth="2" strokeLinecap="round"/>
        </g>

        {/* Reflection */}
        <ellipse cx="50" cy="25" rx="20" ry="10" fill="white" opacity="0.1"/>
      </g>
    </svg>
  );
}

// Full logo with wordmark
export function PokerBrosFullLogo({
  logoSize = 64,
  textSize = 'text-3xl',
  className = ''
}: {
  logoSize?: number;
  textSize?: string;
  className?: string;
}) {
  return (
    <div className={`flex items-center gap-4 ${className}`}>
      <PokerBrosLogo size={logoSize} variant="primary" />
      <span className={`${textSize} font-bold tracking-wider text-white font-display`}>
        POKER<span className="text-poker-gold">BROS</span>
      </span>
    </div>
  );
}
