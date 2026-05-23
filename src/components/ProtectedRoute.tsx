import type { ReactNode } from "react";
import { useAuth } from "@/lib/auth";
import { LoginButton } from "./LoginButton";

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="p-8 text-neutral-500">Loading…</div>;
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-md p-8 text-center">
        <h2 className="mb-2 text-xl font-semibold">Sign in required</h2>
        <p className="mb-6 text-sm text-neutral-400">
          Sign in with Google to access this app.
        </p>
        <LoginButton />
      </div>
    );
  }

  return <>{children}</>;
}
