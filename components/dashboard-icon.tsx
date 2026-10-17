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
  | 'notifications'
  | 'arrow-left'
  | 'chevron-left'
  | 'chevron-down'
  | 'help'
  | 'calculate'
  | 'shopping-bag'
  | 'commute'
  | 'tune'
  | 'lock'
  | 'trending-up'
  | 'shield'
  | 'flight'
  | 'kitchen'
  | 'arrow-down'
  | 'add-circle'
  | 'remove-circle'
  | 'edit'
  | 'compass'
  | 'bar-chart'
  | 'category'
  | 'arrow-outward'
  | 'users'
  | 'refresh'
  | 'trash'
  | 'cloud-download'
  | 'logout';

const paths: Record<DashboardIconName, string> = {
  activity: 'M4 6h16M4 12h16M4 18h16M2 6h.01M2 12h.01M2 18h.01',
  'arrow-up': 'M12 19V5M6 11l6-6 6 6',
  'arrow-down': 'M12 5v14M19 13l-7 7-7-7',
  'arrow-left': 'M19 12H5M12 19l-7-7 7-7',
  'arrow-outward': 'M7 17 17 7M7 7h10v10',
  'bar-chart': 'M18 20V10M12 20V4M6 20v-6',
  bolt: 'M13 2 4 14h7l-1 8 10-13h-7z',
  calendar: 'M4 5h16v16H4zM8 3v4M16 3v4M4 10h16',
  calculate: 'M4 4h16v16H4zM8 8h1M15 8h1M8 12h1M15 12h1M8 16h8',
  cart: 'M3 3h2l2.5 12h11L21 7H6M9 19h.01M18 19h.01',
  category: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z',
  'chevron-right': 'm9 18 6-6-6-6',
  'chevron-left': 'm15 18-6-6 6-6',
  'chevron-down': 'm6 9 6 6 6-6',
  'cloud-download': 'M8 17l4 4 4-4M12 12v9M20.88 18.09A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.29',
  commute:
    'M5 18v1a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-1h4v1a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-1m-14-6 2-5h10l2 5M5 12h14M7 15h.01M17 15h.01',
  compass:
    'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zm4.24-14.24-2.83 7.07-7.07 2.83 2.83-7.07 7.07-2.83z',
  dining: 'M4 3v7m-2-7v4m4-4v4m-2 3v11M18 3c-3 3-3 8 0 8m0-8v18',
  edit: 'M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z',
  flight:
    'M21 16v-2l-8-5V3.5a1.5 1.5 0 0 0-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z',
  gas: 'M4 21V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v16M3 21h14M7 7h6v5H7zM16 8h2l3 3v6a2 2 0 0 1-4 0v-4',
  help: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3M12 17h.01',
  home: 'm3 10 9-7 9 7v11h-6v-6H9v6H3z',
  info: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20M12 11v5M12 7h.01',
  kitchen:
    'M6 2h12a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2zM4 10h16M8 6v2M8 14v4',
  lock: 'M19 11H5a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2zM7 11V7a5 5 0 0 1 10 0v4',
  logout: 'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9',
  more: 'M5 12h.01M12 12h.01M19 12h.01',
  medicine: 'M10 3h4v4h4v4h-4v4h-4v-4H6V7h4zM5 17h14v4H5z',
  movie: 'M3 6h18v15H3zM3 6l3-3m3 3 3-3m3 3 3-3m-9 9 6 3-6 3z',
  plus: 'M12 5v14M5 12h14',
  receipt: 'M6 3h12v18l-3-2-3 2-3-2-3 2zM9 8h6M9 12h6M9 16h4',
  refresh:
    'M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15',
  refund: 'M4 4v6h6M5 10a8 8 0 1 1-1 5',
  search: 'M20 20l-4.5-4.5M18 10.5a7.5 7.5 0 1 1-15 0 7.5 7.5 0 0 1 15 0z',
  savings: 'M3 11h2l2-4h9l3 3h2v7h-3l-2 2H9l-2-2H4zM15 12h.01M2 13v3M7 7l-1-2M17 7l1-2',
  shield: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z',
  'shopping-bag': 'M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4zM3 6h18M16 10a4 4 0 0 1-8 0',
  'trending-up': 'm23 6-9.5 9.5-5-5L1 18M17 6h6v6',
  trash: 'M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2',
  tune: 'M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6',
  users:
    'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm14 10v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75',
  'add-circle': 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 8v8M8 12h8',
  'remove-circle': 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM8 12h8',
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
