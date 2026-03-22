"use client";

import { useState } from "react";

interface GeneratedImage {
  url: string;
  s3Key: string;
  theme: string;
  prompt: string;
  headline: string;
  bodyText: string;
  footer?: string;
}

const THEME_EMOJIS = ["✨", "🔬", "📋", "🐕", "🕯️", "💬", "🛒"];
const THEME_NAMES = ["The Hook", "Taste Journey", "Blueprint", "Impact", "Vibe", "Social Proof", "CTA"];

export default function PhotoSetGenerator() {
  const [prompt, setPrompt] = useState("");
  const [images, setImages] = useState<GeneratedImage[]>([]);
  const [generating, setGenerating] = useState(false);
  const [generatingIndex, setGeneratingIndex] = useState<number | null>(null);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editFields, setEditFields] = useState({ prompt: "", headline: "", bodyText: "", footer: "" });
  const [error, setError] = useState<string | null>(null);
  const [creatingReel, setCreatingReel] = useState(false);
  const [reelUrl, setReelUrl] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setGenerating(true); setError(null); setImages([]);
    const results: GeneratedImage[] = [];
    try {
      for (let i = 0; i < 7; i++) {
        setGeneratingIndex(i);
        const response = await fetch("/api/generate-images", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt, regenerateIndex: i }),
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.details || result.error);
        results.push(result.image);
        setImages([...results]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate images");
    } finally { setGenerating(false); setGeneratingIndex(null); }
  };

  const handleRegenerate = async (index: number) => {
    setGeneratingIndex(index); setError(null);
    try {
      const response = await fetch("/api/generate-images", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, regenerateIndex: index, customPrompt: editFields.prompt, headline: editFields.headline }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.details || result.error);
      const updated = [...images]; updated[index] = result.image; setImages(updated);
      setEditingIndex(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to regenerate");
    } finally { setGeneratingIndex(null); }
  };

  const handleDownloadAll = async () => {
    for (const img of images) {
      const filename = `${img.theme.toLowerCase().replace(/\s+/g, "-")}.png`;
      const a = document.createElement("a");
      a.href = `/api/download-image?key=${encodeURIComponent(img.s3Key)}&filename=${encodeURIComponent(filename)}`;
      a.download = filename; a.click();
      await new Promise((r) => setTimeout(r, 500));
    }
  };

  const startEdit = (index: number) => {
    const img = images[index];
    setEditingIndex(index);
    setEditFields({ prompt: img.prompt, headline: img.headline, bodyText: img.bodyText, footer: img.footer || "" });
  };

  const handleCreateReel = async () => {
    if (images.length < 2) return;
    setCreatingReel(true); setError(null); setReelUrl(null);
    try {
      const response = await fetch("/api/create-reel", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          images: images.map(img => ({ s3Key: img.s3Key })),
          transitionDuration: 2,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.details || result.error);
      setReelUrl(result.videoUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create reel");
    } finally { setCreatingReel(false); }
  };

  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className="text-center mb-2">
        <h2 className="text-2xl font-bold text-gray-900">Photo Set Magic</h2>
        <p className="text-gray-500 mt-1">Catchy photo set ready in minutes — powered by AI.</p>
      </div>

      {/* Prompt */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">Product / Theme</label>
        <div className="flex gap-3">
          <input
            type="text" value={prompt} onChange={(e) => setPrompt(e.target.value)}
            placeholder="e.g. Brazil single blend coffee, Organic matcha tea..."
            className="flex-1 px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-violet-200 focus:border-violet-300 outline-none"
          />
          <button
            onClick={handleGenerate} disabled={generating || !prompt.trim()}
            className="bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white font-semibold py-3 px-6 rounded-xl disabled:opacity-50 hover:shadow-lg hover:shadow-violet-200 transition-all whitespace-nowrap"
          >
            {generating ? "Generating..." : "Generate 7 Slides"}
          </button>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {THEME_NAMES.map((l, i) => (
            <span key={i} className="text-xs bg-gray-50 text-gray-500 px-3 py-1 rounded-full border border-gray-100">{THEME_EMOJIS[i]} {l}</span>
          ))}
        </div>
      </div>

      {generating && images.length === 0 && (
        <div className="text-center py-12">
          <div className="inline-flex items-center gap-3 bg-violet-50 text-violet-600 px-6 py-3 rounded-full animate-pulse font-medium">
            <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
            Generating slide 1 of 7...
          </div>
        </div>
      )}

      {error && <div className="p-3 bg-red-50 border border-red-200 text-red-600 rounded-xl text-sm">{error}</div>}

      {/* Results */}
      {images.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold text-gray-900">
              {generating ? `Generating slide ${images.length + 1} of 7...` : "Your Slides"}
            </h3>
            {!generating && (
              <div className="flex gap-2">
                <button onClick={handleCreateReel} disabled={creatingReel || images.length < 2}
                  className="bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white text-sm font-semibold py-2 px-5 rounded-full hover:shadow-lg hover:shadow-violet-200 transition-all disabled:opacity-50">
                  {creatingReel ? "Creating Reel..." : "🎬 Create Reel"}
                </button>
                <button onClick={handleDownloadAll} className="bg-gray-900 text-white text-sm font-semibold py-2 px-5 rounded-full hover:bg-gray-800 transition-all">
                  ⬇ Download All
                </button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {images.map((img, index) => (
              <div key={index} className="rounded-xl border border-gray-100 p-3 hover:border-gray-200 transition-all">
                {generatingIndex === index ? (
                  <div className="w-full aspect-square bg-gray-50 rounded-lg flex items-center justify-center animate-pulse text-violet-500 font-medium text-sm">✨ Regenerating...</div>
                ) : (
                  <img src={img.url} alt={img.theme} className="w-full aspect-square object-contain rounded-lg bg-gray-50" />
                )}
                <div className="mt-2">
                  <p className="text-sm font-semibold text-gray-800">{THEME_EMOJIS[index]} Slide {index + 1}: {img.theme}</p>
                  <p className="text-xs text-gray-600 mt-0.5 font-medium">"{img.headline}"</p>
                  <p className="text-xs text-gray-400 mt-0.5">{img.bodyText}</p>
                  {img.footer && <p className="text-xs text-gray-300 mt-0.5 italic">{img.footer}</p>}
                </div>

                {editingIndex === index ? (
                  <div className="mt-3 space-y-2">
                    <div>
                      <label className="text-xs font-medium text-gray-600">Visual Prompt:</label>
                      <textarea value={editFields.prompt} onChange={(e) => setEditFields({ ...editFields, prompt: e.target.value })} rows={3} className="w-full text-xs px-3 py-2 border border-gray-200 rounded-lg resize-none mt-1 focus:ring-2 focus:ring-violet-200 outline-none" />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-600">Headline:</label>
                      <input value={editFields.headline} onChange={(e) => setEditFields({ ...editFields, headline: e.target.value })} className="w-full text-xs px-3 py-2 border border-gray-200 rounded-lg mt-1 focus:ring-2 focus:ring-violet-200 outline-none" />
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => handleRegenerate(index)} disabled={!editFields.prompt.trim()} className="flex-1 bg-violet-500 text-white text-xs py-1.5 rounded-lg disabled:opacity-50">Regenerate</button>
                      <button onClick={() => setEditingIndex(null)} className="flex-1 bg-gray-100 text-gray-600 text-xs py-1.5 rounded-lg">Cancel</button>
                    </div>
                  </div>
                ) : (
                  <button onClick={() => startEdit(index)} className="w-full mt-2 bg-gray-50 hover:bg-gray-100 text-gray-600 text-xs py-1.5 rounded-lg transition-all border border-gray-100">
                    ✏️ Modify
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Reel */}
          {reelUrl && (
            <div className="border-t border-gray-100 pt-4 mt-4">
              <h4 className="text-sm font-bold text-gray-900 mb-3">🎬 Your Reel</h4>
              <video controls className="w-full max-w-md mx-auto rounded-xl" src={reelUrl} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
