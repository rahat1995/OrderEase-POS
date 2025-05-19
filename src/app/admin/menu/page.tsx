
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import type { MenuItem, CreateMenuItemInput } from '@/types';
import { addMenuItemAction, fetchMenuItemsAction, updateMenuItemAction, deleteMenuItemAction } from '@/app/actions/menuActions';
import { deleteImageAction } from '@/app/actions/storageActions';
import MenuItemForm from '@/components/admin/MenuItemForm';

import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription as ShadcnDialogDescription,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { Card as PageCard, CardContent as PageCardContent, CardDescription as PageCardDescription, CardHeader as PageCardHeader, CardTitle as PageCardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from '@/hooks/use-toast';
import { PlusCircle, Edit3, Trash2, Loader2, ListPlus, AlertTriangle, ImageOff } from 'lucide-react';

export default function MenuManagementPage() {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogSubmitting, setIsDialogSubmitting] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [itemToDelete, setItemToDelete] = useState<MenuItem | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const loadMenuItems = useCallback(async () => {
    setIsLoading(true);
    try {
      const items = await fetchMenuItemsAction();
      setMenuItems(items);
      if (items.length === 0 && !isLoading) {
         toast({
          title: "Menu Information",
          description: "No menu items found in the database. Click 'Add New Item' to start.",
          variant: "default",
          duration: 5000,
        });
      }
    } catch (error) {
      console.error("Failed to load menu items on Admin page:", error);
      let description = "Could not fetch menu items. Please try again later.";
      if (error instanceof Error) {
        description = error.message;
         if ((error as any).code === 'permission-denied' || (error as any).code === 'PERMISSION_DENIED') {
          description = "Permission denied when fetching menu items. Please check your Firebase security rules for the 'menuItems' collection to allow reads.";
        }
      }
      toast({ title: "Error loading menu items", description, variant: "destructive", duration: 10000 });
      setMenuItems([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMenuItems();
  }, [loadMenuItems]);

  const handleFormSubmit = async (data: CreateMenuItemInput) => {
    setIsDialogSubmitting(true);
    let rawResultFromAction: any; 
    try {
      console.log("Submitting data to server action:", data);

      if (editingItem && editingItem.id) {
        console.log("Attempting to update item ID:", editingItem.id);
        rawResultFromAction = await updateMenuItemAction(editingItem.id, data);
        console.log("Raw result from updateMenuItemAction:", rawResultFromAction);

        if (rawResultFromAction && typeof rawResultFromAction.success === 'boolean') {
          if (rawResultFromAction.success) {
            toast({ title: "Success", description: "Menu item updated." });
          } else {
            console.error("updateMenuItemAction reported failure. Result:", rawResultFromAction);
            throw new Error(rawResultFromAction.error || "Menu item update failed. Server action indicated failure but provided no specific error message.");
          }
        } else {
          console.error("UNEXPECTED SERVER RESPONSE STRUCTURE for update. The 'rawResultFromAction' was:", rawResultFromAction);
          throw new Error("Failed to update menu item. Received an unexpected response structure from the server.");
        }
      } else {
        console.log("Attempting to add new item.");
        rawResultFromAction = await addMenuItemAction(data);
        console.log("Raw result from addMenuItemAction:", rawResultFromAction);

        if (rawResultFromAction && typeof rawResultFromAction.success === 'boolean') {
          if (rawResultFromAction.success && rawResultFromAction.menuItem) {
            toast({ title: "Success", description: "New menu item added." });
          } else {
            console.error("addMenuItemAction reported failure or missing menuItem. Result:", rawResultFromAction);
            throw new Error(rawResultFromAction.error || "Menu item addition failed. Server action indicated failure, no specific error, or did not return item.");
          }
        } else {
          console.error("UNEXPECTED SERVER RESPONSE STRUCTURE for add. The 'rawResultFromAction' was:", rawResultFromAction);
          throw new Error("Failed to add menu item. Received an unexpected response structure from the server.");
        }
      }
      await loadMenuItems();
      setIsFormOpen(false);
      setEditingItem(null);
    } catch (error: unknown) {
      console.error("Error in handleFormSubmit. The error object caught was:", error);
      if (rawResultFromAction !== undefined) { 
         console.error("Raw result from action (at time of error):", rawResultFromAction);
      }

      let descriptionMessage = "An unexpected error occurred. Please check the console for more details.";
      if (error instanceof Error && error.message) {
        descriptionMessage = error.message;
      }
      
      if (String(descriptionMessage).toLowerCase().includes("failed to fetch") || 
          String(descriptionMessage).toLowerCase().includes("networkerror") ||
          String(descriptionMessage).toLowerCase().includes("server is unreachable")) {
        descriptionMessage = "A network error occurred or the server is unreachable. Please check your internet connection and try again. If the problem persists, check server logs.";
      } else if (String(descriptionMessage).toLowerCase().includes("unexpected response structure")) {
        // This is our custom message from above, keep it as is.
      } else if (error instanceof TypeError && (String(error.message).includes("is undefined") || String(error.message).includes("is not an object"))) {
        descriptionMessage = "An internal error occurred while processing the server's response, possibly due to unexpected data format. Please check console logs for details about the raw server response.";
      }

      toast({
        title: "Menu Item Error",
        description: descriptionMessage,
        variant: "destructive",
        duration: 7000,
      });
    } finally {
      setIsDialogSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!itemToDelete || !itemToDelete.id) return;
    setIsDialogSubmitting(true);
    let rawDeleteResult: any;
    try {
      if (itemToDelete.imageUrl && itemToDelete.imageUrl.includes('firebasestorage.googleapis.com')) {
        const imageDeleteResult = await deleteImageAction(itemToDelete.imageUrl);
        if (!imageDeleteResult.success) {
          toast({
            title: "Image Deletion Warning",
            description: `Could not delete image from storage: ${imageDeleteResult.error}. The menu item will still be deleted.`,
            variant: "destructive",
            duration: 7000,
          });
        }
      }

      rawDeleteResult = await deleteMenuItemAction(itemToDelete.id);
      console.log("Raw result from deleteMenuItemAction:", rawDeleteResult);

      if (rawDeleteResult && typeof rawDeleteResult.success === 'boolean') {
        if (rawDeleteResult.success) {
          toast({ title: "Success", description: `Menu item "${itemToDelete.name}" deleted.` });
          await loadMenuItems();
        } else {
          throw new Error(rawDeleteResult.error || "Failed to delete menu item. Server reported failure.");
        }
      } else {
        console.error("UNEXPECTED SERVER RESPONSE STRUCTURE for delete. The 'rawDeleteResult' was:", rawDeleteResult);
        throw new Error("Failed to delete menu item. Received an unexpected response structure from the server.");
      }
    } catch (error: unknown) {
      console.error("Error deleting menu item. The error object was:", error);
      if (rawDeleteResult !== undefined) {
        console.error("Raw result from delete action (at time of error):", rawDeleteResult);
      }
      let descriptionMessage = "An unexpected error occurred while deleting the menu item. Check console for details.";
      if (error instanceof Error && error.message) {
        descriptionMessage = error.message;
      }
      toast({ title: "Error Deleting Item", description: descriptionMessage, variant: "destructive" });
    } finally {
      setIsDialogSubmitting(false);
      setIsDeleteDialogOpen(false);
      setItemToDelete(null);
    }
  };

  const openEditForm = (item: MenuItem) => {
    setEditingItem(item);
    setIsFormOpen(true);
  };

  const openNewForm = () => {
    setEditingItem(null);
    setIsFormOpen(true);
  };

  const openDeleteDialog = (item: MenuItem) => {
    setItemToDelete(item);
    setIsDeleteDialogOpen(true);
  };

  if (isLoading && menuItems.length === 0) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-120px)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-6 lg:p-8">
      <PageCardHeader className="flex flex-row items-center justify-between mb-6 -mx-2 md:-mx-0">
        <div className="flex items-center space-x-3">
          <ListPlus className="h-8 w-8 text-accent" />
          <div>
            <PageCardTitle className="text-2xl md:text-3xl">Menu Management</PageCardTitle>
            <PageCardDescription>Add, edit, or delete menu items. Images are uploaded to Firebase Storage.</PageCardDescription>
          </div>
        </div>
        <Dialog open={isFormOpen} onOpenChange={(isOpen) => {
            setIsFormOpen(isOpen);
            if (!isOpen) setEditingItem(null);
          }}>
          <DialogTrigger asChild>
            <Button onClick={openNewForm} className="bg-accent hover:bg-accent/90">
              <PlusCircle className="mr-2 h-4 w-4" /> Add New Item
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingItem ? 'Edit Menu Item' : 'Add New Menu Item'}</DialogTitle>
              <ShadcnDialogDescription>
                {editingItem ? 'Update the details for this menu item.' : 'Fill in the form to add a new item to the menu.'}
              </ShadcnDialogDescription>
            </DialogHeader>
            <MenuItemForm
              key={editingItem ? editingItem.id : 'new'}
              initialData={editingItem}
              onSubmit={handleFormSubmit}
              isSubmitting={isDialogSubmitting}
              onCancel={() => { setIsFormOpen(false); setEditingItem(null);}}
            />
          </DialogContent>
        </Dialog>
      </PageCardHeader>
      <PageCard className="shadow-xl">
        <PageCardContent className={menuItems.length === 0 ? "pt-6" : ""}>
          {isLoading && menuItems.length > 0 && <div className="text-center py-4"><Loader2 className="h-6 w-6 animate-spin text-primary mx-auto" /> Refreshing...</div>}
          {!isLoading && menuItems.length === 0 ? (
             <div className="text-center py-10 text-muted-foreground">
                <ImageOff className="mx-auto h-16 w-16 mb-4" />
                <p className="text-lg font-medium">No menu items found.</p>
                <p className="text-sm">Click "Add New Item" to get started!</p>
            </div>
          ) : (
            <ScrollArea className="h-[calc(100vh-350px)]">
              <Table>
                <TableHeader className="sticky top-0 bg-muted z-10">
                  <TableRow>
                    <TableHead className="w-[80px]">Image</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead className="text-right">Price</TableHead>
                    <TableHead className="w-[150px] text-center">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {menuItems.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <img
                          src={item.imageUrl || 'https://placehold.co/60x60.png?text=No+Image'}
                          alt={item.name}
                          className="w-12 h-12 object-cover rounded-md bg-muted"
                          data-ai-hint={item.dataAiHint || "food item"}
                          onError={(e) => (e.currentTarget.src = 'https://placehold.co/60x60.png?text=Error')}
                        />
                      </TableCell>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell className="text-right">${item.price.toFixed(2)}</TableCell>
                      <TableCell className="text-center space-x-1">
                        <Button variant="ghost" size="icon" onClick={() => openEditForm(item)} aria-label="Edit item" disabled={isDialogSubmitting}>
                          <Edit3 className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => openDeleteDialog(item)} className="text-destructive hover:text-destructive/80" aria-label="Delete item" disabled={isDialogSubmitting}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
        </PageCardContent>
      </PageCard>

      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center"><AlertTriangle className="mr-2 h-5 w-5 text-destructive"/>Confirm Deletion</DialogTitle>
            <ShadcnDialogDescription>
              This action cannot be undone and will permanently delete the menu item {itemToDelete?.imageUrl && itemToDelete.imageUrl.includes('firebasestorage.googleapis.com') ? 'and its image from storage' : ''}.
            </ShadcnDialogDescription>
          </DialogHeader>
          <p className="py-2">
            Are you sure you want to delete the menu item: <strong>{itemToDelete?.name}</strong>?
          </p>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)} disabled={isDialogSubmitting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteConfirm} disabled={isDialogSubmitting}>
              {isDialogSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
