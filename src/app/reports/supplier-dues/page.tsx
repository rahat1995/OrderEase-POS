
import SupplierDueReportClient from '@/components/reports/SupplierDueReportClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users } from 'lucide-react';

export const metadata = {
  title: 'Supplier Due Report - OrderEase POS',
  description: 'View outstanding dues for all suppliers.',
};

export default function SupplierDueReportPage() {
  return (
    <div className="container mx-auto p-4 md:p-6 lg:p-8">
      <Card className="shadow-xl">
        <CardHeader>
          <div className="flex items-center space-x-3">
            <Users className="h-8 w-8 text-accent" />
            <div>
              <CardTitle className="text-2xl md:text-3xl">Supplier Due Report</CardTitle>
              <CardDescription>Review current outstanding balances for your suppliers.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <SupplierDueReportClient />
        </CardContent>
      </Card>
    </div>
  );
}
