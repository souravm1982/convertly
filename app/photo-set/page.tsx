"use client";

import { useState } from "react";
import Link from "next/link";

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

export default function PhotoSet() {
  const [prompt, setPrompt] = useState("Brazil single blend coffee");
  const [images, setImages] = useState<GeneratedImage[]>([]);
  const [generating, setGenerating] = useState(false);
  const [generatingIndex, setGeneratingIndex] = useState<number | null>(null);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editFields, setEditFields] = useState({ prompt: "", headline: "", bodyText: "", footer: "" });
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setGenerating(true);
    setError(null);
    setImages([]);
    try {
      const response = await fetch("/api/generate-images", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.details || result.error);
      setImages(result.images);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate images");
    } finally {
      setGenerating(false);
    }
  };

  const handleRegenerate = async (index: number) => {
    setGeneratingIndex(index);
    setError(null);
    try {
      const response = await fetch("/api/generate-images", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          regenerateIndex: index,
          customPrompt: editFields.prompt,
          headline: editFields.headline,
          bodyText: editFields.bodyText,
          footer: editFields.footer || undefined,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.details || result.error);
      const updated = [...images];
      updated[index] = result.image;
      setImages(updated);
      setEditingIndex(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to regenerate");
    } finally {
      setGeneratingIndex(null);
    }
  };

  const handleDownloadAll = async () => {
    for (const img of images) {
      const filename = `${img.theme.toLowerCase().replace(/\s+/g, "-")}.png`;
      const a = document.createElement("a");
      a.href = `/api/download-image?key=${encodeURIComponent(img.s3Key)}&filename=${encodeURIComponent(filename)}`;
      a.download = filename;
      a.click();
      await new Promise((r) => setTimeout(r, 500));
    }
  };

  const startEdit = (index: number) => {
    const img = images[index];
    setEditingIndex(index);
    setEditFields({ prompt: img.prompt, headline: img.headline, bodyText: img.bodyText, footer: img.footer || "" });
  };

  return (
    <main className="flex min-h-screen flex-col items-center p-8">
      <div className="z-10 max-w-5xl w-full">
        <Link href="/" className="text-blue-500 hover:underline text-sm mb-4 inline-block">← Back to Reel Creator</Link>

        <h1 className="text-4xl font-bold mb-8 text-center">📸 AI Photo Set Generator</h1>

        {/* Prompt Input */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-6">
          <label className="block text-sm font-medium mb-2">Product / Theme Prompt</label>
          <div className="flex gap-3">
            <input
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g. Brazil single blend coffee"
              className="flex-1 px-4 py-3 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
            />
            <button
              onClick={handleGenerate}
              disabled={generating || !prompt.trim()}
              className="bg-purple-500 hover:bg-purple-700 text-white font-bold py-3 px-6 rounded-lg disabled:opacity-50 whitespace-nowrap"
            >
              {generating ? "Generating..." : "Generate 7 Slides"}
            </button>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {["The Hook", "Taste Journey", "Blueprint", "Impact", "Vibe", "Social Proof", "CTA"].map((l, i) => (
              <span key={i} className="text-xs bg-gray-100 dark:bg-gray-700 px-3 py-1 rounded-full">{THEME_EMOJIS[i]} {l}</span>
            ))}
          </div>
        </div>

        {generating && (
          <div className="text-center py-8 text-purple-600 dark:text-purple-400 animate-pulse text-lg font-medium">
            ✨ Generating 7 slides... This may take a couple minutes ☕
          </div>
        )}

        {error && <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">{error}</div>}

        {/* Generated Slides */}
        {images.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-semibold">Generated Slides</h2>
              <button onClick={handleDownloadAll} className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-lg">
                ⬇️ Download All
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {images.map((img, index) => (
                <div key={index} className="border rounded-lg p-3 dark:border-gray-700">
                  {generatingIndex === index ? (
                    <div className="w-full h-64 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center animate-pulse">✨ Regenerating...</div>
                  ) : (
                    <img src={img.url} alt={img.theme} className="w-full h-64 object-cover rounded-lg" />
                  )}

                  <p className="text-sm font-semibold mt-2">{THEME_EMOJIS[index]} Slide {index + 1}: {img.theme}</p>
                  <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mt-1">"{img.headline}"</p>
                  <p className="text-xs text-gray-500 mt-0.5">{img.bodyText}</p>
                  {img.footer && <p className="text-xs text-gray-400 mt-0.5 italic">{img.footer}</p>}

                  {editingIndex === index ? (
                    <div className="mt-2 space-y-2">
                      <div>
                        <label className="text-xs font-medium">Visual Prompt:</label>
                        <textarea value={editFields.prompt} onChange={(e) => setEditFields({ ...editFields, prompt: e.target.value })} rows={3} className="w-full text-xs px-2 py-1 border rounded dark:bg-gray-700 resize-none mt-1" />
                      </div>
                      <div>
                        <label className="text-xs font-medium">Headline:</label>
                        <input value={editFields.headline} onChange={(e) => setEditFields({ ...editFields, headline: e.target.value })} className="w-full text-xs px-2 py-1 border rounded dark:bg-gray-700 mt-1" />
                      </div>
                      <div>
                        <label className="text-xs font-medium">Body Text:</label>
                        <textarea value={editFields.bodyText} onChange={(e) => setEditFields({ ...editFields, bodyText: e.target.value })} rows={2} className="w-full text-xs px-2 py-1 border rounded dark:bg-gray-700 resize-none mt-1" />
                      </div>
                      <div>
                        <label className="text-xs font-medium">Footer (optional):</label>
                        <input value={editFields.footer} onChange={(e) => setEditFields({ ...editFields, footer: e.target.value })} className="w-full text-xs px-2 py-1 border rounded dark:bg-gray-700 mt-1" />
                      </div>
                      <div className="flex gap-1">
                        <button onClick={() => handleRegenerate(index)} disabled={!editFields.prompt.trim()} className="flex-1 bg-purple-500 hover:bg-purple-600 text-white text-xs py-1 rounded disabled:opacity-50">Regenerate</button>
                        <button onClick={() => setEditingIndex(null)} className="flex-1 bg-gray-500 hover:bg-gray-600 text-white text-xs py-1 rounded">Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <button onClick={() => startEdit(index)} className="w-full mt-2 bg-blue-500 hover:bg-blue-600 text-white text-xs py-1 rounded">
                      ✏️ Modify
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
