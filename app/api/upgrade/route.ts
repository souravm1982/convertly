import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { upgradeTier, getUserUsage } from '@/lib/user';
import { TierName } from '@/config/billing.config';

export async function POST(request: NextRequest) {
  const session = await getServerSession();
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { tier } = await request.json();
  if (!['base', 'premium'].includes(tier)) {
    return NextResponse.json({ error: 'Invalid tier' }, { status: 400 });
  }

  // Auto-approve for testing — replace with Stripe integration later
  await upgradeTier(session.user.email, tier as TierName);
  const usage = await getUserUsage(session.user.email);
  return NextResponse.json({ success: true, ...usage });
}
