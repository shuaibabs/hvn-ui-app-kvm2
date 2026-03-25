// This page is now effectively handled by the logic in /app/layout.tsx and /components/layout/main-layout.tsx
// It will render the login page for unauthenticated users.
// We can redirect to /login to make the URL canonical.
import { redirect } from 'next/navigation';

export default function RootPage() {
  redirect('/login');
}
