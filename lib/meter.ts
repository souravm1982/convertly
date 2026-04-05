import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { checkLimit, incrementUsage, getOrCreateUser } from '@/lib/user';

export async function withMeter(request: NextRequest, action: string, handler: () => Promise<NextResponse>): Promise<NextResponse> {
  const token = await getToken({ req: request });
  if (!token?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await getOrCreateUser(token.email, token.name || '', token.picture || '');

  const check = await checkLimit(token.email, action);
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
    await incrementUsage(token.email, action);
    const after = await checkLimit(token.email, action);
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
