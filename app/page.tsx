import { AppShell } from '@/components/app-shell';
import { LoginForm } from '@/components/login-form';

export default function HomePage() {
  return (
    <AppShell>
      <LoginForm />
    </AppShell>
  );
}
