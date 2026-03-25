
"use client";

import { useEffect, useRef, useCallback } from 'react';
import { getAuth, signOut } from 'firebase/auth';
import { useFirebaseApp } from '@/firebase';
import { useNavigation } from '@/context/navigation-context';
import { usePathname } from 'next/navigation';
import { useToast } from './use-toast';
import { useAuth } from '@/context/auth-context';

const LAST_ACTIVITY_KEY = 'lastActivityTime';

export const useIdleTimeout = (timeout: number) => {
    const app = useFirebaseApp();
    const { user } = useAuth();
    const { navigate } = useNavigation();
    const pathname = usePathname();
    const { toast } = useToast();
    const timer = useRef<NodeJS.Timeout | null>(null);

    const handleLogout = useCallback(async () => {
        if (!app || !user) return;
        const auth = getAuth(app);

        await signOut(auth);

        localStorage.removeItem(LAST_ACTIVITY_KEY);

        toast({
            title: "Session Expired",
            description: "You have been logged out due to inactivity.",
        });

        navigate('/login', { replace: true });

    }, [app, user, navigate, pathname, toast]);

    const resetTimer = useCallback(() => {
        if (timer.current) {
            clearTimeout(timer.current);
        }
        localStorage.setItem(LAST_ACTIVITY_KEY, Date.now().toString());
        timer.current = setTimeout(handleLogout, timeout);
    }, [handleLogout, timeout]);

    const handleVisibilityChange = useCallback(() => {
        if (document.visibilityState === 'visible') {
            const lastActivityTime = localStorage.getItem(LAST_ACTIVITY_KEY);
            if (lastActivityTime) {
                const elapsed = Date.now() - parseInt(lastActivityTime, 10);
                if (elapsed > timeout) {
                    handleLogout();
                } else {
                    // If user comes back before timeout, reset the timer with the remaining time
                    if (timer.current) clearTimeout(timer.current);
                    timer.current = setTimeout(handleLogout, timeout - elapsed);
                }
            } else {
                // If there's no activity time, start a fresh timer
                resetTimer();
            }
        } else {
            // When tab becomes hidden, clear the JS timer.
            // The visibility change handler will take care of it when it becomes visible again.
            if (timer.current) {
                clearTimeout(timer.current);
            }
        }
    }, [timeout, handleLogout, resetTimer]);

    useEffect(() => {
        if (!user) return;

        const events = ['mousemove', 'keydown', 'click', 'touchstart'];

        const handleActivity = () => {
            resetTimer();
        };

        events.forEach(event => window.addEventListener(event, handleActivity));
        document.addEventListener('visibilitychange', handleVisibilityChange);

        resetTimer();

        return () => {
            events.forEach(event => window.removeEventListener(event, handleActivity));
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            if (timer.current) {
                clearTimeout(timer.current);
            }
        };
    }, [resetTimer, user, handleVisibilityChange]);
};
