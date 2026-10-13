import { AppShell } from '@/components/app-shell';
import { VerificationForm } from '@/components/verification-form';

export default async function VerifyPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  const { email } = await searchParams;

  return (
    <AppShell>
      <VerificationForm email={email} />
    </AppShell>
  );
}
