import { NextRequest, NextResponse } from 'next/server';
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import { withMeter } from '@/lib/meter';

const bedrockClient = new BedrockRuntimeClient({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
});

export async function POST(request: NextRequest) {
  const body = await request.json();
  return withMeter(request, 'generate-social-post', () => handleSocialPost(body));
}

async function handleSocialPost(body: any) {
  try {
    const { product, prompt } = body;
    const productName = product?.title || prompt;
    if (!productName) return NextResponse.json({ error: 'Product or prompt required' }, { status: 400 });

    const description = product?.description ? `\nDescription: ${product.description}` : '';
    const price = product?.price ? `\nPrice: $${product.price}` : '';

    const aiPrompt = `You are a social media copywriter. Write a Facebook/Instagram post to accompany a carousel photo set for this topic:

Topic: ${productName}${description}${price}

Requirements:
- 100-200 words in 1-2 paragraphs
- Engaging, conversational tone
- Include 3-4 relevant emojis naturally in the text
- End with a call to action
- Include 4-6 relevant hashtags at the end
- Do NOT use markdown formatting

Return ONLY the post text, nothing else.`;

    const command = new InvokeModelCommand({
      modelId: 'anthropic.claude-3-haiku-20240307-v1:0',
      contentType: 'application/json',
      accept: 'application/json',
      body: JSON.stringify({
        anthropic_version: 'bedrock-2023-05-31',
        max_tokens: 300,
        messages: [{ role: 'user', content: aiPrompt }],
      }),
    });

    const response = await bedrockClient.send(command);
    const body = JSON.parse(new TextDecoder().decode(response.body));
    const post = body.content[0].text.trim();

    return NextResponse.json({ success: true, post });
  } catch (error) {
    console.error('Social post error:', error);
    return NextResponse.json(
      { error: 'Failed to generate post', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
