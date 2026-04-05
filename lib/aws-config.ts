// AWS configuration utility
// Supports both custom env vars (for Amplify) and standard AWS env vars (for local dev)

export const getAWSConfig = () => ({
  region: process.env.CUSTOM_AWS_REGION || process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.CUSTOM_AWS_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.CUSTOM_AWS_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY || '',
  },
});

export const getS3BucketName = () => 
  process.env.CUSTOM_AWS_S3_BUCKET_NAME || process.env.AWS_S3_BUCKET_NAME || '';

export const getAWSRegion = () => 
  process.env.CUSTOM_AWS_REGION || process.env.AWS_REGION || 'us-east-1';

export const getAWSCredentials = () => ({
  accessKeyId: process.env.CUSTOM_AWS_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID || '',
  secretAccessKey: process.env.CUSTOM_AWS_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY || '',
});