
"use client";

import type { ReactNode} from 'react';
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { type User as FirebaseAuthUser, onAuthStateChanged, signOut as firebaseSignOut, signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import type { AppUser, UserRole } from '@/types';
import { ensureUserProfileClient, getUserProfileClient } from '@/app/actions/authActions'; // Client-side wrappers
import { usePathname, useRouter } from 'next/navigation';
import { toast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

interface AuthContextType {
  currentUser: AppUser | null; // Our custom AppUser type
  firebaseUser: FirebaseAuthUser | null; // Raw Firebase user
  isLoading: boolean;
  isAdmin: boolean;
  login: (email: string, pass: string) => Promise<boolean>;
  logout: () => Promise<void>;
  refreshUserProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseAuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  const fetchUserProfile = useCallback(async (user: FirebaseAuthUser) => {
    if (user) {
      try {
        // Ensure profile exists, then fetch it
        await ensureUserProfileClient(user.uid, user.email || '', user.displayName || undefined);
        const profile = await getUserProfileClient(user.uid);
        if (profile) {
          setCurrentUser(profile);
        } else {
          // This case should ideally not happen if ensureUserProfile works
          console.warn("AuthContext: User profile not found in Firestore after ensuring it exists for UID:", user.uid);
          setCurrentUser(null); // Or handle as an error state
        }
      } catch (error) {
        console.error("AuthContext: Error fetching user profile:", error);
        setCurrentUser(null);
        // Potentially sign out the user if profile fetch fails critically
        // await firebaseSignOut(auth); 
      }
    } else {
      setCurrentUser(null);
    }
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setIsLoading(true);
      setFirebaseUser(user);
      if (user) {
        await fetchUserProfile(user);
      } else {
        setCurrentUser(null);
      }
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, [fetchUserProfile]);

  const login = async (email: string, pass: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, pass);
      // onAuthStateChanged will trigger fetchUserProfile
      toast({ title: "Login Successful", description: `Welcome back!` });
      return true;
    } catch (error: any) {
      console.error("AuthContext: Login error", error);
      let message = "Login failed. Please check your credentials.";
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        message = "Invalid email or password.";
      } else if (error.code === 'auth/too-many-requests') {
        message = "Too many login attempts. Please try again later.";
      }
      toast({ title: "Login Failed", description: message, variant: "destructive" });
      setIsLoading(false);
      return false;
    }
    // setIsLoading(false) will be handled by onAuthStateChanged
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await firebaseSignOut(auth);
      setCurrentUser(null);
      setFirebaseUser(null);
      // Clear any sensitive local storage or context state if needed
      router.push('/login'); // Redirect to login after logout
      toast({ title: "Logged Out", description: "You have been successfully logged out." });
    } catch (error) {
      console.error("AuthContext: Logout error", error);
      toast({ title: "Logout Failed", description: "Could not log out. Please try again.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };
  
  const refreshUserProfile = useCallback(async () => {
      if (firebaseUser) {
          setIsLoading(true);
          await fetchUserProfile(firebaseUser);
          setIsLoading(false);
      }
  }, [firebaseUser, fetchUserProfile]);


  const isAdmin = currentUser?.role === 'admin';

  if (isLoading && !pathname.startsWith('/login')) { // Don't show global loader on login page itself during initial auth check
    return (
      <div className="flex items-center justify-center h-screen w-screen bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-4 text-lg text-foreground">Loading user session...</p>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ currentUser, firebaseUser, isLoading, login, logout, isAdmin, refreshUserProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
