import GoogleProvider from 'next-auth/providers/google';
import type { NextAuthOptions } from 'next-auth';
import { getSecret } from './secrets';

// Cache for secrets
let secretsCache: any = null;
let secretsPromise: Promise<any> | null = null;

// Initialize secrets on module load
const initializeSecrets = async () => {
  if (secretsCache) return secretsCache;
  if (secretsPromise) return secretsPromise;
  
  secretsPromise = getSecret('nextauth-secrets')
    .then(secrets => {
      secretsCache = secrets;
      return secrets;
    })
    .catch(error => {
      console.error('Failed to load secrets, using environment variables:', error);
      // Fallback to environment variables
      return {
        NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
        GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
        GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
        NEXTAUTH_URL: process.env.NEXTAUTH_URL
      };
    });
    
  return secretsPromise;
};

// Initialize secrets immediately
initializeSecrets();

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: secretsCache?.GOOGLE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: secretsCache?.GOOGLE_CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET || '',
    }),
  ],
  secret: secretsCache?.NEXTAUTH_SECRET || process.env.NEXTAUTH_SECRET,
  pages: {
    signIn: '/login',
  },
};
