export type PostAuthContext = {
  isAuthenticated: boolean;
  onboardingCompleted: boolean;
  requestedRoute?: string | null;
  isRequestedRouteSafe?: boolean;
};

export type PostAuthDecision = {
  destination: string;
  reason: "requested-route" | "onboarding-required" | "workspace-default" | "unauthenticated";
};

export function resolvePostAuthDestination(context: PostAuthContext): PostAuthDecision {
  if (!context.isAuthenticated) {
    return { destination: "/login", reason: "unauthenticated" };
  }

  if (context.requestedRoute && context.isRequestedRouteSafe) {
    return { destination: context.requestedRoute, reason: "requested-route" };
  }

  if (!context.onboardingCompleted) {
    return { destination: "/workspace/setup", reason: "onboarding-required" };
  }

  return { destination: "/workspace", reason: "workspace-default" };
}
