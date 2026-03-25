
"use client";

import type { ReactNode } from 'react';
import { useAuth } from '@/context/auth-context';
import { Spinner } from '@/components/ui/spinner';
import { ProtectedLayout } from '@/components/layout/protected-layout';
import { usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { useNavigation } from '@/context/navigation-context';

const PUBLIC_PATHS = ['/login'];

export function MainLayout({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const { navigate } = useNavigation();
  const pathname = usePathname();

  useEffect(() => {
    if (loading) {
      return; // Do nothing while auth state is loading
    }
    
    const pathIsPublic = PUBLIC_PATHS.includes(pathname) || pathname === '/';
    const isUserLoggedIn = !!user;

    if (isUserLoggedIn && pathIsPublic) {
      navigate('/dashboard', { replace: true });
    } else if (!isUserLoggedIn && !pathIsPublic) {
      navigate('/login', { replace: true });
    }
  }, [user, loading, pathname, navigate]);

  // While loading, show a full-screen spinner
  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center">
        <Spinner className="h-10 w-10" />
      </div>
    );
  }
  
  // If user is logged in, show the protected layout.
  // Otherwise, show the public page (e.g., login page).
  if (user) {
    return <ProtectedLayout>{children}</ProtectedLayout>;
  }

  return <>{children}</>;
}
