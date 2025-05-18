
'use server';

import { db } from '@/lib/firebase';
import { collection, addDoc, getDocs, query, orderBy, Timestamp, where } from 'firebase/firestore';
import type { CostCategory, CreateCostCategoryInput, CostEntry, CreateCostEntryInput } from '@/types';

// Cost Category Actions
export async function addCostCategoryAction(categoryData: CreateCostCategoryInput): Promise<{ success: boolean; category?: CostCategory; error?: string }> {
  try {
    // Check if category with the same name already exists (case-sensitive)
    const categoriesCol = collection(db, 'costCategories');
    const q = query(categoriesCol, where('name', '==', categoryData.name.trim()));
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
      return { success: false, error: `Category "${categoryData.name}" already exists.` };
    }

    const docRef = await addDoc(collection(db, 'costCategories'), { name: categoryData.name.trim() });
    const newCategory: CostCategory = { name: categoryData.name.trim(), id: docRef.id };
    return { success: true, category: newCategory };
  } catch (e) {
    console.error('Error adding cost category: ', e);
    return { success: false, error: e instanceof Error ? e.message : 'An unknown error occurred' };
  }
}

export async function fetchCostCategoriesAction(): Promise<CostCategory[]> {
  try {
    const categoriesCol = collection(db, 'costCategories');
    const q = query(categoriesCol, orderBy('name'));
    const querySnapshot = await getDocs(q);
    const categories = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    } as CostCategory));
    return categories;
  } catch (error) {
    console.error("Error fetching cost categories: ", error);
    return [];
  }
}

// Cost Entry Actions
export async function addCostEntryAction(entryData: CreateCostEntryInput): Promise<{ success: boolean; entry?: CostEntry; error?: string }> {
  try {
    const dataToSave = {
      ...entryData,
      amount: Number(entryData.amount) || 0,
      date: Timestamp.fromDate(new Date(entryData.date)), // Convert ISO string to Timestamp
    };
    const docRef = await addDoc(collection(db, 'costEntries'), dataToSave);
    const newEntry: CostEntry = { ...dataToSave, id: docRef.id, date: entryData.date }; // Return with ISO date for client
    return { success: true, entry: newEntry };
  } catch (e) {
    console.error('Error adding cost entry: ', e);
    return { success: false, error: e instanceof Error ? e.message : 'An unknown error occurred' };
  }
}

export async function fetchCostEntriesAction(startDate?: string, endDate?: string): Promise<CostEntry[]> {
  try {
    const entriesCol = collection(db, 'costEntries');
    let q = query(entriesCol, orderBy('date', 'desc'));

    if (startDate) {
      q = query(q, where('date', '>=', Timestamp.fromDate(new Date(startDate))));
    }
    if (endDate) {
      const endOfDay = new Date(endDate);
      endOfDay.setHours(23, 59, 59, 999); // Ensure end of day is included
      q = query(q, where('date', '<=', Timestamp.fromDate(endOfDay)));
    }

    const querySnapshot = await getDocs(q);
    const entries = querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        date: (data.date as Timestamp).toDate().toISOString(), // Convert Timestamp to ISO string
      } as CostEntry;
    });
    return entries;
  } catch (error) {
    console.error("Error fetching cost entries: ", error);
    if (error instanceof Error) {
      throw new Error(`Failed to fetch cost entries: ${error.message}`);
    }
    throw new Error("An unknown error occurred while fetching cost entries.");
  }
}
