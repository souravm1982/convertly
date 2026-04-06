import NextAuth from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import { getSecret } from '@/lib/secrets';

// Cache for secrets
let secretsCache: any = null;

const handler = async (req: any, res: any) => {
  let authOptions;

  if (process.env.NODE_ENV === 'development') {
    // Local development - use environment variables
    console.log('Using local environment variables for NextAuth');
    authOptions = {
      providers: [
        GoogleProvider({
          clientId: process.env.GOOGLE_CLIENT_ID!,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        }),
      ],
      secret: process.env.NEXTAUTH_SECRET,
      pages: {
        signIn: '/login',
      },
    };
  } else {
    // Production - use AWS Secrets Manager
    if (!secretsCache) {
      try {
        secretsCache = await getSecret('nextauth-secrets');
        console.log('Secrets loaded from AWS Secrets Manager');
        console.log('NEXTAUTH_URL from secret:', secretsCache.NEXTAUTH_URL);
        
        // Set environment variable for NextAuth to use
        process.env.NEXTAUTH_URL = secretsCache.NEXTAUTH_URL;
      } catch (error) {
        console.error('Failed to load secrets:', error);
        throw error;
      }
    }

    authOptions = {
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
  }

  return NextAuth(authOptions)(req, res);
};

export { handler as GET, handler as POST };
