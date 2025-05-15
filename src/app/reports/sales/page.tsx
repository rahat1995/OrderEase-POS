
import SalesReportClient from '@/components/reports/SalesReportClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText } from 'lucide-react';

export const metadata = {
  title: 'Sales Report - OrderEase POS',
  description: 'View sales reports for your restaurant.',
};

export default function SalesReportPage() {
  return (
    <div className="container mx-auto p-4 md:p-6 lg:p-8">
      <Card className="shadow-xl">
        <CardHeader>
          <div className="flex items-center space-x-3">
            <FileText className="h-8 w-8 text-accent" />
            <div>
              <CardTitle className="text-2xl md:text-3xl">Sales Report</CardTitle>
              <CardDescription>View and filter sales orders.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <SalesReportClient />
        </CardContent>
      </Card>
    </div>
  );
}
