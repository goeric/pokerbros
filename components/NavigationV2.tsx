'use client';

import { User } from '@supabase/supabase-js';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { UserRole } from '@/lib/auth-server';
import CasinoChipLogo from './CasinoChipLogo';
import { Spade, Users, Crown, ClockCounterClockwise, List, X } from '@phosphor-icons/react';

interface NavigationProps {
  isAdmin: boolean;
  user: User | null;
  role: UserRole | null;
}

export default function NavigationV2({ isAdmin, user, role }: NavigationProps) {
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
    { href: '/admin', label: 'Grinders', icon: Users, adminOnly: true },
  ];

  return (
    <>
      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between p-6 glass-panel z-50 sticky top-0 border-b border-poker-gold/20 backdrop-blur-xl bg-black/30">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-poker-gold to-yellow-700 flex items-center justify-center border border-yellow-200">
            <Spade weight="fill" className="text-black text-lg" />
          </div>
          <span className="font-display font-bold text-xl tracking-tight text-white">
            POKER<span className="text-poker-gold">BROS</span>
          </span>
        </div>
        <button onClick={toggleMobileMenu} className="text-gray-400 hover:text-white transition-colors">
          <List size={24} />
        </button>
      </div>

      {/* Mobile Overlay */}
      {mobileMenuOpen && (
        <div onClick={toggleMobileMenu} className="fixed inset-0 bg-black/80 backdrop-blur-sm z-40 md:hidden" />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 glass-panel h-full transition-transform duration-300 transform ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        } md:translate-x-0 md:relative md:flex md:flex-col border-r border-poker-gold/10 bg-[#020906] md:bg-transparent`}
      >
        {/* Close button for mobile */}
        <div className="md:hidden absolute top-4 right-4">
          <button onClick={toggleMobileMenu} className="text-gray-400 hover:text-white">
            <X size={24} />
          </button>
        </div>

        {/* Logo */}
        <div className="p-8 flex items-center gap-3">
          <CasinoChipLogo />
          <span className="font-display font-bold text-2xl tracking-wider text-white">
            POKER<span className="text-poker-gold">BROS</span>
          </span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 space-y-2 mt-4">
          {navItems.map((item) => {
            if (item.adminOnly && !role) return null;

            const isActive = pathname === item.href;
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all group ${
                  isActive
                    ? 'bg-poker-gold/10 text-white border border-poker-gold/20 shadow-[0_0_15px_rgba(212,175,55,0.1)]'
                    : 'text-gray-400 hover:bg-white/5 hover:text-white'
                }`}
              >
                <Icon weight={isActive ? 'fill' : 'regular'} className={`${isActive ? 'text-poker-gold' : 'group-hover:text-poker-gold'} transition-colors`} size={20} />
                <span className="font-medium">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* User Section */}
        <div className="p-6 border-t border-white/5">
          {user ? (
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-black/40 to-transparent border border-white/5">
                <div className="relative">
                  <div className="w-10 h-10 rounded-full bg-poker-feltLight border-2 border-poker-gold flex items-center justify-center">
                    <span className="text-poker-gold font-bold">
                      {user.email?.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-black"></div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-white font-display truncate">{user.email}</p>
                  <p className="text-xs text-poker-gold">{role === 'admin' ? 'Admin' : role === 'superadmin' ? 'Superadmin' : 'Player'}</p>
                </div>
              </div>
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
              Admin Login
            </Link>
          )}
        </div>
      </aside>
    </>
  );
}
