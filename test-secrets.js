import { getSecret } from './lib/secrets.js';

async function testSecrets() {
  try {
    console.log('Testing secrets loading...');
    const secrets = await getSecret('nextauth-secrets');
    console.log('✅ Secrets loaded successfully:');
    console.log('- NEXTAUTH_SECRET:', secrets.NEXTAUTH_SECRET ? 'SET' : 'MISSING');
    console.log('- GOOGLE_CLIENT_ID:', secrets.GOOGLE_CLIENT_ID ? 'SET' : 'MISSING');
    console.log('- GOOGLE_CLIENT_SECRET:', secrets.GOOGLE_CLIENT_SECRET ? 'SET' : 'MISSING');
    console.log('- NEXTAUTH_URL:', secrets.NEXTAUTH_URL);
  } catch (error) {
    console.error('❌ Failed to load secrets:', error.message);
  }
}

testSecrets();