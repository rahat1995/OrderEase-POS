
"use client";

import React, { useState, useEffect } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Loader2, LogIn } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

const loginFormSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address." }),
  password: z.string().min(6, { message: "Password must be at least 6 characters." }),
});
type LoginFormValues = z.infer<typeof loginFormSchema>;

export default function LoginPage() {
  const { login, currentUser, isLoading: isAuthLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: { email: '', password: '' },
  });

  useEffect(() => {
    if (currentUser && !isAuthLoading) {
      const next = searchParams.get('next');
      router.push(next || '/'); // Redirect to intended page or home
    }
  }, [currentUser, isAuthLoading, router, searchParams]);

  const onSubmit: SubmitHandler<LoginFormValues> = async (data) => {
    setIsSubmitting(true);
    const success = await login(data.email, data.password);
    if (success) {
      // Redirection is handled by useEffect or can be forced here
      // For example, router.push(searchParams.get('next') || '/');
    }
    setIsSubmitting(false);
  };

  if (isAuthLoading && !currentUser) { // Show loader only if not already logged in and initial auth check is running
    return (
      <div className="flex items-center justify-center min-h-screen bg-secondary/30">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }
  
  // If already logged in (e.g., navigated here by mistake), useEffect will redirect.
  // Show minimal content or loader to avoid flash of login form.
  if (currentUser) {
     return (
      <div className="flex items-center justify-center min-h-screen bg-secondary/30">
        <p className="text-foreground">Redirecting...</p>
      </div>
    );
  }


  return (
    <div className="flex items-center justify-center min-h-screen bg-secondary/30 p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center">
          <LogIn className="mx-auto h-12 w-12 text-accent mb-2" />
          <CardTitle className="text-2xl md:text-3xl">Login to OrderEase POS</CardTitle>
          <CardDescription>Enter your credentials to access the system.</CardDescription>
        </CardHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardContent className="space-y-6">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email Address</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="you@example.com" {...field} disabled={isSubmitting || isAuthLoading} />
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
                      <Input type="password" placeholder="••••••••" {...field} disabled={isSubmitting || isAuthLoading} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
            <CardFooter className="flex flex-col space-y-3">
              <Button type="submit" className="w-full bg-accent hover:bg-accent/90" disabled={isSubmitting || isAuthLoading}>
                {isSubmitting || isAuthLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LogIn className="mr-2 h-4 w-4" />}
                Login
              </Button>
              {/* Add link to Sign Up page if you implement one later */}
              {/* <p className="text-xs text-center text-muted-foreground">
                Don't have an account? <Link href="/signup" className="underline hover:text-accent">Sign up</Link>
              </p> */}
            </CardFooter>
          </form>
        </Form>
      </Card>
    </div>
  );
}
