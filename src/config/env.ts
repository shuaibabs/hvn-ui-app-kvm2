import { z } from 'zod';

const envSchema = z.object({
    NEXT_PUBLIC_FIREBASE_PROJECT_ID: z.string().min(1, 'FIREBASE_PROJECT_ID is required'),
    NEXT_PUBLIC_FIREBASE_APP_ID: z.string().min(1, 'FIREBASE_APP_ID is required'),
    NEXT_PUBLIC_FIREBASE_API_KEY: z.string().min(1, 'FIREBASE_API_KEY is required'),
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: z.string().min(1, 'FIREBASE_AUTH_DOMAIN is required'),
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: z.string().min(1, 'FIREBASE_STORAGE_BUCKET is required'),
    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: z.string().min(1, 'FIREBASE_MESSAGING_SENDER_ID is required'),
    NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID: z.string().optional(),
    NEXT_PUBLIC_BOT_SERVER_URL: z.string().url('Invalid BOT_SERVER_URL'),
    NEXT_PUBLIC_NOTIFY_API_KEY: z.string().min(1, 'NOTIFY_API_KEY is required'),
});

const parsed = envSchema.safeParse({
    NEXT_PUBLIC_FIREBASE_PROJECT_ID: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    NEXT_PUBLIC_FIREBASE_APP_ID: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    NEXT_PUBLIC_FIREBASE_API_KEY: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
    NEXT_PUBLIC_BOT_SERVER_URL: process.env.NEXT_PUBLIC_BOT_SERVER_URL,
    NEXT_PUBLIC_NOTIFY_API_KEY: process.env.NEXT_PUBLIC_NOTIFY_API_KEY,
});

if (!parsed.success) {
    console.error('❌ Environment Variable validation failed:', parsed.error.format());
    // In a client-side environment, we can't exit the process, 
    // but we can throw an error to prevent the app from running with invalid config.
    throw new Error('Invalid environment configuration');
}

export const env = parsed.data;
