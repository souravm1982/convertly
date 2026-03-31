import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { getUserUsage } from '@/lib/user';

export async function GET() {
  const session = await getServerSession();
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const usage = await getUserUsage(session.user.email);
  return NextResponse.json(usage);
}
