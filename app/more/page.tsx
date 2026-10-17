import { connection } from 'next/server';

import { MoreHubScreen } from '@/components/more-hub-screen';

export default async function MorePage() {
  await connection();

  return <MoreHubScreen />;
}

