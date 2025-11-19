export default function CasinoChipLogo({ className = '' }: { className?: string }) {
  return (
    <svg
      width="40"
      height="40"
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`animate-gold-pulse shadow-xl ${className}`}
    >
      {/* Chip Base */}
      <circle cx="24" cy="24" r="22" fill="url(#chipGradient)" stroke="#F3E5AB" strokeWidth="1.5" />
      <circle cx="24" cy="24" r="18" stroke="#8B7325" strokeWidth="1" strokeDasharray="3 3" />

      {/* Inner Recess */}
      <circle cx="24" cy="24" r="14" fill="#111111" />

      {/* Spade Icon */}
      <path
        d="M24 13C26.5 10 30 10 32.5 13C35 16 31 22 24 26C17 22 13 16 15.5 13C18 10 21.5 10 24 13Z"
        fill="#D4AF37"
      />
      <path d="M24 26V32" stroke="#D4AF37" strokeWidth="2" strokeLinecap="round" />
      <rect x="20" y="32" width="8" height="1.5" fill="#D4AF37" />

      <defs>
        <linearGradient id="chipGradient" x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
          <stop stopColor="#D92828" />
          <stop offset="0.5" stopColor="#991B1B" />
          <stop offset="1" stopColor="#7F1D1D" />
        </linearGradient>
      </defs>
    </svg>
  );
}
