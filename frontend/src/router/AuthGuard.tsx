import { useEffect } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { getMe } from '@/api/auth';
import { Skeleton } from '@/components/ui/skeleton';

export default function AuthGuard() {
  const { user, isInitialized, setUser, setInitialized } = useAuthStore();
  const location = useLocation();

  useEffect(() => {
    if (isInitialized) return;
    getMe()
      .then((u) => setUser(u))
      .catch(() => {})
      .finally(() => setInitialized());
  }, [isInitialized, setUser, setInitialized]);

  if (!isInitialized) {
    return (
      <div className="min-h-screen">
        <div className="border-b border-border h-14" />
        <div className="max-w-2xl mx-auto px-4 py-6 space-y-3">
          <Skeleton className="h-24 w-full rounded-xl" />
          <Skeleton className="h-24 w-full rounded-xl" />
          <Skeleton className="h-24 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (user.passwordChangeRequired && location.pathname !== '/change-password') {
    return <Navigate to="/change-password" replace />;
  }

  return <Outlet />;
}
