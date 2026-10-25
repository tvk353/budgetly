import Link from 'next/link';

import { DashboardIcon, type DashboardIconName } from '@/components/dashboard-icon';

const items: Array<{
  label: string;
  icon: DashboardIconName;
  href?: string;
}> = [
  { label: 'Home', icon: 'home', href: '/workspace/household' },
  { label: 'Transactions', icon: 'receipt', href: '/transactions' },
  { label: 'Budget', icon: 'activity', href: '/budget' },
  { label: 'Savings', icon: 'savings', href: '/savings' },
  { label: 'More', icon: 'more', href: '/more' },
];

export function HouseholdBottomNavigation({
  active,
  homeHref = '/workspace/household',
}: {
  active: 'home' | 'transactions' | 'budget' | 'savings' | 'more';
  homeHref?: string;
}) {
  return (
    <nav
      aria-label="Main navigation"
      className="fixed bottom-0 left-1/2 z-40 flex w-full max-w-[393px] -translate-x-1/2 items-center justify-around border-t border-[var(--color-border)] bg-[color:rgba(250,249,246,0.94)] px-3 pb-[max(1.25rem,env(safe-area-inset-bottom,20px))] pt-2 backdrop-blur-md shadow-[0_-4px_16px_rgba(32,42,39,0.04)]"
    >
      {items.map((item) => {
        const isActive = item.label.toLowerCase() === active;
        const style = isActive
          ? 'text-[var(--color-primary)]'
          : 'text-[var(--color-secondary-text)]';

        return item.href ? (
          <Link
            key={item.label}
            href={item.label === 'Home' ? homeHref : item.href}
            aria-current={isActive ? 'page' : undefined}
            className={`flex min-h-11 min-w-[54px] flex-col items-center justify-center rounded-lg py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] ${style}`}
          >
            <DashboardIcon name={item.icon} className="h-6 w-6" />
            <span className={`text-[10px] ${isActive ? 'font-bold' : 'font-medium'}`}>
              {item.label}
            </span>
          </Link>
        ) : (
          <button
            key={item.label}
            type="button"
            disabled
            title={`${item.label} is not available yet`}
            aria-label={`${item.label}, not available yet`}
            className={`flex min-h-11 min-w-[54px] cursor-not-allowed flex-col items-center justify-center rounded-lg py-1 opacity-65 ${style}`}
          >
            <DashboardIcon name={item.icon} className="h-6 w-6" />
            <span className="text-[10px] font-medium">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
