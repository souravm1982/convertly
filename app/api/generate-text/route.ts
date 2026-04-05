import { NextRequest, NextResponse } from 'next/server';
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import { RekognitionClient, DetectLabelsCommand } from '@aws-sdk/client-rekognition';
import { getAWSConfig, getS3BucketName } from '@/lib/aws-config';

const bedrockClient = new BedrockRuntimeClient(getAWSConfig());
const rekognitionClient = new RekognitionClient(getAWSConfig());

export async function POST(request: NextRequest) {
  try {
    const { s3Key, customPrompt } = await request.json();

    if (!s3Key) {
      return NextResponse.json(
        { error: 'S3 key is required' },
        { status: 400 }
      );
    }

    const bucketName = getS3BucketName();
    if (!bucketName) {
      return NextResponse.json(
        { error: 'S3 bucket not configured' },
        { status: 500 }
      );
    }

    // Analyze image with Rekognition
    const detectLabelsCommand = new DetectLabelsCommand({
      Image: {
        S3Object: {
          Bucket: bucketName,
          Name: s3Key,
        },
      },
      MaxLabels: 10,
      MinConfidence: 70,
    });

    const rekognitionResponse = await rekognitionClient.send(detectLabelsCommand);
    const labels = rekognitionResponse.Labels?.map(l => l.Name).join(', ') || 'image';
    
    // Calculate safe text position based on object bounding boxes
    const instances = rekognitionResponse.Labels?.flatMap(l => l.Instances || []) || [];
    let textPosition = 'middle'; // default
    
    if (instances.length > 0) {
      const topOccupied = instances.some(i => i.BoundingBox && i.BoundingBox.Top! < 0.35);
      const midOccupied = instances.some(i => i.BoundingBox && i.BoundingBox.Top! < 0.65 && i.BoundingBox.Top! + i.BoundingBox.Height! > 0.35);
      const bottomOccupied = instances.some(i => i.BoundingBox && i.BoundingBox.Top! + i.BoundingBox.Height! > 0.65);
      
      if (!midOccupied) textPosition = 'middle';
      else if (!bottomOccupied) textPosition = 'bottom';
      else if (!topOccupied) textPosition = 'top';
      else textPosition = 'bottom'; // fallback
    }
    
    // Determine animation type based on detected objects
    const labelNames = rekognitionResponse.Labels?.map(l => l.Name?.toLowerCase()).filter(Boolean) || [];
    let animationType = 'zoom_in'; // default
    
    if (labelNames.some(l => l && ['car', 'vehicle', 'automobile', 'truck', 'bus'].includes(l))) {
      animationType = 'pan_right';
    } else if (labelNames.some(l => l && ['landscape', 'mountain', 'sky', 'scenery', 'nature'].includes(l))) {
      animationType = 'ken_burns';
    } else if (labelNames.some(l => l && ['coffee', 'cup', 'beverage', 'drink', 'food', 'plate'].includes(l))) {
      animationType = 'zoom_in_slow';
    } else if (labelNames.some(l => l && ['person', 'human', 'face', 'portrait'].includes(l))) {
      animationType = 'zoom_in_center';
    } else if (labelNames.some(l => l && ['animal', 'dog', 'cat', 'bird', 'pet'].includes(l))) {
      animationType = 'zoom_in_center';
    }

    // Generate text suggestions using Bedrock (Claude)
    const prompt = customPrompt 
      ? `Generate exactly 3 short, catchy text overlays for a social media reel. Context: ${customPrompt}. Detected objects: ${labels}. Under 10 words each. Return ONLY the 3 lines, no numbering, no intro, no explanation.`
      : `Generate exactly 3 short, catchy text overlays for a social media reel about: ${labels}. Under 10 words each. Return ONLY the 3 lines, no numbering, no intro, no explanation.`;

    const bedrockPayload = {
      anthropic_version: 'bedrock-2023-05-31',
      max_tokens: 300,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    };

    const invokeCommand = new InvokeModelCommand({
      modelId: 'anthropic.claude-3-haiku-20240307-v1:0',
      contentType: 'application/json',
      accept: 'application/json',
      body: JSON.stringify(bedrockPayload),
    });

    const bedrockResponse = await bedrockClient.send(invokeCommand);
    const responseBody = JSON.parse(new TextDecoder().decode(bedrockResponse.body));
    const suggestions = responseBody.content[0].text
      .split('\n')
      .filter((line: string) => line.trim().length > 0)
      .slice(0, 3);

    return NextResponse.json({
      success: true,
      suggestions,
      textPosition,
      animationType,
      detectedLabels: rekognitionResponse.Labels?.slice(0, 5).map(l => ({
        name: l.Name,
        confidence: l.Confidence,
      })),
    });
  } catch (error) {
    console.error('AI text generation error:', error);
    return NextResponse.json(
      {
        error: 'Failed to generate text suggestions',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
