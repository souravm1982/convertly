import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    nextauth_secret_exists: !!process.env.NEXTAUTH_SECRET,
    nextauth_secret_length: process.env.NEXTAUTH_SECRET?.length || 0,
    nextauth_url_exists: !!process.env.NEXTAUTH_URL,
    nextauth_url: process.env.NEXTAUTH_URL,
    google_client_id_exists: !!process.env.GOOGLE_CLIENT_ID,
    google_client_secret_exists: !!process.env.GOOGLE_CLIENT_SECRET,
    node_env: process.env.NODE_ENV,
    all_env_keys: Object.keys(process.env).filter(key => 
      key.includes('NEXTAUTH') || key.includes('GOOGLE')
    ),
    timestamp: new Date().toISOString(),
  });
}