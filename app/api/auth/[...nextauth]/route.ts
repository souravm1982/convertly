import NextAuth from 'next-auth';
import { getAuthOptions } from '@/lib/auth';

const handler = async (req: Request) => {
  const authOptions = await getAuthOptions();
  return NextAuth(authOptions)(req);
};

export { handler as GET, handler as POST };
