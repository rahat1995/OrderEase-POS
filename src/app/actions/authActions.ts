
"use server";

import { db } from '@/lib/firebase'; // Assuming auth is also exported if needed, but typically not for admin actions
import { collection, doc, getDoc, setDoc, getDocs, query, orderBy, Timestamp } from 'firebase/firestore';
import type { AppUser, UserRole, CreateAppUserInput, UpdateAppUserInput } from '@/types';

// This function is called client-side after Firebase Auth confirms a user.
// It ensures a corresponding user profile document exists in Firestore.
export async function ensureUserProfile(
  uid: string, 
  email: string, 
  displayName?: string
): Promise<{ success: boolean; user?: AppUser; error?: string;isNew?: boolean }> {
  try {
    const userDocRef = doc(db, 'users', uid);
    const userDocSnap = await getDoc(userDocRef);

    if (userDocSnap.exists()) {
      const existingUser = { uid, ...userDocSnap.data() } as AppUser;
      // Potentially update display name if it's changed in Firebase Auth and not set locally
      if (displayName && (!existingUser.displayName || existingUser.displayName !== displayName)) {
        await setDoc(userDocRef, { displayName }, { merge: true });
        existingUser.displayName = displayName;
      }
      return { success: true, user: existingUser, isNew: false };
    } else {
      // New user, create a profile with a default role (e.g., 'cashier')
      const newUserProfile: AppUser = {
        uid,
        email,
        displayName: displayName || email.split('@')[0] || 'New User', // Use part of email if no display name
        role: 'cashier', // Default role for new users
        createdAt: new Date().toISOString(),
      };
      await setDoc(userDocRef, {
          ...newUserProfile,
          createdAt: Timestamp.fromDate(new Date(newUserProfile.createdAt)) // Store as Firestore Timestamp
      });
      return { success: true, user: newUserProfile, isNew: true };
    }
  } catch (e) {
    console.error("[Server Action] ensureUserProfile: Error", e);
    const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred while ensuring user profile.';
    return { success: false, error: errorMessage, isNew: false };
  }
}

// Client-side callable wrapper
export async function ensureUserProfileClient(uid: string, email: string, displayName?: string) {
    return ensureUserProfile(uid, email, displayName);
}


export async function getUserProfile(uid: string): Promise<AppUser | null> {
  try {
    const userDocRef = doc(db, 'users', uid);
    const userDocSnap = await getDoc(userDocRef);

    if (userDocSnap.exists()) {
      const data = userDocSnap.data();
      return {
        uid,
        email: data.email,
        displayName: data.displayName,
        mobile: data.mobile,
        designation: data.designation,
        role: data.role as UserRole,
        createdAt: (data.createdAt as Timestamp).toDate().toISOString(),
        updatedAt: data.updatedAt ? (data.updatedAt as Timestamp).toDate().toISOString() : undefined,
      };
    }
    return null;
  } catch (e) {
    console.error("[Server Action] getUserProfile: Error fetching profile for UID", uid, e);
    return null; // Or rethrow / return error object
  }
}
// Client-side callable wrapper
export async function getUserProfileClient(uid: string) {
    return getUserProfile(uid);
}


// Admin Action: List all users from Firestore 'users' collection
export async function listUsersForAdmin(): Promise<AppUser[]> {
  // TODO: Add admin role check here before proceeding
  try {
    const usersCol = collection(db, 'users');
    const q = query(usersCol, orderBy('displayName')); // Order by name for display
    const querySnapshot = await getDocs(q);
    const users = querySnapshot.docs.map(docSnap => {
      const data = docSnap.data();
      return {
        uid: docSnap.id,
        email: data.email,
        displayName: data.displayName,
        mobile: data.mobile,
        designation: data.designation,
        role: data.role as UserRole,
        createdAt: (data.createdAt as Timestamp).toDate().toISOString(),
        updatedAt: data.updatedAt ? (data.updatedAt as Timestamp).toDate().toISOString() : undefined,
      } as AppUser;
    });
    return users;
  } catch (e) {
    console.error("[Server Action] listUsersForAdmin: Error", e);
    return [];
  }
}

// Admin Action: Update a user's role (and potentially other details)
export async function updateUserProfileAdmin(
  targetUid: string, 
  updates: UpdateAppUserInput
): Promise<{ success: boolean; error?: string }> {
  // TODO: Add admin role check here for the *calling* user
  if (!targetUid) {
    return { success: false, error: "Target User ID is required." };
  }
  try {
    const userDocRef = doc(db, 'users', targetUid);
    const dataToUpdate: Partial<AppUser> & {updatedAt: Timestamp} = {
        ...updates,
        updatedAt: Timestamp.now(),
    };
    
    // Prevent changing email via this method if it's part of updates, UID should be fixed
    if ('email' in dataToUpdate) delete (dataToUpdate as any).email;
    if ('uid' in dataToUpdate) delete (dataToUpdate as any).uid;


    await setDoc(userDocRef, dataToUpdate, { merge: true });
    return { success: true };
  } catch (e) {
    console.error("[Server Action] updateUserRoleAdmin: Error for UID", targetUid, e);
    const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred while updating user role.';
    return { success: false, error: errorMessage };
  }
}

// Note: Creating Firebase Authentication users (email/password) from server actions
// typically requires the Firebase Admin SDK. This setup currently assumes Firebase Auth
// users are created via the Firebase Console or a client-side sign-up flow (not yet built).
// The ensureUserProfile action creates/updates the Firestore profile linked to an Auth UID.

