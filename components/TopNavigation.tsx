'use client';

import { User } from '@supabase/supabase-js';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, usePathname } from 'next/navigation';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { UserRole } from '@/lib/auth-server';
import PokerBrosLogo from './PokerBrosLogo';
import { Spade, GearSix, Crown, List, X } from '@phosphor-icons/react';

interface TopNavigationProps {
  isAdmin: boolean;
  user: User | null;
  role: UserRole | null;
  playerAvatar?: string;
  playerName?: string;
}

export default function TopNavigation({ isAdmin, user, role, playerAvatar = 'avatar1.svg', playerName = '' }: TopNavigationProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleSignOut = async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    router.push('/');
    router.refresh();
  };

  const toggleMobileMenu = () => setMobileMenuOpen(!mobileMenuOpen);

  const navItems = [
    { href: '/', label: 'The Floor', icon: Spade },
    { href: '/stats', label: 'High Rollers', icon: Crown },
    { href: '/admin', label: 'Admin', icon: GearSix, adminOnly: true },
  ];

  return (
    <>
      {/* Top Navigation Bar */}
      <nav className="sticky top-0 z-50 w-full glass-panel border-b border-poker-gold/10 backdrop-blur-xl bg-black/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              <PokerBrosLogo size={40} variant="primary" className="animate-gold-pulse" />
              <span className="font-display font-bold text-xl tracking-wider text-white">
                POKER<span className="text-poker-gold">BROS</span>
              </span>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-6">
              {navItems.map((item) => {
                if (item.adminOnly && !role) return null;

                const isActive = pathname === item.href;
                const Icon = item.icon;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all ${
                      isActive
                        ? 'text-poker-gold bg-poker-gold/10'
                        : 'text-gray-300 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <Icon weight={isActive ? 'fill' : 'regular'} size={18} />
                    <span className="font-medium text-sm">{item.label}</span>
                  </Link>
                );
              })}

              {/* User Section - Desktop */}
              {user ? (
                <div className="flex items-center gap-3 ml-4 pl-4 border-l border-white/10">
                  <Link href="/profile" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                    <div className="relative">
                      <Image
                        src={`/avatars/${playerAvatar}`}
                        alt="Avatar"
                        width={32}
                        height={32}
                        unoptimized
                        className="w-8 h-8 rounded-full border-2 border-poker-gold bg-black"
                      />
                      <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-black"></div>
                    </div>
                    <div className="hidden lg:block">
                      <p className="text-xs font-bold text-white">{playerName || user.email}</p>
                      <p className="text-xs text-poker-gold">
                        {role === 'admin' ? 'Admin' : role === 'superadmin' ? 'Superadmin' : 'Player'}
                      </p>
                    </div>
                  </Link>
                  <button
                    onClick={handleSignOut}
                    className="text-xs text-gray-400 hover:text-white transition-colors"
                  >
                    Sign Out
                  </button>
                </div>
              ) : (
                <Link
                  href="/login"
                  className="ml-4 px-4 py-2 bg-gradient-to-b from-poker-gold to-yellow-600 text-black font-bold text-sm rounded-lg hover:from-poker-goldlight hover:to-poker-gold transition-all border border-yellow-300"
                >
                  Login
                </Link>
              )}
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={toggleMobileMenu}
              className="md:hidden text-gray-400 hover:text-white transition-colors"
            >
              {mobileMenuOpen ? <X size={24} /> : <List size={24} />}
            </button>
          </div>
        </div>

        {/* Mobile Menu Dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-white/5 bg-black/95 backdrop-blur-xl">
            <div className="px-4 py-4 space-y-2">
              {navItems.map((item) => {
                if (item.adminOnly && !role) return null;

                const isActive = pathname === item.href;
                const Icon = item.icon;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                      isActive
                        ? 'bg-poker-gold/10 text-white border border-poker-gold/20'
                        : 'text-gray-400 hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    <Icon weight={isActive ? 'fill' : 'regular'} size={20} />
                    <span className="font-medium">{item.label}</span>
                  </Link>
                );
              })}

              {/* User Section - Mobile */}
              <div className="pt-4 mt-4 border-t border-white/10">
                {user ? (
                  <div className="space-y-3">
                    <Link
                      href="/profile"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-black/40 to-transparent border border-white/5 hover:bg-white/5 transition-colors"
                    >
                      <div className="relative">
                        <Image
                          src={`/avatars/${playerAvatar}`}
                          alt="Avatar"
                          width={40}
                          height={40}
                          unoptimized
                          className="w-10 h-10 rounded-full border-2 border-poker-gold bg-black"
                        />
                        <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-black"></div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-white font-display truncate">{playerName || user.email}</p>
                        <p className="text-xs text-poker-gold">
                          {role === 'admin' ? 'Admin' : role === 'superadmin' ? 'Superadmin' : 'Player'}
                        </p>
                      </div>
                    </Link>
                    <button
                      onClick={handleSignOut}
                      className="w-full py-2 px-4 text-sm text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                    >
                      Sign Out
                    </button>
                  </div>
                ) : (
                  <Link
                    href="/login"
                    className="block w-full py-3 px-4 text-center bg-gradient-to-b from-poker-gold to-yellow-600 text-black font-bold rounded-lg hover:from-poker-goldlight hover:to-poker-gold transition-all border border-yellow-300"
                  >
                    Login
                  </Link>
                )}
              </div>
            </div>
          </div>
        )}
      </nav>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div
          onClick={toggleMobileMenu}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
        />
      )}
    </>
  );
}
