
"use client";

import { type ReactNode } from 'react';
import { useAuth } from '@/context/auth-context';
import { AppHeader } from '@/components/layout/header';
import { AppSidebar } from '@/components/layout/sidebar';
import { SidebarProvider } from '@/components/ui/sidebar';
import { Spinner } from '../ui/spinner';
import { useIdleTimeout } from '@/hooks/use-idle-timeout';
import { WorkReminderPopup } from '../work-reminder-popup';
import { useTabs } from '@/context/navigation-context';
import { TabBar } from './tab-bar';
import { cn } from '@/lib/utils';
import { usePathname } from 'next/navigation';
import { getRouteInfo } from '@/lib/route-component-map';

const IDLE_TIMEOUT = 10 * 60 * 1000; // 10 minutes

export function ProtectedLayout({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const { tabs, activeTabId, isNavigating } = useTabs();
  const pathname = usePathname();
  useIdleTimeout(IDLE_TIMEOUT);


  if (loading || !user) {
    return (
        <div className="flex h-screen w-screen items-center justify-center">
            <Spinner className="h-10 w-10" />
        </div>
    );
  }
  
  const isTabbableRoute = !!getRouteInfo(pathname);

  return (
    <SidebarProvider>
        {isNavigating && (
             <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-sm">
                <Spinner className="h-10 w-10" />
            </div>
        )}
        <div className="flex min-h-screen w-full">
            <AppSidebar />
            <div className="flex flex-col flex-1 min-w-0">
                <AppHeader />
                <TabBar />
                 <main className="flex-1 overflow-auto relative bg-muted/20">
                    {/* Non-tabbable routes take precedence and are rendered directly */}
                    {!isTabbableRoute ? (
                        <div className="p-4 md:p-6 lg:p-8">{children}</div>
                    ) : (
                        // Otherwise, render the stateful tab container
                        tabs.map((tab) => {
                            const PageComponent = tab.component;
                            const isActive = tab.id === activeTabId;
                            return (
                                <div
                                    key={tab.id}
                                    style={{ display: isActive ? 'block' : 'none' }}
                                    className="absolute inset-0 focus:outline-none"
                                    role="tabpanel"
                                    aria-hidden={!isActive}
                                >
                                    <div className="p-4 md:p-6 lg:p-8">
                                        <PageComponent />
                                    </div>
                                </div>
                            )
                        })
                    )}
                </main>
            </div>
        </div>
        <WorkReminderPopup />
    </SidebarProvider>
  );
}
