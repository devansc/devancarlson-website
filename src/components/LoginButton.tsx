import { useAuth } from "@/lib/auth";

export function LoginButton({ className = "" }: { className?: string }) {
  const { user, signInWithGoogle, signOut, loading } = useAuth();

  if (loading) {
    return <span className="text-sm text-neutral-500">…</span>;
  }

  if (user) {
    return (
      <div className={`flex items-center gap-3 ${className}`}>
        <span className="text-sm text-neutral-400">{user.email}</span>
        <button className="btn-ghost" onClick={signOut}>
          Sign out
        </button>
      </div>
    );
  }

  return (
    <button className={`btn-primary ${className}`} onClick={signInWithGoogle}>
      Sign in with Google
    </button>
  );
}
