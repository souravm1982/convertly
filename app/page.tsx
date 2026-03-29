"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import Navbar from "@/components/Navbar";
import ReelCreator from "@/components/ReelCreator";
import PhotoSetGenerator from "@/components/PhotoSetGenerator";
import AdCreator from "@/components/AdCreator";
import ThemeGenerator from "@/components/ThemeGenerator";

export default function Home() {
  const { data: session, status } = useSession();
  const [activeTab, setActiveTab] = useState("reel-creator");

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-gray-50/50 flex items-center justify-center">
        <div className="animate-pulse text-violet-500 font-medium">Loading...</div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-gray-50/50">
        <nav className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-100 shadow-sm">
          <div className="max-w-6xl mx-auto px-6 flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-violet-500 to-fuchsia-500 rounded-lg flex items-center justify-center">
                <span className="text-white text-sm font-bold">C</span>
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-violet-600 to-fuchsia-600 bg-clip-text text-transparent">Convertly</span>
            </div>
            <a href="/login" className="bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white text-sm font-semibold px-5 py-2.5 rounded-full hover:shadow-lg hover:shadow-violet-200 transition-all">
              Sign In
            </a>
          </div>
        </nav>
        <main className="max-w-3xl mx-auto px-6 pt-32 pb-16 text-center">
          <h1 className="text-5xl font-bold text-gray-900 leading-tight">
            Create stunning <span className="bg-gradient-to-r from-violet-600 to-fuchsia-600 bg-clip-text text-transparent">Reels, Photo Sets & Ads</span> with AI
          </h1>
          <p className="text-lg text-gray-500 mt-4 max-w-xl mx-auto">
            Turn your product into scroll-stopping content. Generate photo carousels, video reels, and ad creatives in minutes.
          </p>
          <div className="flex gap-3 justify-center mt-8">
            <a href="/login" className="bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white font-semibold px-8 py-3.5 rounded-full hover:shadow-lg hover:shadow-violet-200 transition-all text-lg">
              Get Started Free
            </a>
          </div>
          <div className="flex justify-center gap-8 mt-12 text-sm text-gray-400">
            <span>🎬 Reel Creator</span>
            <span>📸 Photo Set Magic</span>
            <span>🎯 Ad Creator</span>
            <span>🌍 Theme Magic</span>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50/50">
      <Navbar activeTab={activeTab} onTabChange={setActiveTab} />
      <main className="max-w-5xl mx-auto px-6 pt-24 pb-16">
        <div className={activeTab === "reel-creator" ? "" : "hidden"}><ReelCreator /></div>
        <div className={activeTab === "photo-set" ? "" : "hidden"}><PhotoSetGenerator /></div>
        <div className={activeTab === "ad-creator" ? "" : "hidden"}><AdCreator /></div>
        <div className={activeTab === "theme-magic" ? "" : "hidden"}><ThemeGenerator /></div>
      </main>
    </div>
  );
}
