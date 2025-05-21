
"use client";

import React, { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { Loader2, ShieldAlert } from 'lucide-react';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { currentUser, isLoading, isAdmin } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !currentUser) {
      // If auth check is done and no user, redirect to login
      router.replace('/login?next=' + window.location.pathname);
    }
  }, [currentUser, isLoading, router]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen w-full">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="ml-3 text-lg">Verifying access...</p>
      </div>
    );
  }

  if (!currentUser) {
    // This case should ideally be handled by the useEffect redirect,
    // but as a fallback:
    return (
      <div className="flex items-center justify-center h-screen w-full">
        <p className="text-lg text-destructive">Redirecting to login...</p>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="container mx-auto p-8 text-center">
        <ShieldAlert className="mx-auto h-16 w-16 text-destructive mb-4" />
        <h1 className="text-2xl font-bold text-destructive">Access Denied</h1>
        <p className="text-muted-foreground mt-2">
          You do not have the necessary permissions to view this page.
        </p>
        <p className="mt-4">
          <button onClick={() => router.push('/')} className="text-accent hover:underline">
            Go to Homepage
          </button>
        </p>
      </div>
    );
  }

  // If user is logged in and is an admin, render the children
  return <>{children}</>;
}
