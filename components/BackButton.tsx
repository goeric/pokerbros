'use client';

import { useRouter } from 'next/navigation';
import { CaretLeft } from '@phosphor-icons/react';

interface BackButtonProps {
  href?: string;
  label?: string;
  onClick?: () => void;
  className?: string;
}

export default function BackButton({
  href = '/',
  label = 'Back to Dashboard',
  onClick,
  className = ''
}: BackButtonProps) {
  const router = useRouter();

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else {
      router.push(href);
    }
  };

  return (
    <button
      onClick={handleClick}
      className={`group inline-flex items-center gap-2 px-4 py-2 mb-6 glass-panel rounded-xl border border-white/10 hover:border-poker-gold/30 text-gray-300 hover:text-white transition-all hover:scale-105 ${className}`}
    >
      <CaretLeft
        weight="bold"
        size={20}
        className="text-poker-gold group-hover:translate-x-[-4px] transition-transform"
      />
      <span className="font-medium text-sm">{label}</span>
    </button>
  );
}
