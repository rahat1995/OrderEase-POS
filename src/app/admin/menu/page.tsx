
"use client";

import React from 'react';
import { Card as PageCard, CardContent as PageCardContent, CardDescription as PageCardHeaderCardDescription, CardHeader as PageCardHeader, CardTitle as PageCardTitle } from '@/components/ui/card';
import { Info, FileJson } from 'lucide-react';

export default function MenuManagementInfoPage() {
  return (
    <div className="container mx-auto p-4 md:p-6 lg:p-8">
      <PageCardHeader className="flex flex-row items-center justify-between mb-6 -mx-2 md:-mx-0">
        <div className="flex items-center space-x-3">
          <FileJson className="h-8 w-8 text-accent" />
          <div>
            <PageCardTitle className="text-2xl md:text-3xl">Menu Management</PageCardTitle>
            <PageCardHeaderCardDescription>
              Menu items are managed by editing a local JSON file.
            </PageCardHeaderCardDescription>
          </div>
        </div>
      </PageCardHeader>
      <PageCard className="shadow-xl">
        <PageCardContent className="pt-6">
          <div className="flex items-start p-4 rounded-lg bg-secondary/50 border border-accent/30 shadow">
            <Info className="h-6 w-6 text-accent mr-3 mt-1 flex-shrink-0" />
            <div>
              <h3 className="text-lg font-semibold text-primary mb-1">Editing Menu Items</h3>
              <p className="text-foreground/90">
                To add, edit, or delete menu items, please modify the following file directly in your project's codebase:
              </p>
              <code className="block bg-muted text-muted-foreground p-2 rounded-md my-2 text-sm break-all">
                public/menu-items.json
              </code>
              <p className="text-foreground/90 mt-2">
                After making changes to this file, you may need to restart your development server (if running locally) or redeploy your application for the changes to take effect on the POS screen.
              </p>
              <p className="text-xs text-muted-foreground mt-3">
                This approach was chosen for simplicity. If you require dynamic menu management through a web interface, that feature would need to be re-implemented using a database.
              </p>
            </div>
          </div>
        </PageCardContent>
      </PageCard>
    </div>
  );
}
