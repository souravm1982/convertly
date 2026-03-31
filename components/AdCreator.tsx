"use client";

import { useState, useRef } from "react";

interface Product {
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

interface AdCopy {
  headline: string;
  subheadline: string;
  cta: string;
  description: string;
}

interface GeneratedAd {
  url: string;
  s3Key: string;
  template: string;
}

const TEMPLATES = [
  { id: "product-showcase", label: "Product Showcase", emoji: "✨", desc: "Clean centered layout" },
  { id: "sale-banner", label: "Sale Banner", emoji: "🔥", desc: "Bold promotional style" },
  { id: "lifestyle", label: "Lifestyle", emoji: "🌿", desc: "Aspirational mood" },
  { id: "minimal", label: "Minimal", emoji: "◻️", desc: "Clean white background" },
];

export default function AdCreator({ meteredFetch }: { meteredFetch: typeof fetch }) {
  const [storeUrl, setStoreUrl] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [productCount, setProductCount] = useState(0);
  const [scraping, setScraping] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState("product-showcase");
  const [adCopy, setAdCopy] = useState<AdCopy | null>(null);
  const [generatingCopy, setGeneratingCopy] = useState(false);
  const [generatedAds, setGeneratedAds] = useState<GeneratedAd[]>([]);
  const [generatingAd, setGeneratingAd] = useState(false);
  const [removeBg, setRemoveBg] = useState(false);
  const [removePrice, setRemovePrice] = useState(true);
  const [productScale, setProductScale] = useState(2.5);
  const [customBgPrompt, setCustomBgPrompt] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sourceMode, setSourceMode] = useState<"shopify" | "manual">("shopify");
  const [manualTitle, setManualTitle] = useState("");
  const [manualPrice, setManualPrice] = useState("");
  const [manualDesc, setManualDesc] = useState("");
  const [manualImageUrl, setManualImageUrl] = useState("");
  const [manualImagePreview, setManualImagePreview] = useState("");
  const [uploadingImage, setUploadingImage] = useState(false);

  const handleScrape = async () => {
    if (!storeUrl.trim()) return;
    setScraping(true); setError(null); setProducts([]); setSelectedProduct(null); setAdCopy(null); setGeneratedAds([]); setSearchQuery("");
    try {
      const res = await meteredFetch("/api/scrape-store", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: storeUrl }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.details || data.error);
      setProducts(data.products);
      setProductCount(data.productCount);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to scrape store");
    } finally { setScraping(false); }
  };

  const adBuilderRef = useRef<HTMLDivElement>(null);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append("files", file);
      const res = await meteredFetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error);
      const uploadedUrl = data.files[0].url;
      setManualImageUrl(uploadedUrl);
      setManualImagePreview(uploadedUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally { setUploadingImage(false); }
  };

  const handleManualProduct = () => {
    const product: Product = {
      id: Date.now(),
      title: manualTitle || "Product",
      description: manualDesc,
      price: manualPrice || "0",
      compareAtPrice: null,
      image: manualImagePreview,
      images: [manualImagePreview],
      vendor: "",
      productType: "",
      tags: [],
      handle: "",
      url: "",
    };
    handleSelectProduct(product);
  };

  const handleSelectProduct = async (product: Product) => {
    setSelectedProduct(product);
    setAdCopy(null); setGeneratedAds([]);
    setGeneratingCopy(true); setError(null);
    setTimeout(() => adBuilderRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
    try {
      const res = await meteredFetch("/api/generate-ad-copy", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ product, template: selectedTemplate }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.details || data.error);
      setAdCopy(data.adCopy);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate ad copy");
    } finally { setGeneratingCopy(false); }
  };

  const handleGenerateAd = async () => {
    if (!selectedProduct || !adCopy) return;
    setGeneratingAd(true); setError(null);
    try {
      const res = await meteredFetch("/api/generate-ad", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ product: selectedProduct, adCopy, template: selectedTemplate, removeBg, removePrice, productScale, customBgPrompt: customBgPrompt.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.details || data.error);
      setGeneratedAds([data.image, ...generatedAds]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate ad");
    } finally { setGeneratingAd(false); }
  };

  const handleDownload = (ad: GeneratedAd) => {
    const a = document.createElement("a");
    a.href = `/api/download-image?key=${encodeURIComponent(ad.s3Key)}&filename=ad-${ad.template}.png`;
    a.download = `ad-${ad.template}.png`;
    a.click();
  };

  const filteredProducts = products.filter(p =>
    !searchQuery || p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      <div className="text-center mb-2">
        <h2 className="text-2xl font-bold text-gray-900">Ad Creator</h2>
        <p className="text-gray-500 mt-1">Scan a Shopify store or add your product manually.</p>
      </div>

      {/* Source Tabs */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
        <div className="flex gap-2">
          <button onClick={() => setSourceMode("shopify")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${sourceMode === "shopify" ? "bg-violet-100 text-violet-700" : "bg-gray-50 text-gray-500 hover:bg-gray-100"}`}>
            🛍️ Shopify Store
          </button>
          <button onClick={() => setSourceMode("manual")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${sourceMode === "manual" ? "bg-violet-100 text-violet-700" : "bg-gray-50 text-gray-500 hover:bg-gray-100"}`}>
            📤 Manual Upload
          </button>
        </div>

        {sourceMode === "shopify" ? (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Shopify Store URL</label>
            <div className="flex gap-3">
              <input
                type="text" value={storeUrl} onChange={(e) => setStoreUrl(e.target.value)}
                placeholder="e.g. mystore.myshopify.com or mystore.com"
                onKeyDown={(e) => e.key === "Enter" && handleScrape()}
                className="flex-1 px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-violet-200 focus:border-violet-300 outline-none"
              />
              <button onClick={handleScrape} disabled={scraping || !storeUrl.trim()}
                className="bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white font-semibold py-3 px-6 rounded-xl disabled:opacity-50 hover:shadow-lg hover:shadow-violet-200 transition-all whitespace-nowrap">
                {scraping ? "Scanning..." : "Scan Store"}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-500">Product Name</label>
                <input value={manualTitle} onChange={(e) => setManualTitle(e.target.value)}
                  placeholder="e.g. Handmade Ceramic Mug"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-violet-200 outline-none" />
              </div>
              <div>
                <label className="text-xs text-gray-500">Price</label>
                <input value={manualPrice} onChange={(e) => setManualPrice(e.target.value)}
                  placeholder="e.g. 29.99"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-violet-200 outline-none" />
              </div>
            </div>
            <div>
              <label className="text-xs text-gray-500">Description</label>
              <input value={manualDesc} onChange={(e) => setManualDesc(e.target.value)}
                placeholder="Short product description"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-violet-200 outline-none" />
            </div>
            <div>
              <label className="text-xs text-gray-500">Product Image *</label>
              <div className="flex gap-3 mt-1 items-center">
                {manualImagePreview ? (
                  <div className="flex items-center gap-3">
                    <img src={manualImagePreview} alt="Preview" className="w-16 h-16 object-contain rounded-lg bg-gray-50 border border-gray-100" />
                    <button onClick={() => { setManualImageUrl(""); setManualImagePreview(""); }}
                      className="text-xs text-red-500 hover:text-red-600">Remove</button>
                  </div>
                ) : (
                  <>
                    <input value={manualImageUrl} onChange={(e) => { setManualImageUrl(e.target.value); setManualImagePreview(e.target.value); }}
                      placeholder="Paste image URL"
                      className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-violet-200 outline-none" />
                    <label className="bg-gray-50 hover:bg-gray-100 text-gray-600 text-sm font-medium px-4 py-2 rounded-lg border border-gray-200 cursor-pointer transition-all">
                      Upload
                      <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                    </label>
                  </>
                )}
              </div>
            </div>
            <button onClick={handleManualProduct} disabled={!manualImagePreview}
              className="w-full bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white font-semibold py-3 rounded-xl disabled:opacity-50 hover:shadow-lg hover:shadow-violet-200 transition-all">
              ✨ Create Ad for This Product
            </button>
          </div>
        )}
      </div>

      {error && <div className="p-3 bg-red-50 border border-red-200 text-red-600 rounded-xl text-sm">{error}</div>}

      {/* Products Grid */}
      {products.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold text-gray-900">{productCount} Products Found</h3>
            <input
              type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search products..."
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-violet-200 outline-none w-48"
            />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {filteredProducts.map((p) => (
              <div key={p.id} onClick={() => handleSelectProduct(p)}
                className={`cursor-pointer rounded-xl border p-3 transition-all ${selectedProduct?.id === p.id ? "ring-2 ring-violet-500 border-violet-200 bg-violet-50/50" : "border-gray-100 hover:border-gray-200"}`}>
                {p.image && <img src={p.image} alt={p.title} className="w-full aspect-square object-contain rounded-lg bg-gray-50 mb-2" />}
                <p className="text-sm font-semibold text-gray-800 truncate">{p.title}</p>
                <p className="text-sm text-violet-600 font-bold">${p.price}</p>
                {p.compareAtPrice && <p className="text-xs text-gray-400 line-through">${p.compareAtPrice}</p>}
                {p.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {p.tags.slice(0, 2).map((t, i) => (
                      <span key={i} className="text-[10px] bg-gray-50 text-gray-400 px-1.5 py-0.5 rounded">{t}</span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Ad Builder */}
      {selectedProduct && (
        <div ref={adBuilderRef} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">
          <div>
            <h3 className="text-lg font-bold text-gray-900">Build Ad for: {selectedProduct.title}</h3>
            <a href={selectedProduct.url} target="_blank" rel="noopener noreferrer" className="text-xs text-violet-500 hover:underline">{selectedProduct.url}</a>
            {selectedProduct.description && (
              <p className="text-xs text-gray-400 mt-1 line-clamp-2">{selectedProduct.description}</p>
            )}
          </div>

          {/* Template Picker */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Template</label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {TEMPLATES.map((t) => (
                <button key={t.id} onClick={() => setSelectedTemplate(t.id)}
                  className={`p-3 rounded-xl border text-left transition-all ${selectedTemplate === t.id ? "ring-2 ring-violet-500 border-violet-200 bg-violet-50" : "border-gray-100 hover:border-gray-200"}`}>
                  <span className="text-lg">{t.emoji}</span>
                  <p className="text-sm font-semibold text-gray-800 mt-1">{t.label}</p>
                  <p className="text-xs text-gray-400">{t.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Ad Copy Editor */}
          {generatingCopy ? (
            <div className="text-center py-6">
              <div className="inline-flex items-center gap-2 text-violet-600 animate-pulse font-medium">
                <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                Generating ad copy...
              </div>
            </div>
          ) : adCopy && (
            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-700">Ad Copy (editable)</label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500">Headline</label>
                  <input value={adCopy.headline} onChange={(e) => setAdCopy({ ...adCopy, headline: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-violet-200 outline-none" />
                </div>
                <div>
                  <label className="text-xs text-gray-500">Subheadline</label>
                  <input value={adCopy.subheadline} onChange={(e) => setAdCopy({ ...adCopy, subheadline: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-violet-200 outline-none" />
                </div>
                <div>
                  <label className="text-xs text-gray-500">CTA Button</label>
                  <input value={adCopy.cta} onChange={(e) => setAdCopy({ ...adCopy, cta: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-violet-200 outline-none" />
                </div>
                <div>
                  <label className="text-xs text-gray-500">Description</label>
                  <input value={adCopy.description} onChange={(e) => setAdCopy({ ...adCopy, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-violet-200 outline-none" />
                </div>
              </div>
              <div className="flex gap-4 items-center py-2">
                <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-700">
                  <input type="checkbox" checked={removeBg} onChange={(e) => setRemoveBg(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 text-violet-600 focus:ring-violet-500" />
                  Remove Background
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-700">
                  <input type="checkbox" checked={removePrice} onChange={(e) => setRemovePrice(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 text-violet-600 focus:ring-violet-500" />
                  Remove Price
                </label>
                <div className="flex items-center gap-1.5 text-sm text-gray-700">
                  <span>Product Size</span>
                  <button onClick={() => setProductScale(s => Math.max(1.5, +(s - 0.5).toFixed(1)))}
                    className="w-6 h-6 rounded bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold text-xs">▼</button>
                  <span className="font-semibold w-8 text-center">{productScale}x</span>
                  <button onClick={() => setProductScale(s => Math.min(3.5, +(s + 0.5).toFixed(1)))}
                    className="w-6 h-6 rounded bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold text-xs">▲</button>
                  <span className="text-xs text-gray-400">(2.5x rec.)</span>
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-500">Custom Background Prompt <span className="text-gray-400">(optional — describe the background you want)</span></label>
                <input value={customBgPrompt} onChange={(e) => setCustomBgPrompt(e.target.value)}
                  placeholder="e.g. tropical beach sunset, rustic wooden table, neon city lights..."
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-violet-200 outline-none mt-1" />
              </div>
              <button onClick={handleGenerateAd} disabled={generatingAd}
                className="w-full bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white font-semibold py-3 rounded-xl disabled:opacity-50 hover:shadow-lg hover:shadow-violet-200 transition-all">
                {generatingAd ? "Generating Ad..." : "🎨 Generate Ad Image"}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Generated Ads */}
      {generatedAds.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Generated Ads</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {generatedAds.map((ad, i) => (
              <div key={i} className="rounded-xl border border-gray-100 p-3">
                <img src={ad.url} alt={`Ad ${i + 1}`} className="w-full aspect-square object-contain rounded-lg bg-gray-50" />
                <div className="flex gap-2 mt-3">
                  <button onClick={() => handleDownload(ad)}
                    className="flex-1 bg-gray-900 text-white text-sm font-semibold py-2 rounded-lg hover:bg-gray-800 transition-all">
                    ⬇ Download
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
