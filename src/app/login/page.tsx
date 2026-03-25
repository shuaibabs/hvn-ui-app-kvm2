
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useRouter } from 'next/navigation';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { useAuth as useFirebaseAuth } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, RadioTower } from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import { Spinner } from '@/components/ui/spinner';
import { Separator } from '../../components/ui/separator';
import TrionexLogo from '@/components/icons/trionex-logo';


const formSchema = z.object({
  email: z.string().email({ message: 'Invalid email address.' }),
  password: z.string().min(6, { message: 'Password must be at least 6 characters.' }),
});

export default function LoginPage() {
  const firebaseAuth = useFirebaseAuth();
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  // If the user is already authenticated, the main layout will handle redirection.
  // We can show a spinner here while that happens.
  if (authLoading || user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <Spinner className="h-10 w-10" />
      </div>
    );
  }

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    setLoading(true);
    setError(null);
    if (!firebaseAuth) {
      setError("Auth service is not available.");
      setLoading(false);
      return;
    }

    signInWithEmailAndPassword(firebaseAuth, values.email, values.password)
      .catch((err: any) => {
        if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found') {
          setError('Invalid email or password. Please try again.');
        } else {
          setError(err.message || 'An unexpected error occurred.');
        }
      })
      .finally(() => {
        setLoading(false);
      });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <div className="flex justify-center items-center mb-4">
            <img
              src="\assets\icons\icon.png"
              alt="App Icon"
              className="h-16 w-16 object-contain"
            />
          </div>
          <CardTitle className="text-2xl">Welcome to Hashmi VIP Numbers</CardTitle>
          <CardDescription>Sign in to your account to continue</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Login Failed</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="admin@example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="••••••••" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Signing In...' : 'Sign In'}
              </Button>
            </form>
          </Form>
        </CardContent>
        <CardFooter className="flex flex-col items-center justify-center text-sm">
          <p className="text-muted-foreground">
            Only admins can create new users.
          </p>
          <Separator className="my-2 bg-sidebar-border" />
          <div className="p-4 text-center text-xs text-sidebar-foreground/70 space-y-2 group-data-[collapsible=icon]:hidden">
            <div className="flex flex-col items-center">
              <div className="w-full text-left">
                <span>Developed by</span>
              </div>

              <a
                href="https://trionexdigital.netlify.app/"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 flex justify-center font-semibold text-sidebar-foreground/90 hover:text-sidebar-foreground transition-colors"
              >
                <TrionexLogo />
              </a>
            </div>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
