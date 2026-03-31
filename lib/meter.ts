import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { checkLimit, incrementUsage, getOrCreateUser } from '@/lib/user';

export async function withMeter(action: string, handler: () => Promise<NextResponse>): Promise<NextResponse> {
  const session = await getServerSession();
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await getOrCreateUser(session.user.email, session.user.name || '', session.user.image || '');

  const check = await checkLimit(session.user.email, action);
  if (!check.allowed) {
    return NextResponse.json({
      error: 'limit_reached',
      message: check.reason,
      current: check.current,
      limit: check.limit,
      tierRequired: check.tierRequired,
    }, { status: 403 });
  }

  const result = await handler();

  if (result.status === 200) {
    await incrementUsage(session.user.email, action);
    // Check if they just hit the limit — attach warning to response
    const after = await checkLimit(session.user.email, action);
    if (!after.allowed) {
      const body = await result.json();
      return NextResponse.json({
        ...body,
        _limitWarning: {
          message: `You've used your last free ${action.replace(/-/g, ' ')}. Upgrade to continue.`,
          tierRequired: after.tierRequired,
        },
      });
    }
  }

  return result;
}
