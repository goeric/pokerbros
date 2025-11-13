import React from 'react';

interface ChipIconProps {
  className?: string;
}

export default function ChipIcon({ className = 'w-5 h-5' }: ChipIconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
    >
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" fill="none" />
      <circle cx="12" cy="12" r="7" fill="currentColor" opacity="0.3" />
      <circle cx="12" cy="12" r="4" fill="currentColor" />
      <path d="M12 2 L12 5 M12 19 L12 22 M2 12 L5 12 M19 12 L22 12" stroke="currentColor" strokeWidth="1.5" />
      <path d="M4.5 4.5 L7 7 M17 17 L19.5 19.5 M19.5 4.5 L17 7 M7 17 L4.5 19.5" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}
