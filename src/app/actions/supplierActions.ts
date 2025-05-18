
'use server';

import { db } from '@/lib/firebase';
import { collection, addDoc, getDocs, query, orderBy, where } from 'firebase/firestore';
import type { Supplier, CreateSupplierInput } from '@/types';

export async function addSupplierAction(supplierData: CreateSupplierInput): Promise<{ success: boolean; supplier?: Supplier; error?: string }> {
  try {
    const trimmedName = supplierData.name.trim();
    if (!trimmedName) {
      return { success: false, error: "Supplier name cannot be empty." };
    }

    // Case-insensitive check for existing supplier name
    const suppliersCol = collection(db, 'suppliers');
    const nameQuery = query(suppliersCol, where('nameLower', '==', trimmedName.toLowerCase()));
    const nameQuerySnapshot = await getDocs(nameQuery);

    if (!nameQuerySnapshot.empty) {
      return { success: false, error: `Supplier "${trimmedName}" already exists.` };
    }
    
    const dataToSave: CreateSupplierInput & { nameLower: string } = {
      ...supplierData,
      name: trimmedName,
      nameLower: trimmedName.toLowerCase(), // For case-insensitive querying/uniqueness
      address: supplierData.address?.trim() || undefined,
      mobile: supplierData.mobile?.trim() || undefined,
      contactPerson: supplierData.contactPerson?.trim() || undefined,
      email: supplierData.email?.trim() || undefined,
    };

    const docRef = await addDoc(collection(db, 'suppliers'), dataToSave);
    const newSupplier: Supplier = { 
        id: docRef.id, 
        name: dataToSave.name,
        address: dataToSave.address,
        mobile: dataToSave.mobile,
        contactPerson: dataToSave.contactPerson,
        email: dataToSave.email,
    };
    return { success: true, supplier: newSupplier };
  } catch (e) {
    console.error('Error adding supplier: ', e);
    return { success: false, error: e instanceof Error ? e.message : 'An unknown error occurred' };
  }
}

export async function fetchSuppliersAction(): Promise<Supplier[]> {
  try {
    const suppliersCol = collection(db, 'suppliers');
    const q = query(suppliersCol, orderBy('name')); // Order by original name for display
    const querySnapshot = await getDocs(q);
    const suppliers = querySnapshot.docs.map(doc => {
      const data = doc.data();
      // Explicitly map to Supplier type, excluding nameLower
      return {
        id: doc.id,
        name: data.name,
        address: data.address,
        mobile: data.mobile,
        contactPerson: data.contactPerson,
        email: data.email,
      } as Supplier;
    });
    return suppliers;
  } catch (error) {
    console.error("Error fetching suppliers: ", error);
    return [];
  }
}
