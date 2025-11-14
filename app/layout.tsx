import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/lib/auth-context';
import { ThemeProvider } from '@/lib/theme-provider';
import Navigation from '@/components/Navigation';
import { getServerAuth } from '@/lib/auth-server';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'PokerBros - Never Miss a Full Table',
  description: 'Manage your home poker games with real-time tracking and player statistics',
  icons: {
    icon: '/favicon.svg',
    apple: '/favicon.svg',
  },
  metadataBase: new URL('https://pokerbros.vercel.app'),
  openGraph: {
    title: 'PokerBros - Never Miss a Full Table',
    description: 'Manage your home poker games with real-time tracking and player statistics',
    siteName: 'PokerBros',
    locale: 'en_US',
    type: 'website',
    images: [
      {
        url: '/ogimage.png',
        width: 1200,
        height: 630,
        alt: 'PokerBros - Never Miss a Full Table',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'PokerBros - Never Miss a Full Table',
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
      <body className={`${inter.className} bg-background-light dark:bg-background-dark transition-colors duration-300`}>
        <ThemeProvider>
          <AuthProvider>
            {/* Pass server auth state directly to Navigation - no flash! */}
            <Navigation
              isAdmin={auth.isAdmin}
              user={auth.user}
            />
            <main className="min-h-screen">
              {children}
            </main>
            <footer className="bg-gray-100 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 mt-20 transition-colors duration-300">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <p className="text-center text-gray-600 dark:text-gray-400 text-sm">
                  PokerBros &copy; {new Date().getFullYear()} - Never Miss a Full Table
                </p>
              </div>
            </footer>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
