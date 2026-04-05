import GoogleProvider from 'next-auth/providers/google';
import type { NextAuthOptions } from 'next-auth';

// Debug environment variables
console.log('Environment variables check:', {
  NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET ? 'SET' : 'MISSING',
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID ? 'SET' : 'MISSING',
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET ? 'SET' : 'MISSING',
  NODE_ENV: process.env.NODE_ENV,
});

// Validate required environment variables
if (!process.env.NEXTAUTH_SECRET) {
  console.error('NEXTAUTH_SECRET is missing!');
  throw new Error('NEXTAUTH_SECRET environment variable is required');
}

if (!process.env.GOOGLE_CLIENT_ID) {
  console.error('GOOGLE_CLIENT_ID is missing!');
  throw new Error('GOOGLE_CLIENT_ID environment variable is required');
}

if (!process.env.GOOGLE_CLIENT_SECRET) {
  console.error('GOOGLE_CLIENT_SECRET is missing!');
  throw new Error('GOOGLE_CLIENT_SECRET environment variable is required');
}

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET,
};
