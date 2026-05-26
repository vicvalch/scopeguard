import type { SupabaseClient, User } from "@supabase/supabase-js";
import { resolvePostAuthDestination } from "@/lib/auth/resolve-post-auth-destination";

const toRedirectPath = (user: User | null) =>
  resolvePostAuthDestination({
    isAuthenticated: Boolean(user),
    onboardingCompleted: user?.user_metadata?.onboarding_completed === true,
  }).destination;

export const getPostAuthRedirectPath = (user: User | null) => toRedirectPath(user);

export const resolvePostAuthRedirectPath = async (supabase: SupabaseClient) => {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return toRedirectPath(user);
};
