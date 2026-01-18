import type { Metadata } from 'next';
import { Inter, Space_Grotesk } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/lib/auth-context';
import { ThemeProvider } from '@/lib/theme-provider';
import TopNavigation from '@/components/TopNavigation';
import UnauthorizedUser from '@/components/UnauthorizedUser';
import { getServerAuth } from '@/lib/auth-server';
import { createSupabaseServerClient } from '@/lib/auth-helpers';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-space-grotesk',
  display: 'swap',
});

// Force dynamic rendering to prevent layout caching
// This ensures auth state is always fresh after OAuth callbacks
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata: Metadata = {
  title: 'PokerBros - Track buy-ins, results, and seats for your regular house poker game',
  description: 'Manage your home poker games with real-time tracking and player statistics',
  icons: {
    icon: '/favicon.svg',
    apple: '/favicon.svg',
  },
  metadataBase: new URL('https://pokerbros.vercel.app'),
  openGraph: {
    title: 'PokerBros - Track buy-ins, results, and seats for your regular house poker game',
    description: 'Manage your home poker games with real-time tracking and player statistics',
    siteName: 'PokerBros',
    locale: 'en_US',
    type: 'website',
    images: [
      {
        url: '/ogimage.png',
        width: 1200,
        height: 630,
        alt: 'PokerBros - Track buy-ins, results, and seats for your regular house poker game',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'PokerBros - Track buy-ins, results, and seats for your regular house poker game',
    description: 'Manage your home poker games with real-time tracking and player statistics',
    images: ['/ogimage.png'],
  },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Fetch auth state on the server - no client-side delay!
  const auth = await getServerAuth();

  // Fetch player avatar if user is logged in
  let playerAvatar = 'avatar1.svg';
  let playerName = '';
  if (auth.user) {
    const supabase = await createSupabaseServerClient();

    const { data: playerData } = await supabase
      .from('players')
      .select('avatar, first_name, last_name')
      .eq('email', auth.user.email)
      .single();

    if (playerData) {
      playerAvatar = playerData.avatar || 'avatar1.svg';
      playerName = `${playerData.first_name} ${playerData.last_name.charAt(0)}.`;
    }
  }

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  const theme = localStorage.getItem('theme') || 'system';
                  const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
                  if (isDark) {
                    document.documentElement.classList.add('dark');
                  } else {
                    document.documentElement.classList.remove('dark');
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body className={`${inter.variable} ${spaceGrotesk.variable} font-sans antialiased min-h-screen overflow-x-hidden relative`}>
        {/* Background Layers */}
        <div className="bg-felt"></div>
        <div className="felt-grain"></div>
        <div className="bg-suits"></div>

        {/* Lighting Effects */}
        <div className="fixed top-0 left-1/2 w-[800px] h-[500px] bg-poker-feltLight/20 rounded-full blur-[120px] -translate-x-1/2 -translate-y-1/2 pointer-events-none"></div>

        <ThemeProvider>
          <AuthProvider>
            {/* Show unauthorized message if user is logged in but not a player or admin */}
            {auth.isUnauthorized ? (
              <UnauthorizedUser />
            ) : (
              <div className="flex flex-col min-h-screen">
                {/* Top Navigation */}
                <TopNavigation
                  user={auth.user}
                  role={auth.role}
                  playerAvatar={playerAvatar}
                  playerName={playerName}
                />

                {/* Main Content Area */}
                <main className="flex-1 relative z-10">
                  {children}
                </main>

                {/* Footer */}
                <footer className="relative z-10 border-t border-white/5 mt-20 pointer-events-none">
                  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    <p className="text-center text-gray-400 text-sm pointer-events-auto">
                      PokerBros &copy; {new Date().getFullYear()}
                    </p>
                  </div>
                </footer>
              </div>
            )}
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
