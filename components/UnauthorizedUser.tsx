'use client';

import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function UnauthorizedUser() {
  const router = useRouter();

  const handleSignOut = async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    router.push('/');
    router.refresh();
  };

  return (
    <div className="fixed inset-0 bg-gray-900 dark:bg-gray-950 flex items-center justify-center p-4 z-50">
      <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8 text-center">
        <div className="mb-6">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-red-600 dark:text-red-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Unauthorized Access
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Your account is not registered for poker night.
          </p>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Please email the admin if you'd like to be added to the player list.
          </p>
        </div>

        <button
          onClick={handleSignOut}
          className="w-full bg-poker-green hover:bg-green-700 text-white font-medium py-3 px-4 rounded-lg transition-colors"
        >
          Sign Out
        </button>

        <p className="mt-4 text-sm text-gray-500 dark:text-gray-500">
          Sign out to view the public site
        </p>
      </div>
    </div>
  );
}
