import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { logger } from '@/lib/logger';

export async function proxy(req: NextRequest) {
  // Only protect admin routes
  if (!req.nextUrl.pathname.startsWith('/admin')) {
    return NextResponse.next();
  }

  logger.info('[Proxy] Checking admin route', { pathname: req.nextUrl.pathname });

  const response = NextResponse.next({
    request: {
      headers: req.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return req.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          response.cookies.set({
            name,
            value,
            ...options,
          });
        },
        remove(name: string, options: CookieOptions) {
          response.cookies.set({
            name,
            value: '',
            ...options,
          });
        },
      },
    }
  );

  try {
    // Get the current user (validates session)
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    logger.debug('[Proxy] User check', {
      hasUser: !!user,
      userError: userError?.message,
      userId: user?.id,
      cookies: req.cookies.getAll().map(c => c.name).join(', ') || 'none',
    });

    // No user - redirect to login
    if (!user) {
      logger.info('[Proxy] No user found, redirecting to login');
      return NextResponse.redirect(new URL('/login', req.url));
    }

    // Check if user is admin
    const { data: adminUser, error: adminError } = await supabase
      .from('admin_users')
      .select('*')
      .eq('id', user.id)
      .single();

    logger.debug('[Proxy] Admin check', {
      isAdmin: !!adminUser,
      isSuperAdmin: adminUser?.is_superadmin,
      error: adminError?.message,
    });

    // Not an admin - redirect to home
    if (adminError || !adminUser) {
      logger.warn('[Proxy] User is not an admin, redirecting to home');
      return NextResponse.redirect(new URL('/', req.url));
    }

    // User is authenticated and is admin - allow access
    logger.info('[Proxy] Admin access granted');
    return response;
  } catch (error) {
    logger.error('[Proxy] Unexpected error', error);
    return NextResponse.redirect(new URL('/login', req.url));
  }
}

export const config = {
  matcher: ['/admin/:path*'],
};
