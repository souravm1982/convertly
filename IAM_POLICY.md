# IAM Policy for AI-Powered Reel Creator

Add this policy to your IAM user to enable all features:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "S3Access",
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:PutObjectAcl",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::convertly-image",
        "arn:aws:s3:::convertly-image/*"
      ]
    },
    {
      "Sid": "RekognitionAccess",
      "Effect": "Allow",
      "Action": [
        "rekognition:DetectLabels",
        "rekognition:DetectText",
        "rekognition:DetectFaces"
      ],
      "Resource": "*"
    },
    {
      "Sid": "BedrockAccess",
      "Effect": "Allow",
      "Action": [
        "bedrock:InvokeModel"
      ],
      "Resource": "arn:aws:bedrock:us-east-1::foundation-model/anthropic.claude-3-haiku-20240307-v1:0"
    }
  ]
}
```

## How to Apply:

1. Go to AWS IAM Console
2. Select your user (souravm)
3. Click "Add permissions" → "Create inline policy"
4. Switch to JSON tab
5. Paste the policy above
6. Name it: "ReelCreatorAIPolicy"
7. Click "Create policy"

## Enable Bedrock Model Access:

1. Go to AWS Bedrock Console
2. Click "Model access" in left sidebar
3. Click "Manage model access"
4. Enable "Claude 3 Haiku"
5. Click "Save changes"

## Features Enabled:

- ✅ Image upload to S3
- ✅ AI-powered text suggestions (Bedrock + Rekognition)
- ✅ Text overlay with motion effects (FFmpeg)
- ✅ Multi-image reel creation with transitions
