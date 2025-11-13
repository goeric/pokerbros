import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const error = requestUrl.searchParams.get('error');
  const errorDescription = requestUrl.searchParams.get('error_description');

  console.log('[Callback] OAuth callback received:', {
    hasCode: !!code,
    error,
    errorDescription,
    fullUrl: requestUrl.toString(),
  });

  // If OAuth provider returned an error
  if (error) {
    console.error('[Callback] OAuth provider error:', { error, errorDescription });
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(error)}`, requestUrl.origin)
    );
  }

  // If no code, something went wrong
  if (!code) {
    console.error('[Callback] No authorization code received');
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
            console.log('[Callback] Could not set cookie on store:', e);
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
            console.log('[Callback] Could not delete cookie from store:', e);
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

  console.log('[Callback] Exchanging code for session...');

  try {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      console.error('[Callback] Error exchanging code:', {
        message: error.message,
        status: error.status,
        name: error.name,
      });
      return NextResponse.redirect(
        new URL(`/login?error=exchange_failed`, requestUrl.origin)
      );
    }

    if (!data.session) {
      console.error('[Callback] No session returned after exchange');
      return NextResponse.redirect(
        new URL('/login?error=no_session', requestUrl.origin)
      );
    }

    console.log('[Callback] Session created successfully:', {
      userId: data.user.id,
      email: data.user.email,
      expiresAt: data.session.expires_at,
    });

    // Redirect to admin page
    response = NextResponse.redirect(new URL('/admin', requestUrl.origin));
    return response;
  } catch (err) {
    console.error('[Callback] Unexpected error:', err);
    return NextResponse.redirect(
      new URL('/login?error=unexpected', requestUrl.origin)
    );
  }
}
