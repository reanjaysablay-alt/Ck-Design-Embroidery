import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import { isAdminEmail, canAccessAdmin } from '@/lib/admin';

// Customer-facing pages. Admin/staff accounts live in the dashboard, so
// if one lands here (e.g. reopening the site in a new window while
// still logged in), send them back to the dashboard instead.
const STOREFRONT_PATHS = ['/', '/shop', '/about', '/services', '/contact', '/quote', '/cart', '/checkout', '/account'];

function isStorefrontPath(pathname) {
  return STOREFRONT_PATHS.some((p) => (p === '/' ? pathname === '/' : pathname === p || pathname.startsWith(`${p}/`)));
}

export async function updateSession(request) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh the session if it exists — required for Server Components,
  // which cannot set cookies themselves.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user && canAccessAdmin(user.email) && isStorefrontPath(request.nextUrl.pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = isAdminEmail(user.email) ? '/admin' : '/admin/orders';
    url.search = '';
    const redirect = NextResponse.redirect(url);
    // Carry over any refreshed session cookies.
    supabaseResponse.cookies.getAll().forEach((c) => redirect.cookies.set(c));
    return redirect;
  }

  return supabaseResponse;
}
