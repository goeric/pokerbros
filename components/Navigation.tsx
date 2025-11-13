'use client';

import { useAuth } from '@/lib/auth-context';
import Link from 'next/link';
import ThemeToggle from './ThemeToggle';

export default function Navigation() {
  const { isAdmin, signOut } = useAuth();

  return (
    <nav className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 sticky top-0 z-40 backdrop-blur-sm bg-opacity-95 dark:bg-opacity-95 transition-all duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center">
              <img src="/logo.svg" alt="PokerBros" className="h-10 w-auto" />
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/stats"
              className="text-gray-700 dark:text-gray-300 hover:text-poker-green dark:hover:text-white px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors font-medium"
            >
              Statistics
            </Link>
            {isAdmin && (
              <>
                <Link
                  href="/admin"
                  className="text-amber-700 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-300 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors font-medium"
                >
                  Admin
                </Link>
                <button
                  onClick={() => signOut()}
                  className="text-gray-700 dark:text-gray-300 hover:text-poker-green dark:hover:text-white px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors font-medium"
                >
                  Sign Out
                </button>
              </>
            )}
            {!isAdmin && (
              <Link
                href="/login"
                className="text-gray-700 dark:text-gray-300 hover:text-poker-green dark:hover:text-white px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors font-medium"
              >
                Admin Login
              </Link>
            )}
            <ThemeToggle />
          </div>
        </div>
      </div>
    </nav>
  );
}
