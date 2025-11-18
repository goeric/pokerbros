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

  // Create response that we'll redirect with
  let response = NextResponse.next();
  const cookieStore = await cookies();

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
          try {
            cookieStore.set({ name, value, ...options });
          } catch (e) {
            logger.debug('[Callback] Could not set cookie on store', e);
          }
          response.cookies.set({
            name,
            value,
            ...options,
            sameSite: 'lax',
            path: '/',
          });
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.delete(name);
          } catch (e) {
            logger.debug('[Callback] Could not delete cookie from store', e);
          }
          response.cookies.set({
            name,
            value: '',
            ...options,
            sameSite: 'lax',
            path: '/',
            maxAge: 0,
          });
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

    // Redirect to admin page with cache-busting headers
    response = NextResponse.redirect(new URL('/admin', requestUrl.origin));

    // Force Next.js to not use cached data
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');

    return response;
  } catch (err) {
    logger.error('[Callback] Unexpected error', err);
    return NextResponse.redirect(
      new URL('/login?error=unexpected', requestUrl.origin)
    );
  }
}
