
import ProfitLossReportClient from '@/components/reports/ProfitLossReportClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Scale } from 'lucide-react';

export const metadata = {
  title: 'Profit & Loss Report - OrderEase POS',
  description: 'Analyze your business profitability over selected periods.',
};

export default function ProfitLossReportPage() {
  return (
    <div className="container mx-auto p-4 md:p-6 lg:p-8">
      <Card className="shadow-xl">
        <CardHeader>
          <div className="flex items-center space-x-3">
            <Scale className="h-8 w-8 text-accent" />
            <div>
              <CardTitle className="text-2xl md:text-3xl">Profit & Loss Report</CardTitle>
              <CardDescription>Calculate your net profit or loss for a specified period.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ProfitLossReportClient />
        </CardContent>
      </Card>
    </div>
  );
}
