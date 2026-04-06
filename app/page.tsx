"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import Navbar from "@/components/Navbar";
import ReelCreator from "@/components/ReelCreator";
import PhotoSetGenerator from "@/components/PhotoSetGenerator";
import AdCreator from "@/components/AdCreator";
import ThemeGenerator from "@/components/ThemeGenerator";
import UpsellModal from "@/components/UpsellModal";
import { useMeteredFetch } from "@/hooks/useMeteredFetch";
import { TierName } from "@/config/billing.config";

export default function Home() {
  const { data: session, status } = useSession();
  const [activeTab, setActiveTab] = useState("photo-set");
  const [userTier, setUserTier] = useState<TierName>("free");
  const { meteredFetch, upsell, closeUpsell, handleUpgrade: baseUpgrade } = useMeteredFetch();

  const fetchTier = async () => {
    try {
      const res = await fetch("/api/usage");
      if (res.ok) {
        const data = await res.json();
        setUserTier(data.tier);
      }
    } catch {}
  };

  useEffect(() => {
    if (session?.user) fetchTier();
  }, [session]);

  const handleTabChange = (tab: string) => {
    if (tab.startsWith('upgrade:')) {
      const tier = tab.split(':')[1] as TierName;
      handleUpgrade(tier);
      return;
    }
    setActiveTab(tab);
  };

  const handleUpgrade = async (tier: TierName) => {
    await baseUpgrade(tier);
    setUserTier(tier);
  };

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
          <div className="max-w-6xl mx-auto px-4 sm:px-6 flex items-center justify-between h-14 sm:h-16">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 sm:w-8 sm:h-8 bg-gradient-to-br from-violet-500 to-fuchsia-500 rounded-lg flex items-center justify-center">
                <span className="text-white text-xs sm:text-sm font-bold">C</span>
              </div>
              <span className="text-lg sm:text-xl font-bold bg-gradient-to-r from-violet-600 to-fuchsia-600 bg-clip-text text-transparent">Convertly</span>
            </div>
            <a href="/login" className="bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white text-xs sm:text-sm font-semibold px-4 sm:px-5 py-2 sm:py-2.5 rounded-full hover:shadow-lg hover:shadow-violet-200 transition-all">
              Sign In
            </a>
          </div>
        </nav>
        <main className="max-w-3xl mx-auto px-4 sm:px-6 pt-24 sm:pt-32 pb-16 text-center">
          <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 leading-tight">
            Create stunning <span className="bg-gradient-to-r from-violet-600 to-fuchsia-600 bg-clip-text text-transparent">Reels, Photo Slides & Ads</span>
          </h1>
          <p className="text-base sm:text-lg text-gray-500 mt-4 max-w-xl mx-auto">
            Turn your product into scroll-stopping content. Generate photo carousels, video reels, and ad creatives in minutes.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center mt-8">
            <a href="/login" className="bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white font-semibold px-6 sm:px-8 py-3 sm:py-3.5 rounded-full hover:shadow-lg hover:shadow-violet-200 transition-all text-base sm:text-lg">
              Get Started Free
            </a>
          </div>
          <div className="flex flex-wrap justify-center gap-4 sm:gap-8 mt-8 sm:mt-12 text-xs sm:text-sm text-gray-400">
            <span>🎬 Reel Creator</span>
            <span>📸 Photo Slides</span>
            <span>🎯 Ad Creator</span>
            <span>🌍 Theme Magic</span>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50/50">
      <Navbar activeTab={activeTab} onTabChange={handleTabChange} userTier={userTier} />
      <main className="max-w-5xl mx-auto px-4 sm:px-6 pt-28 md:pt-24 pb-16">
        <div className={activeTab === "reel-creator" ? "" : "hidden"}><ReelCreator meteredFetch={meteredFetch} /></div>
        <div className={activeTab === "photo-set" ? "" : "hidden"}><PhotoSetGenerator meteredFetch={meteredFetch} /></div>
        <div className={activeTab === "ad-creator" ? "" : "hidden"}><AdCreator meteredFetch={meteredFetch} /></div>
        <div className={activeTab === "theme-magic" ? "" : "hidden"}><ThemeGenerator meteredFetch={meteredFetch} /></div>
      </main>
      <UpsellModal show={upsell.show} message={upsell.message} tierRequired={upsell.tierRequired} onClose={closeUpsell} onUpgrade={handleUpgrade} />
    </div>
  );
}
