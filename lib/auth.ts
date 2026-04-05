import GoogleProvider from 'next-auth/providers/google';
import type { NextAuthOptions } from 'next-auth';
import { getSecret } from './secrets';

let cachedSecrets: any = null;

async function getAuthSecrets() {
  if (cachedSecrets) return cachedSecrets;
  
  try {
    cachedSecrets = await getSecret('nextauth-secrets');
    return cachedSecrets;
  } catch (error) {
    console.error('Failed to load secrets from AWS Secrets Manager:', error);
    throw error;
  }
}

export async function getAuthOptions(): Promise<NextAuthOptions> {
  const secrets = await getAuthSecrets();
  
  return {
    providers: [
      GoogleProvider({
        clientId: secrets.GOOGLE_CLIENT_ID,
        clientSecret: secrets.GOOGLE_CLIENT_SECRET,
      }),
    ],
    secret: secrets.NEXTAUTH_SECRET,
    pages: {
      signIn: '/login',
    },
  };
}
