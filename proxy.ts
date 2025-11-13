import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function proxy(req: NextRequest) {
  // Only protect admin routes
  if (!req.nextUrl.pathname.startsWith('/admin')) {
    return NextResponse.next();
  }

  console.log('[Proxy] Checking admin route:', req.nextUrl.pathname);

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
    // Get the current session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();

    console.log('[Proxy] Session check:', {
      hasSession: !!session,
      sessionError: sessionError?.message,
      userId: session?.user?.id,
      cookies: req.cookies.getAll().map(c => c.name).join(', ') || 'none',
    });

    // No session - redirect to login
    if (!session) {
      console.log('[Proxy] No session found, redirecting to login');
      return NextResponse.redirect(new URL('/login', req.url));
    }

    // Check if user is admin
    const { data: adminUser, error: adminError } = await supabase
      .from('admin_users')
      .select('*')
      .eq('id', session.user.id)
      .single();

    console.log('[Proxy] Admin check:', {
      isAdmin: !!adminUser,
      isSuperAdmin: adminUser?.is_superadmin,
      error: adminError?.message,
    });

    // Not an admin - redirect to home
    if (adminError || !adminUser) {
      console.log('[Proxy] User is not an admin, redirecting to home');
      return NextResponse.redirect(new URL('/', req.url));
    }

    // User is authenticated and is admin - allow access
    console.log('[Proxy] Admin access granted');
    return response;
  } catch (error) {
    console.error('[Proxy] Unexpected error:', error);
    return NextResponse.redirect(new URL('/login', req.url));
  }
}

export const config = {
  matcher: ['/admin/:path*'],
};
