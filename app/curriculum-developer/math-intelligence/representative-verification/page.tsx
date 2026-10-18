import type { Metadata } from 'next';
import StaffMathRepresentativeVerificationPanel from '@/app/curriculum-developer/components/math-intelligence/StaffMathRepresentativeVerificationPanel';

export const metadata: Metadata = {
  title: 'Staff Method Coverage Verification | DREAMSCAPE ONE',
  robots: { index: false, follow: false },
};

export default function StaffMathRepresentativeVerificationPage() {
  // Public-facing page shell contains no privileged data. All reads/previews
  // use the existing independently authorized staff API and database RLS.
  return <StaffMathRepresentativeVerificationPanel />;
}
