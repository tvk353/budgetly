export type DashboardIconName =
  | 'activity'
  | 'arrow-up'
  | 'bolt'
  | 'calendar'
  | 'cart'
  | 'chevron-right'
  | 'dining'
  | 'gas'
  | 'home'
  | 'info'
  | 'more'
  | 'medicine'
  | 'movie'
  | 'plus'
  | 'receipt'
  | 'refund'
  | 'search'
  | 'savings'
  | 'notifications';

const paths: Record<DashboardIconName, string> = {
  activity: 'M4 6h16M4 12h16M4 18h16M2 6h.01M2 12h.01M2 18h.01',
  'arrow-up': 'M12 19V5M6 11l6-6 6 6',
  bolt: 'M13 2 4 14h7l-1 8 10-13h-7z',
  calendar: 'M4 5h16v16H4zM8 3v4M16 3v4M4 10h16',
  cart: 'M3 3h2l2.5 12h11L21 7H6M9 19h.01M18 19h.01',
  'chevron-right': 'm9 18 6-6-6-6',
  dining: 'M4 3v7m-2-7v4m4-4v4m-2 3v11M18 3c-3 3-3 8 0 8m0-8v18',
  gas: 'M4 21V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v16M3 21h14M7 7h6v5H7zM16 8h2l3 3v6a2 2 0 0 1-4 0v-4',
  home: 'm3 10 9-7 9 7v11h-6v-6H9v6H3z',
  info: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20M12 11v5M12 7h.01',
  more: 'M5 12h.01M12 12h.01M19 12h.01',
  medicine: 'M10 3h4v4h4v4h-4v4h-4v-4H6V7h4zM5 17h14v4H5z',
  movie: 'M3 6h18v15H3zM3 6l3-3m3 3 3-3m3 3 3-3m-9 9 6 3-6 3z',
  plus: 'M12 5v14M5 12h14',
  receipt: 'M6 3h12v18l-3-2-3 2-3-2-3 2zM9 8h6M9 12h6M9 16h4',
  refund: 'M4 4v6h6M5 10a8 8 0 1 1-1 5',
  search: 'M20 20l-4.5-4.5M18 10.5a7.5 7.5 0 1 1-15 0 7.5 7.5 0 0 1 15 0z',
  savings: 'M3 11h2l2-4h9l3 3h2v7h-3l-2 2H9l-2-2H4zM15 12h.01M2 13v3M7 7l-1-2M17 7l1-2',
  notifications: 'M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4',
};

export function DashboardIcon({
  name,
  className = 'h-5 w-5',
}: {
  name: DashboardIconName;
  className?: string;
}) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
    >
      <path d={paths[name]} />
    </svg>
  );
}
