
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAuth as useFirebaseAuth, useFirestore } from '@/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, ArrowLeft, UserPlus, Send } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/context/auth-context';
import { PageHeader } from '@/components/page-header';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { FirebaseError } from 'firebase/app';
import { Auth, createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { useNavigation } from '@/context/navigation-context';

const formSchema = z.object({
    displayName: z.string().min(2, { message: 'Name must be at least 2 characters.' }),
    email: z.string().email({ message: 'Invalid email address.' }),
    password: z.string().min(6, { message: 'Password must be at least 6 characters.' }),
    role: z.enum(['admin', 'employee']),
    telegramUsername: z.string().optional(),
});

// A temporary, secondary Firebase App to create users without logging the admin out.
async function createSecondaryApp(auth: Auth) {
    const { initializeApp } = await import('firebase/app');
    const { getAuth: getSecondaryAuth } = await import('firebase/auth');
    const tempAppName = `temp-user-creation-${Date.now()}`;
    const currentConfig = auth.app.options;
    const secondaryApp = initializeApp(currentConfig, tempAppName);
    return getSecondaryAuth(secondaryApp);
}


export default function SignupPage() {
    const firebaseAuth = useFirebaseAuth();
    const db = useFirestore();
    const { user: adminUser, role: adminRole } = useAuth();
    const { toast } = useToast();
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const { navigate } = useNavigation();

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            displayName: '',
            email: '',
            password: '',
            role: 'employee',
            telegramUsername: '',
        },
    });

    // Only admins can access this page
    if (adminRole !== 'admin') {
        return (
            <div className="p-4 md:p-6 lg:p-8">
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Access Denied</AlertTitle>
                    <AlertDescription>You do not have permission to create new users.</AlertDescription>
                </Alert>
                <Button variant="link" asChild className="mt-4" onClick={() => navigate('/dashboard')}>
                    <Link href="/dashboard">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Dashboard
                    </Link>
                </Button>
            </div>
        );
    }

    const onSubmit = async (values: z.infer<typeof formSchema>) => {
        setLoading(true);
        setError(null);
        if (!firebaseAuth || !db || !adminUser) {
            setError("Auth service is not available or you are not logged in.");
            setLoading(false);
            return;
        }

        let secondaryAuth: Auth | null = null;

        try {
            secondaryAuth = await createSecondaryApp(firebaseAuth);
            const userCredential = await createUserWithEmailAndPassword(secondaryAuth, values.email, values.password);
            const newUser = userCredential.user;

            await updateProfile(newUser, { displayName: values.displayName });

            const userDocRef = doc(db, 'users', newUser.uid);
            await setDoc(userDocRef, {
                uid: newUser.uid,
                id: newUser.uid,
                email: values.email,
                displayName: values.displayName,
                role: values.role,
                telegramUsername: values.telegramUsername || null,
            });

            toast({
                title: 'User Created',
                description: `${values.displayName} has been successfully created.`,
            });
            form.reset();

        } catch (err: any) {
            if (err.code === 'auth/email-already-in-use') {
                setError('This email address is already in use.');
            } else if (err.code === 'permission-denied') {
                setError('Permission denied. Ensure you have admin rights and correct security rules.')
            } else {
                setError(err.message || 'An unexpected error occurred during user creation.');
            }
        } finally {
            setLoading(false);
            if (secondaryAuth) {
                // Clean up the temporary app
                const { deleteApp } = await import('firebase/app');
                deleteApp(secondaryAuth.app).catch(e => console.error("Could not delete temp app", e));
            }
        }
    };

    return (
        <>
            <PageHeader title="Create New User" description="Add a new admin or employee to the system." />
            <div className="flex justify-center">
                <Card className="w-full max-w-2xl">
                    <CardHeader>
                        <CardTitle>User Details</CardTitle>
                        <CardDescription>Fill out the form to create a new user account.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                                {error && (
                                    <Alert variant="destructive">
                                        <AlertCircle className="h-4 w-4" />
                                        <AlertTitle>Creation Failed</AlertTitle>
                                        <AlertDescription>{error}</AlertDescription>
                                    </Alert>
                                )}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <FormField
                                        control={form.control}
                                        name="displayName"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Full Name</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="e.g. John Doe" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="email"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Email</FormLabel>
                                                <FormControl>
                                                    <Input type="email" placeholder="user@example.com" {...field} />
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
                                    <FormField
                                        control={form.control}
                                        name="role"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Role</FormLabel>
                                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                    <FormControl>
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="Select a role" />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        <SelectItem value="employee">Employee</SelectItem>
                                                        <SelectItem value="admin">Admin</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="telegramUsername"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Telegram Username (Optional)</FormLabel>
                                                <FormControl>
                                                    <div className="relative">
                                                        <Send className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                                        <Input placeholder="@username" {...field} className="pl-9" />
                                                    </div>
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>

                                <div className="flex justify-end pt-4">
                                    <Button type="submit" disabled={loading}>
                                        {loading ? 'Creating...' : <> <UserPlus className="mr-2 h-4 w-4" /> Create User </>}
                                    </Button>
                                </div>
                            </form>
                        </Form>
                    </CardContent>
                </Card>
            </div>
        </>
    );
}
