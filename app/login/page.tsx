'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { CaretLeft, Warning } from '@phosphor-icons/react';
import PokerBrosLogo from '@/components/PokerBrosLogo';

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { signInWithGoogle } = useAuth();

  const handleGoogleSignIn = async () => {
    setError(null);
    setLoading(true);

    const { error } = await signInWithGoogle();

    if (error) {
      setError(error.message);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center px-4 py-12">
      {/* Lighting Effect */}
      <div className="fixed top-1/2 left-1/2 w-[600px] h-[600px] bg-poker-gold/10 rounded-full blur-[120px] -translate-x-1/2 -translate-y-1/2 pointer-events-none"></div>

      <div className="w-full max-w-md relative z-10">
        <div className="glass-panel rounded-3xl p-10 border-2 border-poker-gold/20 shadow-[0_20px_60px_rgba(0,0,0,0.8)]">
          {/* Header */}
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center mb-6">
              <PokerBrosLogo size={80} variant="primary" className="animate-gold-pulse" />
            </div>
            <h1 className="font-display text-4xl font-bold text-white mb-3">
              Welcome to the Table
            </h1>
            <p className="text-gray-400 text-base">
              Sign in to manage your poker games and track your winnings
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-600/20 border-2 border-red-500/50 text-red-400 px-4 py-3 rounded-xl mb-6 text-sm flex items-start gap-3">
              <Warning weight="bold" size={20} className="flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Google Sign In Button */}
          <button
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-white hover:bg-gray-50 text-gray-900 font-bold rounded-xl border-2 border-gray-200 transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 shadow-lg mb-6"
          >
            <svg className="w-6 h-6" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            {loading ? 'Signing in...' : 'Continue with Google'}
          </button>

          {/* Info */}
          <div className="bg-black/40 rounded-xl p-4 border border-white/5">
            <p className="text-sm text-gray-400 text-center">
              Sign in with your authorized Google account to manage your games and profile.
            </p>
          </div>

          {/* Footer Link */}
          <div className="mt-8 text-center">
            <a
              href="/"
              className="text-sm text-gray-400 hover:text-poker-gold transition-colors inline-flex items-center gap-2 font-medium group"
            >
              <CaretLeft weight="bold" className="group-hover:-translate-x-1 transition-transform" size={16} />
              Back to home
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
