import { NextRequest, NextResponse } from 'next/server';

export interface ScrapedProduct {
  id: number;
  title: string;
  description: string;
  price: string;
  compareAtPrice: string | null;
  image: string;
  images: string[];
  vendor: string;
  productType: string;
  tags: string[];
  handle: string;
  url: string;
}

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();
    if (!url) return NextResponse.json({ error: 'URL is required' }, { status: 400 });

    let baseUrl: string;
    try {
      const parsed = new URL(url.startsWith('http') ? url : `https://${url}`);
      baseUrl = `${parsed.protocol}//${parsed.host}`;
    } catch {
      return NextResponse.json({ error: 'Invalid URL' }, { status: 400 });
    }

    const res = await fetch(`${baseUrl}/products.json?limit=100`, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
    });

    if (!res.ok) {
      return NextResponse.json({ error: 'Could not fetch products. Make sure this is a Shopify store.' }, { status: 400 });
    }

    const data = await res.json();
    const products: ScrapedProduct[] = data.products.map((p: any) => ({
      id: p.id,
      title: p.title,
      description: (p.body_html || '').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim().slice(0, 300),
      price: p.variants?.[0]?.price || '0',
      compareAtPrice: p.variants?.[0]?.compare_at_price || null,
      image: p.images?.[0]?.src || '',
      images: (p.images || []).map((img: any) => img.src),
      vendor: p.vendor || '',
      productType: p.product_type || '',
      tags: p.tags ? (typeof p.tags === 'string' ? p.tags.split(', ') : p.tags) : [],
      handle: p.handle,
      url: `${baseUrl}/products/${p.handle}`,
    }));

    return NextResponse.json({ success: true, storeName: baseUrl, productCount: products.length, products });
  } catch (error) {
    console.error('Scrape error:', error);
    return NextResponse.json(
      { error: 'Failed to scrape store', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
