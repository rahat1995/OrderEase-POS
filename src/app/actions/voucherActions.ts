
'use server';

import { db } from '@/lib/firebase';
import { collection, addDoc, getDocs, doc, updateDoc, deleteDoc, query, where, Timestamp, runTransaction, increment } from 'firebase/firestore';
import type { Voucher, CreateVoucherInput } from '@/types';
import { parseISO, isWithinInterval, startOfDay, endOfDay } from 'date-fns';

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

export async function addVoucherAction(voucherData: CreateVoucherInput): Promise<{ success: boolean; voucher?: Voucher; error?: string }> {
  console.log('[Server Action] addVoucherAction: Entered with data:', JSON.stringify(voucherData, null, 2));
  try {
    const trimmedCode = voucherData.code.trim();
    if (!trimmedCode) {
      return { success: false, error: "Voucher code cannot be empty." };
    }
    const codeLower = trimmedCode.toLowerCase();

    const vouchersCol = collection(db, 'vouchers');
    const codeQuery = query(vouchersCol, where('codeLower', '==', codeLower));
    const querySnapshot = await getDocs(codeQuery);

    if (!querySnapshot.empty) {
      return { success: false, error: `Voucher code "${trimmedCode}" already exists.` };
    }
    
    const dataToSave: Omit<Voucher, 'id'> = {
      ...voucherData,
      code: trimmedCode,
      codeLower,
      discountValue: Number(voucherData.discountValue) || 0,
      minOrderAmount: voucherData.minOrderAmount ? Number(voucherData.minOrderAmount) : undefined,
      validFrom: voucherData.validFrom ? voucherData.validFrom : undefined,
      validUntil: voucherData.validUntil ? voucherData.validUntil : undefined,
      usageLimit: voucherData.usageLimit ? Number(voucherData.usageLimit) : undefined,
      timesUsed: 0,
      isActive: voucherData.isActive !== undefined ? voucherData.isActive : true,
      createdAt: new Date().toISOString(),
    };
    console.log('[Server Action] addVoucherAction: Data prepared for Firestore:', JSON.stringify(dataToSave, null, 2));
    
    const docRef = await addDoc(collection(db, 'vouchers'), {
        ...dataToSave,
        validFrom: dataToSave.validFrom ? Timestamp.fromDate(parseISO(dataToSave.validFrom)) : null,
        validUntil: dataToSave.validUntil ? Timestamp.fromDate(parseISO(dataToSave.validUntil)) : null,
        createdAt: Timestamp.now(),
    });

    const newVoucher: Voucher = { 
      ...dataToSave, 
      id: docRef.id,
      // Ensure dates are ISO strings for the returned object if they exist
      validFrom: voucherData.validFrom, 
      validUntil: voucherData.validUntil,
    };
    console.log('[Server Action] addVoucherAction: Success! Voucher added with ID:', docRef.id);
    return { success: true, voucher: newVoucher };
  } catch (e) {
    console.error('[Server Action] addVoucherAction: Error caught!', e);
    const errorMessage = formatFirebaseError(e, 'An unknown error occurred while adding the voucher.');
    return { success: false, error: errorMessage };
  }
}

export async function fetchVouchersAction(): Promise<Voucher[]> {
  console.log('[Server Action] fetchVouchersAction: Entered');
  try {
    const vouchersCol = collection(db, 'vouchers');
    const q = query(vouchersCol, where('isActive', '==', true), where('validUntil', '>=', Timestamp.now())); // Example: Fetch active and not yet expired
    // For admin, you might want to fetch all, including inactive/expired, or provide filters
    const adminQuery = query(collection(db, 'vouchers'), orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(adminQuery);
    const vouchers = querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        validFrom: data.validFrom ? (data.validFrom as Timestamp).toDate().toISOString() : undefined,
        validUntil: data.validUntil ? (data.validUntil as Timestamp).toDate().toISOString() : undefined,
        createdAt: (data.createdAt as Timestamp).toDate().toISOString(),
      } as Voucher;
    });
    console.log(`[Server Action] fetchVouchersAction: Success! Fetched ${vouchers.length} vouchers.`);
    return vouchers;
  } catch (error) {
    console.error("[Server Action] fetchVouchersAction: Error caught!", error);
    throw error;
  }
}

export async function updateVoucherAction(voucherId: string, updates: Partial<Omit<Voucher, 'id' | 'codeLower' | 'timesUsed' | 'createdAt'>>): Promise<{ success: boolean; error?: string }> {
  console.log(`[Server Action] updateVoucherAction: Entered for voucherId: ${voucherId} with updates:`, JSON.stringify(updates, null, 2));
  try {
    const voucherDocRef = doc(db, 'vouchers', voucherId);
    const updatesToSave: any = { ...updates };

    if (updates.discountValue !== undefined) updatesToSave.discountValue = Number(updates.discountValue) || 0;
    if (updates.minOrderAmount !== undefined) updatesToSave.minOrderAmount = Number(updates.minOrderAmount) || undefined;
    if (updates.usageLimit !== undefined) updatesToSave.usageLimit = Number(updates.usageLimit) || undefined;
    
    if (updates.validFrom) updatesToSave.validFrom = Timestamp.fromDate(parseISO(updates.validFrom));
    else if (updates.validFrom === null) updatesToSave.validFrom = null;

    if (updates.validUntil) updatesToSave.validUntil = Timestamp.fromDate(parseISO(updates.validUntil));
    else if (updates.validUntil === null) updatesToSave.validUntil = null;
    
    if (updates.code) {
        const trimmedCode = updates.code.trim();
        if (!trimmedCode) return { success: false, error: "Voucher code cannot be empty." };
        updatesToSave.code = trimmedCode;
        updatesToSave.codeLower = trimmedCode.toLowerCase();
        // Check for uniqueness if code is changed
        if (updatesToSave.codeLower) {
            const q = query(collection(db, 'vouchers'), where('codeLower', '==', updatesToSave.codeLower));
            const snapshot = await getDocs(q);
            if (snapshot.docs.some(d => d.id !== voucherId)) {
                 return { success: false, error: `Voucher code "${trimmedCode}" already exists.` };
            }
        }
    }


    await updateDoc(voucherDocRef, updatesToSave);
    console.log('[Server Action] updateVoucherAction: Success! Voucher updated:', voucherId);
    return { success: true };
  } catch (e) {
    console.error(`[Server Action] updateVoucherAction: Error caught for voucherId ${voucherId}!`, e);
    const errorMessage = formatFirebaseError(e, 'An unknown error occurred while updating the voucher.');
    return { success: false, error: errorMessage };
  }
}

export async function deleteVoucherAction(voucherId: string): Promise<{ success: boolean; error?: string }> {
    console.log(`[Server Action] deleteVoucherAction: Entered for voucherId: ${voucherId}`);
    try {
        const voucherDocRef = doc(db, 'vouchers', voucherId);
        await deleteDoc(voucherDocRef);
        console.log('[Server Action] deleteVoucherAction: Success! Voucher deleted:', voucherId);
        return { success: true };
    } catch (e) {
        console.error(`[Server Action] deleteVoucherAction: Error caught for voucherId ${voucherId}!`, e);
        const errorMessage = formatFirebaseError(e, 'An unknown error occurred while deleting the voucher.');
        return { success: false, error: errorMessage };
    }
}


export async function validateVoucherAction(
  code: string,
  orderSubtotal: number
): Promise<{ success: boolean; voucher?: Voucher; error?: string }> {
  console.log(`[Server Action] validateVoucherAction: Code "${code}", Subtotal: ${orderSubtotal}`);
  const trimmedCode = code.trim();
  if (!trimmedCode) {
    return { success: false, error: "Please enter a voucher code." };
  }
  const codeLower = trimmedCode.toLowerCase();

  try {
    const vouchersCol = collection(db, 'vouchers');
    const q = query(vouchersCol, where('codeLower', '==', codeLower));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      return { success: false, error: "Invalid voucher code." };
    }

    const voucherDoc = querySnapshot.docs[0];
    const voucherData = voucherDoc.data();
    const voucher: Voucher = {
      id: voucherDoc.id,
      ...voucherData,
      validFrom: voucherData.validFrom ? (voucherData.validFrom as Timestamp).toDate().toISOString() : undefined,
      validUntil: voucherData.validUntil ? (voucherData.validUntil as Timestamp).toDate().toISOString() : undefined,
      createdAt: (voucherData.createdAt as Timestamp).toDate().toISOString(),
    } as Voucher;

    if (!voucher.isActive) {
      return { success: false, error: "This voucher is currently inactive." };
    }

    const now = new Date();
    if (voucher.validFrom && now < startOfDay(parseISO(voucher.validFrom))) {
      return { success: false, error: `This voucher is not active until ${format(parseISO(voucher.validFrom), "MMM dd, yyyy")}.` };
    }
    if (voucher.validUntil && now > endOfDay(parseISO(voucher.validUntil))) {
      return { success: false, error: "This voucher has expired." };
    }

    if (voucher.minOrderAmount && orderSubtotal < voucher.minOrderAmount) {
      return { success: false, error: `Minimum order amount of $${voucher.minOrderAmount.toFixed(2)} not met.` };
    }

    if (voucher.usageLimit && voucher.timesUsed >= voucher.usageLimit) {
      return { success: false, error: "This voucher has reached its usage limit." };
    }
    
    console.log('[Server Action] validateVoucherAction: Voucher valid:', voucher);
    return { success: true, voucher };

  } catch (e) {
    console.error('[Server Action] validateVoucherAction: Error caught!', e);
    const errorMessage = formatFirebaseError(e, 'An unknown error occurred while validating the voucher.');
    return { success: false, error: errorMessage };
  }
}

export async function incrementVoucherUsageAction(voucherId: string): Promise<{ success: boolean; error?: string }> {
    console.log(`[Server Action] incrementVoucherUsageAction: Incrementing usage for voucherId: ${voucherId}`);
    try {
        const voucherDocRef = doc(db, 'vouchers', voucherId);
        await updateDoc(voucherDocRef, {
            timesUsed: increment(1)
        });
        console.log('[Server Action] incrementVoucherUsageAction: Success! Usage incremented for voucher:', voucherId);
        return { success: true };
    } catch (e) {
        console.error(`[Server Action] incrementVoucherUsageAction: Error caught for voucherId ${voucherId}!`, e);
        const errorMessage = formatFirebaseError(e, 'An unknown error occurred while incrementing voucher usage.');
        return { success: false, error: errorMessage };
    }
}
