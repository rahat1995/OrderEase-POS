
'use server';

import { db } from '@/lib/firebase';
import {
  collection,
  addDoc,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  query,
  where,
  Timestamp,
  orderBy,
} from 'firebase/firestore';
import type { LoyalCustomerDiscount, CreateLoyalCustomerDiscountInput } from '@/types';

function formatFirebaseError(e: unknown, defaultMessage: string): string {
  console.error("[Server Action] Raw error in formatFirebaseError:", e);
  if (e instanceof Error) {
    if (typeof e === 'object' && e !== null && 'code' in e && typeof (e as any).code === 'string' && 'message' in e && typeof (e as any).message === 'string') {
      return `Firebase Error (${(e as any).code}): ${(e as any).message}`;
    }
    return e.message;
  }
  if (typeof e === 'string') {
    return e;
  }
  return defaultMessage;
}

export async function addLoyalCustomerDiscountAction(
  data: CreateLoyalCustomerDiscountInput
): Promise<{ success: boolean; discount?: LoyalCustomerDiscount; error?: string }> {
  try {
    const trimmedMobileNumber = data.mobileNumber.trim();
    if (!trimmedMobileNumber) {
      return { success: false, error: 'Mobile number cannot be empty.' };
    }

    const discountsCol = collection(db, 'loyalCustomerDiscounts');
    const mobileQuery = query(discountsCol, where('mobileNumber', '==', trimmedMobileNumber));
    const querySnapshot = await getDocs(mobileQuery);

    if (!querySnapshot.empty) {
      return { success: false, error: `A discount for mobile number "${trimmedMobileNumber}" already exists.` };
    }

    const dataToSave: Omit<LoyalCustomerDiscount, 'id'> = {
      ...data,
      mobileNumber: trimmedMobileNumber,
      customerName: data.customerName?.trim() || undefined,
      discountValue: Number(data.discountValue) || 0,
      isActive: data.isActive !== undefined ? data.isActive : true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const docRef = await addDoc(collection(db, 'loyalCustomerDiscounts'), {
      ...dataToSave,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });

    const newDiscount: LoyalCustomerDiscount = {
      ...dataToSave,
      id: docRef.id,
    };
    return { success: true, discount: newDiscount };
  } catch (e) {
    const errorMessage = formatFirebaseError(e, 'An unknown error occurred while adding the loyal customer discount.');
    return { success: false, error: errorMessage };
  }
}

export async function fetchLoyalCustomerDiscountsAction(): Promise<LoyalCustomerDiscount[]> {
  try {
    const discountsCol = collection(db, 'loyalCustomerDiscounts');
    const q = query(discountsCol, orderBy('mobileNumber'));
    const querySnapshot = await getDocs(q);
    const discounts = querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: (data.createdAt as Timestamp).toDate().toISOString(),
        updatedAt: data.updatedAt ? (data.updatedAt as Timestamp).toDate().toISOString() : undefined,
      } as LoyalCustomerDiscount;
    });
    return discounts;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to fetch loyal customer discounts: ${error.message}`);
    }
    throw new Error('An unknown error occurred while fetching loyal customer discounts.');
  }
}

export async function updateLoyalCustomerDiscountAction(
  discountId: string,
  updates: Partial<Omit<LoyalCustomerDiscount, 'id' | 'createdAt' | 'updatedAt' | 'mobileNumber'>> & { mobileNumber?: string}
): Promise<{ success: boolean; error?: string }> {
  try {
    const discountDocRef = doc(db, 'loyalCustomerDiscounts', discountId);
    const updatesToSave: any = { ...updates };

    if (updates.discountValue !== undefined) {
      updatesToSave.discountValue = Number(updates.discountValue) || 0;
    }
    if (updates.customerName !== undefined) {
        updatesToSave.customerName = updates.customerName.trim() || undefined;
    }

    // If mobileNumber is being updated, check for uniqueness
    if (updates.mobileNumber && updates.mobileNumber.trim() !== '') {
        const trimmedMobile = updates.mobileNumber.trim();
        updatesToSave.mobileNumber = trimmedMobile;
        const q = query(collection(db, 'loyalCustomerDiscounts'), where('mobileNumber', '==', trimmedMobile));
        const snapshot = await getDocs(q);
        if (snapshot.docs.some(d => d.id !== discountId)) {
              return { success: false, error: `Mobile number "${trimmedMobile}" is already assigned to another loyal customer discount.` };
        }
    } else if (updates.hasOwnProperty('mobileNumber') && updates.mobileNumber?.trim() === ''){
        return { success: false, error: 'Mobile number cannot be empty.' };
    }


    updatesToSave.updatedAt = Timestamp.now();
    await updateDoc(discountDocRef, updatesToSave);
    return { success: true };
  } catch (e) {
    const errorMessage = formatFirebaseError(e, 'An unknown error occurred while updating the loyal customer discount.');
    return { success: false, error: errorMessage };
  }
}

export async function deleteLoyalCustomerDiscountAction(discountId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const discountDocRef = doc(db, 'loyalCustomerDiscounts', discountId);
    await deleteDoc(discountDocRef);
    return { success: true };
  } catch (e) {
    const errorMessage = formatFirebaseError(e, 'An unknown error occurred while deleting the loyal customer discount.');
    return { success: false, error: errorMessage };
  }
}

export async function fetchActiveLoyalCustomerDiscountByMobileAction(
  mobileNumber: string
): Promise<LoyalCustomerDiscount | null> {
  if (!mobileNumber || mobileNumber.trim() === '') {
    return null;
  }
  try {
    const discountsCol = collection(db, 'loyalCustomerDiscounts');
    const q = query(
      discountsCol,
      where('mobileNumber', '==', mobileNumber.trim()),
      where('isActive', '==', true)
    );
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      return null;
    }

    const docData = querySnapshot.docs[0].data();
    return {
      id: querySnapshot.docs[0].id,
      ...docData,
      createdAt: (docData.createdAt as Timestamp).toDate().toISOString(),
      updatedAt: docData.updatedAt ? (docData.updatedAt as Timestamp).toDate().toISOString() : undefined,
    } as LoyalCustomerDiscount;
  } catch (error) {
    console.error("Error fetching active loyal customer discount by mobile:", error);
    return null; // Or rethrow if you want to handle errors upstream
  }
}
