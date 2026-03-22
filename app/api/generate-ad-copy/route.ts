import { NextRequest, NextResponse } from 'next/server';
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';

const bedrockClient = new BedrockRuntimeClient({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
});

export async function POST(request: NextRequest) {
  try {
    const { product, template } = await request.json();
    if (!product) return NextResponse.json({ error: 'Product data is required' }, { status: 400 });

    const prompt = `You are an expert ad copywriter. Generate ad copy for this product:

Product: ${product.title}
Description: ${product.description}
Price: $${product.price}${product.compareAtPrice ? ` (was $${product.compareAtPrice})` : ''}
Type: ${product.productType || 'General'}
Template style: ${template || 'product-showcase'}

Return ONLY valid JSON with this exact structure, no markdown:
{
  "headline": "short punchy headline (max 8 words)",
  "subheadline": "supporting line (max 12 words)",
  "cta": "call to action button text (2-4 words)",
  "description": "one compelling sentence about the product"
}`;

    const command = new InvokeModelCommand({
      modelId: 'anthropic.claude-3-haiku-20240307-v1:0',
      contentType: 'application/json',
      accept: 'application/json',
      body: JSON.stringify({
        anthropic_version: 'bedrock-2023-05-31',
        max_tokens: 300,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    const response = await bedrockClient.send(command);
    const body = JSON.parse(new TextDecoder().decode(response.body));
    const text = body.content[0].text;

    // Extract JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('Failed to parse AI response');
    const adCopy = JSON.parse(jsonMatch[0]);

    return NextResponse.json({ success: true, adCopy });
  } catch (error) {
    console.error('Ad copy error:', error);
    return NextResponse.json(
      { error: 'Failed to generate ad copy', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
