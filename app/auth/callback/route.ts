import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const error = requestUrl.searchParams.get('error');
  const errorDescription = requestUrl.searchParams.get('error_description');
  const state = requestUrl.searchParams.get('state');

  logger.info('[Callback] OAuth callback received', {
    hasCode: !!code,
    hasState: !!state,
    error,
    errorDescription,
    origin: request.headers.get('origin'),
    referer: request.headers.get('referer'),
  });

  // Validate origin to prevent CSRF attacks
  const origin = request.headers.get('origin') || request.headers.get('referer');
  const allowedOrigins = [
    requestUrl.origin,
    'http://localhost:3000',
    process.env.NEXT_PUBLIC_SITE_URL,
  ].filter(Boolean);

  // For OAuth callbacks, the origin might be from Google, so we check the referer contains our domain
  const referer = request.headers.get('referer');
  const isValidOrigin = referer?.includes(requestUrl.origin) || allowedOrigins.includes(origin || '');

  if (!isValidOrigin && process.env.NODE_ENV === 'production') {
    logger.error('[Callback] Invalid origin detected', {
      origin,
      referer,
      allowed: allowedOrigins,
    });
    return NextResponse.redirect(
      new URL('/login?error=invalid_origin', requestUrl.origin)
    );
  }

  // If OAuth provider returned an error
  if (error) {
    logger.error('[Callback] OAuth provider error', { error, errorDescription });
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(error)}`, requestUrl.origin)
    );
  }

  // If no code, something went wrong
  if (!code) {
    logger.error('[Callback] No authorization code received');
    return NextResponse.redirect(
      new URL('/login?error=no_code', requestUrl.origin)
    );
  }

  const cookieStore = await cookies();

  // Track cookies to set on response
  const cookiesToSet: Array<{ name: string; value: string; options: CookieOptions }> = [];
  const cookiesToRemove: Array<{ name: string; options: CookieOptions }> = [];

  // Create Supabase client with proper cookie handling
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          cookiesToSet.push({ name, value, options });
        },
        remove(name: string, options: CookieOptions) {
          cookiesToRemove.push({ name, options });
        },
      },
    }
  );

  logger.info('[Callback] Exchanging code for session');

  try {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      logger.error('[Callback] Error exchanging code', {
        message: error.message,
        status: error.status,
        name: error.name,
      });
      return NextResponse.redirect(
        new URL(`/login?error=exchange_failed`, requestUrl.origin)
      );
    }

    if (!data.session) {
      logger.error('[Callback] No session returned after exchange');
      return NextResponse.redirect(
        new URL('/login?error=no_session', requestUrl.origin)
      );
    }

    logger.info('[Callback] Session created successfully', {
      userId: data.user.id,
      email: data.user.email,
      expiresAt: data.session.expires_at,
    });

    // Create redirect response with timestamp to bust Next.js router cache
    const redirectUrl = new URL('/admin', requestUrl.origin);
    redirectUrl.searchParams.set('t', Date.now().toString());

    const response = NextResponse.redirect(redirectUrl);

    // Set all cookies with proper security options
    const isProduction = process.env.NODE_ENV === 'production';
    cookiesToSet.forEach(({ name, value, options }) => {
      response.cookies.set({
        name,
        value,
        ...options,
        sameSite: 'lax',
        secure: isProduction, // Secure flag in production
        path: '/',
      });
    });

    cookiesToRemove.forEach(({ name, options }) => {
      response.cookies.set({
        name,
        value: '',
        ...options,
        sameSite: 'lax',
        secure: isProduction,
        path: '/',
        maxAge: 0,
      });
    });

    // Force Next.js to not use cached data
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
    response.headers.set('Surrogate-Control', 'no-store');

    logger.info('[Callback] Redirecting to admin with fresh session');
    return response;
  } catch (err) {
    logger.error('[Callback] Unexpected error', err);
    return NextResponse.redirect(
      new URL('/login?error=unexpected', requestUrl.origin)
    );
  }
}
