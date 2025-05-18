
'use server';

import { db } from '@/lib/firebase';
import { collection, addDoc, getDocs, query, orderBy, Timestamp, where, writeBatch, doc } from 'firebase/firestore';
import type { 
  CostCategory, CreateCostCategoryInput, 
  CostEntry, CreateCostEntryInput,
  PurchaseItem, CreatePurchaseItemInput,
  PurchaseBill, CreatePurchaseBillInput
} from '@/types';
import { v4 as uuidv4 } from 'uuid'; // For generating unique IDs for batched entries

// Cost Category Actions
export async function addCostCategoryAction(categoryData: CreateCostCategoryInput): Promise<{ success: boolean; category?: CostCategory; error?: string }> {
  try {
    const trimmedName = categoryData.name.trim();
    // Case-insensitive check for existing category
    const categoriesCol = collection(db, 'costCategories');
    const querySnapshot = await getDocs(categoriesCol);
    const existingCategory = querySnapshot.docs.find(
      doc => doc.data().name.toLowerCase() === trimmedName.toLowerCase()
    );

    if (existingCategory) {
      return { success: false, error: `Category "${trimmedName}" already exists.` };
    }

    const docRef = await addDoc(collection(db, 'costCategories'), { name: trimmedName });
    const newCategory: CostCategory = { name: trimmedName, id: docRef.id };
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

// Purchase Item Actions
export async function addPurchaseItemAction(itemData: CreatePurchaseItemInput): Promise<{ success: boolean; item?: PurchaseItem; error?: string }> {
  try {
    const trimmedName = itemData.name.trim();
    // Case-insensitive check for existing item within the same category
    const itemsCol = collection(db, 'purchaseItems');
    const q = query(itemsCol, where('categoryId', '==', itemData.categoryId), where('name', '==', trimmedName)); // Exact match for now, can be improved
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
       const existing = querySnapshot.docs.find(doc => doc.data().name.toLowerCase() === trimmedName.toLowerCase());
       if (existing) {
        return { success: false, error: `Purchase item "${trimmedName}" already exists in category "${itemData.categoryName}".` };
       }
    }
    
    const docRef = await addDoc(collection(db, 'purchaseItems'), { 
      name: trimmedName, 
      categoryId: itemData.categoryId,
      categoryName: itemData.categoryName 
    });
    const newItem: PurchaseItem = { ...itemData, name: trimmedName, id: docRef.id };
    return { success: true, item: newItem };
  } catch (e) {
    console.error('Error adding purchase item: ', e);
    return { success: false, error: e instanceof Error ? e.message : 'An unknown error occurred' };
  }
}

export async function fetchPurchaseItemsAction(categoryId?: string): Promise<PurchaseItem[]> {
  try {
    const itemsCol = collection(db, 'purchaseItems');
    let q = query(itemsCol, orderBy('categoryName'), orderBy('name'));
    if (categoryId) {
      q = query(itemsCol, where('categoryId', '==', categoryId), orderBy('name'));
    }
    const querySnapshot = await getDocs(q);
    const items = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    } as PurchaseItem));
    return items;
  } catch (error) {
    console.error("Error fetching purchase items: ", error);
    return [];
  }
}


// Purchase Bill and associated Cost Entries Action
export async function addPurchaseBillWithEntriesAction(
  billData: Omit<CreatePurchaseBillInput, 'items'>, // Bill details without items
  items: Array<Omit<CreateCostEntryInput, 'date' | 'purchaseBillId' | 'categoryName' | 'categoryId' > & { categoryId: string, categoryName: string }> // Items to become cost entries
): Promise<{ success: boolean; purchaseBill?: PurchaseBill; costEntries?: CostEntry[], error?: string }> {
  const batch = writeBatch(db);

  try {
    // 1. Create the PurchaseBill document
    const billDateTimestamp = Timestamp.fromDate(new Date(billData.billDate));
    const totalAmount = items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
    
    const purchaseBillRef = doc(collection(db, 'purchaseBills'));
    const newPurchaseBill: Omit<PurchaseBill, 'id'> = {
      ...billData,
      billDate: billData.billDate, // Keep as ISO string for the object, Firestore stores Timestamp
      totalAmount,
      createdAt: new Date().toISOString(),
    };
    batch.set(purchaseBillRef, { ...newPurchaseBill, billDate: billDateTimestamp, createdAt: Timestamp.now() });

    // 2. Create CostEntry documents for each item
    const createdCostEntries: CostEntry[] = [];
    for (const item of items) {
      const costEntryRef = doc(collection(db, 'costEntries'));
      const costEntryData: CreateCostEntryInput = {
        purchaseBillId: purchaseBillRef.id,
        purchaseItemId: item.purchaseItemId,
        purchaseItemName: item.purchaseItemName,
        categoryId: item.categoryId, 
        categoryName: item.categoryName,
        amount: Number(item.amount) || 0,
        date: billData.billDate, // Use bill date for all entries
      };
      batch.set(costEntryRef, { ...costEntryData, date: billDateTimestamp });
      createdCostEntries.push({ ...costEntryData, id: costEntryRef.id });
    }

    await batch.commit();

    const persistedBill: PurchaseBill = { ...newPurchaseBill, id: purchaseBillRef.id };
    return { success: true, purchaseBill: persistedBill, costEntries: createdCostEntries };

  } catch (e) {
    console.error('Error adding purchase bill and entries: ', e);
    return { success: false, error: e instanceof Error ? e.message : 'An unknown error occurred' };
  }
}


// Cost Entry Actions (Fetch only, add is handled by addPurchaseBillWithEntriesAction)
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
