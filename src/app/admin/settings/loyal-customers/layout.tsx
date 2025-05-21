
import type { ReactNode } from 'react';

export default function LoyalCustomersPageLayout({ children }: { children: ReactNode }) {
  // This layout simply passes its children through.
  // It's here to resolve an error if a faulty layout file existed at this path,
  // or to provide a minimal valid layout if one is expected by Next.js for this route segment.
  // It will inherit styles and structure from /admin/layout.tsx and the root layout.
  return <>{children}</>;
}
