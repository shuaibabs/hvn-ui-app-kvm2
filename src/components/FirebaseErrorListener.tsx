"use client";

import { useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { errorEmitter } from '@/firebase/error-emitter';
import type { FirestorePermissionError } from '@/firebase/errors';

export function FirebaseErrorListener() {
  const { toast } = useToast();

  useEffect(() => {
    const handlePermissionError = (error: FirestorePermissionError) => {
      console.error("Firestore Permission Error Caught:", error.toString());
      
      toast({
        variant: "destructive",
        title: "Firestore Permission Denied",
        description: error.message,
        duration: 10000,
      });

      // In a development environment, you might want to throw the error
      // to see the Next.js overlay with the full error details.
      if (process.env.NODE_ENV === 'development') {
        // This will be caught by the Next.js error overlay
        throw error;
      }
    };

    errorEmitter.on('permission-error', handlePermissionError);

    return () => {
      errorEmitter.off('permission-error', handlePermissionError);
    };
  }, [toast]);

  return null; // This component does not render anything
}
