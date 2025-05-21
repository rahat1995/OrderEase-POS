
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import type { AppUser, UserRole } from '@/types';
import { listUsersForAdmin, updateUserProfileAdmin } from '@/app/actions/authActions';
import { useAuth } from '@/contexts/AuthContext'; // To ensure only admin can access

import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from '@/hooks/use-toast';
import { Loader2, Users, ShieldCheck, Edit } from 'lucide-react';
import { format } from 'date-fns';

const ROLES: UserRole[] = ['admin', 'cashier', 'viewer']; // Define available roles

export default function UserManagementPage() {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { refreshUserProfile } = useAuth(); // To refresh current user's role if they change their own

  const loadUsers = useCallback(async () => {
    setIsLoading(true);
    try {
      const fetchedUsers = await listUsersForAdmin();
      setUsers(fetchedUsers);
    } catch (error) {
      toast({ title: "Error loading users", description: (error as Error).message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const handleRoleChange = async (targetUid: string, newRole: UserRole) => {
    const originalUsers = [...users];
    // Optimistically update UI
    setUsers(prevUsers => prevUsers.map(u => u.uid === targetUid ? { ...u, role: newRole } : u));

    const result = await updateUserProfileAdmin(targetUid, { role: newRole });
    if (result.success) {
      toast({ title: "Role Updated", description: `User's role changed to ${newRole}.` });
      // If the current admin changed their own role, refresh their context
      const { firebaseUser } = auth; // Direct access to firebase auth instance
      if (firebaseUser && firebaseUser.uid === targetUid) {
        await refreshUserProfile();
      }
    } else {
      toast({ title: "Error Updating Role", description: result.error, variant: "destructive" });
      setUsers(originalUsers); // Revert optimistic update
    }
  };

  // Note: User creation (Firebase Auth user) is assumed to be done via Firebase Console.
  // This page only manages roles/details for existing Firebase Auth users via Firestore 'users' collection.

  return (
    <div className="container mx-auto p-4 md:p-6 lg:p-8">
      <CardHeader className="px-0 mb-6">
        <div className="flex items-center space-x-3">
          <Users className="h-8 w-8 text-accent" />
          <div>
            <CardTitle className="text-2xl md:text-3xl">User Management</CardTitle>
            <CardDescription>View users and manage their roles. User creation in Firebase Authentication is handled via Firebase Console.</CardDescription>
          </div>
        </div>
        {/* Add User Button - Deferred: Requires Firebase Admin SDK for password setting or a more complex flow */}
        {/* <Button onClick={() => {}} className="bg-accent hover:bg-accent/90">
          <PlusCircle className="mr-2 h-4 w-4" /> Add New User (Deferred)
        </Button> */}
      </CardHeader>

      <Card className="shadow-xl">
        <CardContent className={users.length === 0 ? "pt-6" : "p-0 md:p-2"}>
          {isLoading ? (
            <div className="flex justify-center items-center h-60">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <Users className="mx-auto h-16 w-16 mb-4" />
              <p className="text-lg font-medium">No users found.</p>
              <p className="text-sm">Create users in Firebase Authentication console first, then manage their roles here after they log in once.</p>
            </div>
          ) : (
            <ScrollArea className="h-[calc(100vh-350px)]">
              <Table>
                <TableHeader className="sticky top-0 bg-muted z-10">
                  <TableRow>
                    <TableHead>Display Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Mobile</TableHead>
                    <TableHead>Designation</TableHead>
                    <TableHead className="w-[180px]">Role</TableHead>
                    <TableHead>Created At</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.uid}>
                      <TableCell className="font-medium">{user.displayName || 'N/A'}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>{user.mobile || '-'}</TableCell>
                      <TableCell>{user.designation || '-'}</TableCell>
                      <TableCell>
                        <Select
                          value={user.role}
                          onValueChange={(newRole) => handleRoleChange(user.uid, newRole as UserRole)}
                        >
                          <SelectTrigger className="h-9 text-xs">
                            <SelectValue placeholder="Select role" />
                          </SelectTrigger>
                          <SelectContent>
                            {ROLES.map(role => (
                              <SelectItem key={role} value={role} className="capitalize">
                                {role.charAt(0).toUpperCase() + role.slice(1)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>{user.createdAt ? format(new Date(user.createdAt), 'MMM dd, yyyy') : '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
