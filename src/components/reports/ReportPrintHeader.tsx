
"use client";

import type { RestaurantProfile } from '@/types';
import Image from 'next/image';

interface ReportPrintHeaderProps {
  profile: RestaurantProfile | null;
  reportTitle: string;
}

export default function ReportPrintHeader({ profile, reportTitle }: ReportPrintHeaderProps) {
  return (
    <div className="print-header mb-4 text-center">
      {profile?.logoUrl && (
        <Image
          src={profile.logoUrl}
          alt={profile.name || "Logo"}
          width={120}
          height={60}
          className="mx-auto mb-2 object-contain report-logo"
          onError={(e) => (e.currentTarget.style.display = 'none')}
        />
      )}
      <h1 className="text-xl font-bold">{profile?.name || 'Your Restaurant'}</h1>
      {profile?.address && <p className="text-xs">{profile.address}</p>}
      {profile?.contactNumber && <p className="text-xs">Contact: {profile.contactNumber}</p>}
      <h2 className="text-lg font-semibold mt-2 mb-1 underline">{reportTitle}</h2>
      <p className="text-xs text-muted-foreground print-timestamp">
        Generated on: {new Date().toLocaleString()}
      </p>
      <hr className="my-2 border-gray-400" />
    </div>
  );
}
