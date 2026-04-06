# Developer Setup Guide

## Prerequisites
- Node.js 18+ 
- AWS Account access
- Google Cloud Console access

## Local Development Setup

### 1. Clone and Install
```bash
git clone <repository-url>
cd convertly
npm install
```

### 2. Environment Variables
```bash
cp .env.local.example .env.local
```

Edit `.env.local` with your credentials:

### 3. AWS Setup
1. **Create IAM User** with these policies:
   - `AmazonS3FullAccess`
   - `AmazonRekognitionFullAccess` 
   - `AmazonBedrockFullAccess`
2. **Create S3 Bucket** for image storage
3. **Get Access Keys** from AWS Console → IAM → Users → Security credentials
4. **Add to `.env.local`**:
   ```
   AWS_ACCESS_KEY_ID=your-key
   AWS_SECRET_ACCESS_KEY=your-secret
   AWS_S3_BUCKET_NAME=your-bucket-name
   ```

### 4. Google OAuth Setup
1. **Google Cloud Console** → APIs & Credentials → Create OAuth 2.0 Client
2. **Authorized redirect URIs**:
   - `http://localhost:3000/api/auth/callback/google`
   - `https://main.d30aasu4xgo1wn.amplifyapp.com/api/auth/callback/google`
3. **Add to `.env.local`**:
   ```
   GOOGLE_CLIENT_ID=your-client-id
   GOOGLE_CLIENT_SECRET=your-client-secret
   ```

### 5. NextAuth Secret
```bash
# Generate secret
openssl rand -base64 32

# Add to .env.local
NEXTAUTH_SECRET=generated-secret
```

### 6. Start Development
```bash
npm run dev
```

## Production Architecture
- **Environment Variables**: Stored in AWS Secrets Manager
- **Authentication**: Google OAuth via NextAuth
- **Hosting**: AWS Amplify
- **Storage**: AWS S3
- **AI Services**: AWS Bedrock, Rekognition

## Important Notes
- **Never commit `.env.local`** - it contains sensitive credentials
- **Production uses AWS Secrets Manager** - no environment variables needed in Amplify Console
- **IAM permissions** are automatically handled by Amplify service roles