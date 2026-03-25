import type { Metadata } from 'next';
import './globals.css';
import { ThemeProvider } from '@/components/theme-provider';
import { AppProvider } from '@/context/app-context';
import { Toaster } from '@/components/ui/toaster';
import { MainLayout } from '@/components/layout/main-layout';
import { AuthProvider } from '@/context/auth-context';
import { FirebaseProvider } from '@/firebase';
import { FirebaseErrorListener } from '@/components/FirebaseErrorListener';
import { NavigationProvider } from '@/context/navigation-context';

export const metadata: Metadata = {
  title: 'Hashmi VIP Numbers',
  description: 'Number Management System',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <Toaster />
          <FirebaseProvider>
            <AuthProvider>
              <NavigationProvider>
                <AppProvider>
                  <MainLayout>{children}</MainLayout>
                  <FirebaseErrorListener />
                </AppProvider>
              </NavigationProvider>
            </AuthProvider>
          </FirebaseProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
