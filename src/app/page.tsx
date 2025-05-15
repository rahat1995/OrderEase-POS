
import PosClientPage from '@/components/pos/PosClientPage';

// This page no longer fetches data directly.
// PosClientPage will handle fetching its own data.
export default function OrderPage() {
  return <PosClientPage />;
}
