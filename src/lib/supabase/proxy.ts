import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseEnv, hasSupabaseEnv } from "@/lib/supabase/env";

export const updateSession = async (
  request: NextRequest,
  extraRequestHeaders?: Headers,
) => {
  const baseHeaders = extraRequestHeaders
    ? new Headers(extraRequestHeaders)
    : new Headers(request.headers);

  let response = NextResponse.next({
    request: { headers: baseHeaders },
  });

  if (!hasSupabaseEnv) {
    return { response, user: null };
  }

  const { url, anonKey } = getSupabaseEnv();

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      get(name: string) {
        return request.cookies.get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions) {
        request.cookies.set({ name, value, ...options });
        response = NextResponse.next({ request: { headers: baseHeaders } });
        response.cookies.set({ name, value, ...options });
      },
      remove(name: string, options: CookieOptions) {
        request.cookies.set({ name, value: "", ...options });
        response = NextResponse.next({ request: { headers: baseHeaders } });
        response.cookies.set({ name, value: "", ...options });
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  await supabase.auth.getSession();

  return { response, user };
};
