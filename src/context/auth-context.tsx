
"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { onAuthStateChanged, signOut, type User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc, setDoc, getDocs, collection, onSnapshot } from 'firebase/firestore';
import { useAuth as useFirebaseAuth, useFirestore } from '@/firebase';
import type { User } from '@/lib/data';
import { useToast } from '@/hooks/use-toast';
import { FirestorePermissionError } from '@/firebase/errors';
import { errorEmitter } from '@/firebase/error-emitter';

type AuthContextType = {
  user: FirebaseUser | null;
  role: 'admin' | 'employee' | null;
  profile: User | null;
  loading: boolean;
};
const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const auth = useFirebaseAuth();
  const db = useFirestore();
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [role, setRole] = useState<'admin' | 'employee' | null>(null);
  const [profile, setProfile] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (!auth || !db) {
      setLoading(true);
      return;
    }

    let userDocUnsubscribe: (() => void) | undefined;

    const authStateUnsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (userDocUnsubscribe) {
        userDocUnsubscribe(); // Clean up previous listener
      }

      if (firebaseUser) {
        const userDocRef = doc(db, 'users', firebaseUser.uid);

        userDocUnsubscribe = onSnapshot(userDocRef, async (docSnap) => {
          const isLoggingIn = !user && firebaseUser;

          if (docSnap.exists()) {
            const userData = docSnap.data() as User;
            setUser(firebaseUser);
            setRole(userData.role);
            setProfile(userData);
            if (isLoggingIn) {
              toast({
                title: "Logged In Successfully",
                description: `Welcome back, ${firebaseUser.displayName || firebaseUser.email}!`,
              });
            }
            setLoading(false);
          } else {
            // Doc doesn't exist. Check if it's the VERY first user to bootstrap admin.
            const usersCollection = collection(db, "users");
            const usersSnap = await getDocs(usersCollection);
            if (usersSnap.empty) {
              // First user ever. Create admin doc.
              const newRole = 'admin';
              const newUser: User = {
                uid: firebaseUser.uid,
                id: firebaseUser.uid,
                email: firebaseUser.email || '',
                displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'New User',
                role: newRole,
              };
              try {
                await setDoc(userDocRef, newUser);
                // The onSnapshot will fire again with the new doc, setting the user and role.
              } catch (e) {
                console.error("Failed to create first admin user doc:", e);
                signOut(auth);
              }
            } else {
              // Not the first user, and their doc is missing. Sign them out.
              signOut(auth);
            }
          }
        }, (error) => {
          console.error("Error listening to user document:", error);
          signOut(auth);
          setLoading(false);
        });

      } else {
        // User is logged out.
        setUser(null);
        setRole(null);
        setProfile(null);
        setLoading(false);
      }
    });

    return () => {
      authStateUnsubscribe();
      if (userDocUnsubscribe) {
        userDocUnsubscribe();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth, db]);

  return (
    <AuthContext.Provider value={{ user, role, profile, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
