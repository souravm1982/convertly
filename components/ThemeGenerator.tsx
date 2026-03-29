"use client";

import { useState } from "react";

interface SlideData {
  title: string;
  imagePrompt: string;
}

interface GeneratedSlide {
  url: string;
  s3Key: string;
  title: string;
  prompt: string;
}

const SUGGESTIONS = [
  "Top 5 Wonders of the World",
  "Top 5 National Parks in the US",
  "Our Solar System",
  "Top 5 Coffee Origins",
  "5 Most Beautiful Beaches",
  "Top 5 Ancient Civilizations",
];

export default function ThemeGenerator() {
  const [theme, setTheme] = useState("");
  const [slides, setSlides] = useState<SlideData[]>([]);
  const [images, setImages] = useState<GeneratedSlide[]>([]);
  const [generating, setGenerating] = useState(false);
  const [generatingIndex, setGeneratingIndex] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [socialPost, setSocialPost] = useState<string | null>(null);
  const [generatingPost, setGeneratingPost] = useState(false);
  const [tagline, setTagline] = useState<string | null>(null);

  const generateSocialPost = async (t: string) => {
    setGeneratingPost(true);
    try {
      const res = await fetch("/api/generate-social-post", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: t }),
      });
      const data = await res.json();
      if (res.ok && data.post) setSocialPost(data.post);
    } catch {} finally { setGeneratingPost(false); }
  };

  const handleGenerate = async () => {
    if (!theme.trim()) return;
    setGenerating(true); setError(null); setImages([]); setSlides([]); setSocialPost(null);
    setTagline(theme.trim());

    try {
      setGeneratingIndex(-1);
      const planRes = await fetch("/api/generate-theme-slides", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ theme }),
      });
      const planData = await planRes.json();
      if (!planRes.ok) throw new Error(planData.details || planData.error);
      const planned: SlideData[] = planData.slides;
      setSlides(planned);

      generateSocialPost(theme);

      const results: GeneratedSlide[] = [];
      for (let i = 0; i < planned.length; i++) {
        setGeneratingIndex(i);
        const res = await fetch("/api/generate-theme-slides", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ theme, slideIndex: i, slides: planned }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.details || data.error);
        results.push(data.image);
        setImages([...results]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate slides");
    } finally { setGenerating(false); setGeneratingIndex(null); }
  };

  const handleDownloadAll = async () => {
    for (let i = 0; i < images.length; i++) {
      const a = document.createElement("a");
      a.href = `/api/download-image?key=${encodeURIComponent(images[i].s3Key)}&filename=slide-${i + 1}.png`;
      a.download = `slide-${i + 1}.png`; a.click();
      await new Promise((r) => setTimeout(r, 500));
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-2">
        <h2 className="text-2xl font-bold text-gray-900">Theme Magic</h2>
        <p className="text-gray-500 mt-1">Enter any theme — AI plans and generates 5 stunning slides.</p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Theme</label>
          <input
            type="text" value={theme} onChange={(e) => setTheme(e.target.value)}
            placeholder="e.g. Top 5 Wonders of the World"
            onKeyDown={(e) => e.key === "Enter" && handleGenerate()}
            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-violet-200 focus:border-violet-300 outline-none"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {SUGGESTIONS.map((s, i) => (
            <button key={i} onClick={() => setTheme(s)}
              className="text-xs bg-gray-50 text-gray-500 px-3 py-1.5 rounded-full border border-gray-100 hover:bg-violet-50 hover:text-violet-600 hover:border-violet-200 transition-all">
              {s}
            </button>
          ))}
        </div>
        <button onClick={handleGenerate} disabled={generating || !theme.trim()}
          className="w-full bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white font-semibold py-3 rounded-xl disabled:opacity-50 hover:shadow-lg hover:shadow-violet-200 transition-all">
          {generating ? "Generating..." : "✨ Generate 5 Slides"}
        </button>
      </div>

      {generating && images.length === 0 && (
        <div className="text-center py-12">
          <div className="inline-flex items-center gap-3 bg-violet-50 text-violet-600 px-6 py-3 rounded-full animate-pulse font-medium">
            <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
            {generatingIndex === -1 ? "Planning slides with AI..." : `Generating slide ${(generatingIndex ?? 0) + 1} of 5...`}
          </div>
        </div>
      )}

      {error && <div className="p-3 bg-red-50 border border-red-200 text-red-600 rounded-xl text-sm">{error}</div>}

      {tagline && images.length > 0 && (
        <div className="bg-gradient-to-r from-violet-50 to-fuchsia-50 rounded-2xl border border-violet-100 p-5 text-center">
          <p className="text-xs uppercase tracking-wider text-violet-400 font-semibold mb-1">Theme</p>
          <p className="text-xl font-bold text-gray-900 break-words">{tagline}</p>
          {slides.length > 0 && (
            <div className="flex flex-wrap justify-center gap-2 mt-3">
              {slides.map((s, i) => (
                <span key={i} className="text-xs bg-white text-gray-600 px-3 py-1 rounded-full border border-violet-100">
                  {i + 1}. {s.title}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {(socialPost || generatingPost) && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-sm font-bold text-gray-900">📱 Social Media Post</h3>
            {socialPost && (
              <button onClick={() => navigator.clipboard.writeText(socialPost)}
                className="text-xs text-violet-600 hover:text-violet-700 font-medium">📋 Copy</button>
            )}
          </div>
          {generatingPost ? (
            <p className="text-sm text-violet-500 animate-pulse">Generating post...</p>
          ) : (
            <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{socialPost}</p>
          )}
        </div>
      )}

      {images.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold text-gray-900">
              {generating ? `Generating slide ${images.length + 1} of 5...` : "Your Slides"}
            </h3>
            {!generating && (
              <button onClick={handleDownloadAll}
                className="bg-gray-900 text-white text-sm font-semibold py-2 px-5 rounded-full hover:bg-gray-800 transition-all">
                ⬇ Download All
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {images.map((img, index) => (
              <div key={index} className="rounded-xl border border-gray-100 p-3 hover:border-gray-200 transition-all">
                <img src={img.url} alt={img.title} className="w-full aspect-square object-contain rounded-lg bg-gray-50" />
                <p className="text-sm font-semibold text-gray-800 mt-2">Slide {index + 1}: {img.title}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
