
"use client";

import { useRouter, usePathname } from 'next/navigation';
import { createContext, useContext, useState, type ReactNode, useCallback, useEffect } from 'react';
import { getRouteInfo } from '@/lib/route-component-map';

const PUBLIC_PATHS = ['/login', '/'];

export type Tab = {
  id: string; // The href, e.g., '/dashboard'
  label: string;
  href: string;
  component: React.ComponentType;
};

type TabContextType = {
  tabs: Tab[];
  activeTabId: string | null;
  openTab: (href: string) => void;
  closeTab: (tabId: string) => void;
  isNavigating: boolean;
  setIsNavigating: (isNavigating: boolean) => void;
  navigate: (href: string, options?: { replace?: boolean }) => void;
  back: () => void;
};

const TabContext = createContext<TabContextType | undefined>(undefined);

export function NavigationProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isNavigating, setIsNavigating] = useState(false);

  const [tabs, setTabs] = useState<Tab[]>(() => {
    const routeInfo = getRouteInfo(pathname);
    if (!routeInfo || PUBLIC_PATHS.includes(pathname)) return [];
    return [{
      id: pathname,
      href: pathname,
      label: routeInfo.label,
      component: routeInfo.component,
    }];
  });

  const [activeTabId, setActiveTabId] = useState<string | null>(pathname);
  const [tabHistory, setTabHistory] = useState<string[]>(tabs.length > 0 ? [pathname] : []);

  useEffect(() => {
    // This effect is the source of truth for syncing the URL with the tab state.
    const routeInfo = getRouteInfo(pathname);

    if (routeInfo) {
      setTabs(prevTabs => {
        const tabExists = prevTabs.some(tab => tab.id === pathname);
        if (tabExists) {
          return prevTabs;
        }
        const newTab: Tab = {
          id: pathname,
          href: pathname,
          label: routeInfo.label,
          component: routeInfo.component,
        };
        return [...prevTabs, newTab];
      });

      setActiveTabId(pathname);

      setTabHistory(prevHistory => {
        if (prevHistory[prevHistory.length - 1] !== pathname) {
          return [...prevHistory, pathname];
        }
        return prevHistory;
      });
    }
    
    setIsNavigating(false);
  }, [pathname]);


  const navigate = useCallback((href: string, options?: { replace?: boolean }) => {
    if (href === pathname) {
      setIsNavigating(false);
      return;
    }
    setIsNavigating(true);

    if (options?.replace) {
      router.replace(href);
    } else {
      router.push(href);
    }
  }, [pathname, router]);

  const openTab = useCallback((href: string) => {
    navigate(href);
  }, [navigate]);

  const closeTab = useCallback((tabId: string) => {
    if (tabs.length <= 1) return;

    // Determine the next tab to navigate to
    const newHistory = tabHistory.filter(id => id !== tabId);
    const newActiveId = newHistory[newHistory.length - 1] || '/dashboard';
    
    // Perform navigation first
    if (activeTabId === tabId) {
      navigate(newActiveId);
    }

    // Then update the state
    setTabHistory(newHistory);
    setTabs(prevTabs => prevTabs.filter(tab => tab.id !== tabId));

  }, [tabs.length, tabHistory, activeTabId, navigate]);

  const back = useCallback(() => {
    router.back();
  }, [router]);
  
  const contextValue = {
    tabs,
    activeTabId,
    openTab,
    closeTab,
    isNavigating,
    setIsNavigating,
    navigate,
    back
  };

  return (
    <TabContext.Provider value={contextValue}>
      {children}
    </TabContext.Provider>
  );
}

export function useTabs() {
  const context = useContext(TabContext);
  if (context === undefined) {
    throw new Error('useTabs must be used within a NavigationProvider');
  }
  return context;
}

export function useNavigation() {
    const context = useContext(TabContext);
    if (context === undefined) {
        throw new Error('useNavigation must be used within a NavigationProvider');
    }
    return {
        isNavigating: context.isNavigating,
        setIsNavigating: context.setIsNavigating,
        navigate: context.navigate,
        back: context.back,
    };
}
