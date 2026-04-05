import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { getUserUsage } from '@/lib/user';

export async function GET(request: NextRequest) {
  const token = await getToken({ req: request });
  if (!token?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const usage = await getUserUsage(token.email);
  return NextResponse.json(usage);
}
