import { NextRequest, NextResponse } from 'next/server';
import { upgradeTier, getUserUsage } from '@/lib/user';
import { TierName } from '@/config/billing.config';

export async function POST(request: NextRequest) {
  try {
    const { tier, email } = await request.json();
    if (!email) return NextResponse.json({ error: 'Email required' }, { status: 400 });
    if (!['base', 'premium'].includes(tier)) {
      return NextResponse.json({ error: 'Invalid tier' }, { status: 400 });
    }

    // Auto-approve for testing — replace with Stripe integration later
    await upgradeTier(email, tier as TierName);
    const usage = await getUserUsage(email);
    return NextResponse.json({ success: true, ...usage });
  } catch (error) {
    console.error('Upgrade error:', error);
    return NextResponse.json({ error: 'Upgrade failed' }, { status: 500 });
  }
}
