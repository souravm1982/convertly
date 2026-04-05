import GoogleProvider from 'next-auth/providers/google';
import type { NextAuthOptions } from 'next-auth';
import { getSecret } from './secrets';

// Load secrets and set environment variables at module initialization
(async () => {
  try {
    if (!process.env.NEXTAUTH_SECRET) {
      const secrets = await getSecret('nextauth-secrets');
      process.env.NEXTAUTH_SECRET = secrets.NEXTAUTH_SECRET;
      process.env.GOOGLE_CLIENT_ID = secrets.GOOGLE_CLIENT_ID;
      process.env.GOOGLE_CLIENT_SECRET = secrets.GOOGLE_CLIENT_SECRET;
      process.env.NEXTAUTH_URL = secrets.NEXTAUTH_URL;
      console.log('Secrets loaded from AWS Secrets Manager');
    }
  } catch (error) {
    console.error('Failed to load secrets from AWS Secrets Manager:', error);
  }
})();

export const authOptions: NextAuthOptions = {
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
