
import CostReportClient from '@/components/reports/CostReportClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp } from 'lucide-react'; // Using a different icon for variety

export const metadata = {
  title: 'Cost Report - OrderEase POS',
  description: 'View cost and expense reports for your business.',
};

export default function CostReportPage() {
  return (
    <div className="container mx-auto p-4 md:p-6 lg:p-8">
      <Card className="shadow-xl">
        <CardHeader>
          <div className="flex items-center space-x-3">
            <TrendingUp className="h-8 w-8 text-accent" />
            <div>
              <CardTitle className="text-2xl md:text-3xl">Cost Report</CardTitle>
              <CardDescription>Analyze your business expenses by category and date.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <CostReportClient />
        </CardContent>
      </Card>
    </div>
  );
}
