import type { Metadata } from 'next';
import StaffMathMethodPreviewPanel from '@/app/curriculum-developer/components/math-intelligence/StaffMathMethodPreviewPanel';

export const metadata: Metadata = {
  title: 'Staff Method Preview | DREAMSCAPE ONE',
  robots: { index: false, follow: false },
};

export default function StaffMathMethodPreviewPage() {
  // This page contains no sensitive server data. Every data request independently
  // enforces admin/curriculum_lead authorization and RLS on the server.
  return <StaffMathMethodPreviewPanel />;
}
