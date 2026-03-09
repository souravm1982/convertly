# Image Upload to S3 - Setup Guide

This application allows you to upload multiple images to AWS S3 through a Next.js backend API.

## Prerequisites

- Node.js 18+ installed
- An AWS account with S3 access
- AWS credentials (Access Key ID and Secret Access Key)

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure AWS Credentials

Create a `.env.local` file in the root directory:

```bash
cp .env.local.example .env.local
```

Edit `.env.local` and add your AWS credentials:

```env
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_access_key_id
AWS_SECRET_ACCESS_KEY=your_secret_access_key
AWS_S3_BUCKET_NAME=your_bucket_name
```

### 3. Set Up AWS S3 Bucket

1. **Create an S3 Bucket:**
   - Go to AWS S3 Console
   - Click "Create bucket"
   - Choose a unique bucket name
   - Select your preferred region
   - Click "Create bucket"

2. **Configure Bucket Permissions:**
   
   Add the following CORS configuration to your bucket:
   - Go to your bucket → Permissions → CORS
   - Add this configuration:

   ```json
   [
     {
       "AllowedHeaders": ["*"],
       "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
       "AllowedOrigins": ["http://localhost:3000"],
       "ExposeHeaders": []
     }
   ]
   ```

3. **Set Bucket Policy (Optional - for public read access):**
   
   If you want uploaded images to be publicly accessible:
   - Go to Permissions → Bucket Policy
   - Add this policy (replace `your-bucket-name`):

   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Sid": "PublicReadGetObject",
         "Effect": "Allow",
         "Principal": "*",
         "Action": "s3:GetObject",
         "Resource": "arn:aws:s3:::your-bucket-name/*"
       }
     ]
   }
   ```

### 4. Configure IAM User Permissions

Your AWS IAM user needs the following S3 permissions:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject"
      ],
      "Resource": "arn:aws:s3:::your-bucket-name/*"
    },
    {
      "Effect": "Allow",
      "Action": "s3:ListBucket",
      "Resource": "arn:aws:s3:::your-bucket-name"
    }
  ]
}
```

### 5. Run the Application

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Features

- **Multiple Image Upload**: Select and upload multiple images at once
- **Image Preview**: Preview selected images before uploading
- **Progress Tracking**: Visual feedback during upload
- **S3 Storage**: Images are stored in your AWS S3 bucket
- **Upload History**: View all uploaded images with links to S3
- **Reel Creation**: Create video reels from uploaded images
  - Select 2 or more images to create a reel
  - Customize transition duration (0.5-3 seconds)
  - Automatic fade transitions between images
  - Videos are saved to S3 in MP4 format
  - 1920x1080 resolution with optimized encoding

## Supported Image Formats

- PNG
- JPG/JPEG
- GIF
- WebP
- And other image formats supported by browsers

## Security Notes

- Never commit `.env.local` to version control
- Use IAM users with minimal required permissions
- Consider using presigned URLs for production environments
- Enable bucket versioning for data protection
- Use HTTPS in production

## Troubleshooting

### "S3 bucket name not configured" Error
- Ensure `.env.local` exists and contains `AWS_S3_BUCKET_NAME`
- Restart the development server after creating/modifying `.env.local`

### "Access Denied" Error
- Check IAM user permissions
- Verify bucket policy allows your actions
- Ensure credentials are correct in `.env.local`

### CORS Errors
- Add proper CORS configuration to your S3 bucket
- Update `AllowedOrigins` to include your domain in production

### Images Not Loading After Upload
- Check bucket policy for public read access
- Verify bucket and region settings
- Ensure the generated URL is correct

## Production Deployment

When deploying to production:

1. Update CORS `AllowedOrigins` to include your production domain
2. Add environment variables to your hosting platform
3. Consider using AWS Secrets Manager or Parameter Store for credentials
4. Enable CloudFront CDN for better performance
5. Implement proper error handling and logging

## API Endpoints

### POST `/api/upload`

Upload images to S3.

Request:
- Content-Type: `multipart/form-data`
- Body: FormData with `files` field containing image files

Response:
```json
{
  "success": true,
  "files": [
    {
      "fileName": "original-name.jpg",
      "s3Key": "timestamp-original-name.jpg",
      "size": 123456,
      "type": "image/jpeg",
      "url": "https://bucket.s3.region.amazonaws.com/key"
    }
  ],
  "message": "Successfully uploaded X file(s)"
}
```

### POST `/api/create-reel`

Create a video reel from uploaded images.

Request:
- Content-Type: `application/json`
- Body:
```json
{
  "images": [
    {
      "fileName": "image1.jpg",
      "s3Key": "timestamp-image1.jpg",
      "size": 123456,
      "type": "image/jpeg",
      "url": "https://bucket.s3.region.amazonaws.com/key"
    }
  ],
  "transitionDuration": 1.5
}
```

Response:
```json
{
  "success": true,
  "videoUrl": "https://bucket.s3.region.amazonaws.com/reels/reel-timestamp.mp4",
  "videoKey": "reels/reel-timestamp.mp4",
  "message": "Reel created successfully"
}
```
