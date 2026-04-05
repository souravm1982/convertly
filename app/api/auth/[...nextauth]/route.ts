import NextAuth from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import { getSecret } from '@/lib/secrets';

// Cache for secrets
let secretsCache: any = null;

const handler = async (req: any, res: any) => {
  // Load secrets if not cached
  if (!secretsCache) {
    try {
      secretsCache = await getSecret('nextauth-secrets');
      console.log('Secrets loaded from AWS Secrets Manager');
    } catch (error) {
      console.error('Failed to load secrets:', error);
      throw error;
    }
  }

  // Create NextAuth options with loaded secrets
  const authOptions = {
    providers: [
      GoogleProvider({
        clientId: secretsCache.GOOGLE_CLIENT_ID,
        clientSecret: secretsCache.GOOGLE_CLIENT_SECRET,
      }),
    ],
    secret: secretsCache.NEXTAUTH_SECRET,
    pages: {
      signIn: '/login',
    },
  };

  return NextAuth(authOptions)(req, res);
};

export { handler as GET, handler as POST };
