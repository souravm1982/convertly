"use client";

import { useSession, signOut } from "next-auth/react";
import { useState } from "react";
import { TierName } from "@/config/billing.config";

interface NavbarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  userTier?: TierName;
}

// Which tier unlocks each tab
const TAB_MIN_TIER: Record<string, TierName> = {
  "photo-set": "free",
  "reel-creator": "base",
  "ad-creator": "base",
  "theme-magic": "premium",
};

const TIER_ORDER: TierName[] = ["free", "base", "premium"];

export default function Navbar({ activeTab, onTabChange, userTier = "free" }: NavbarProps) {
  const { data: session } = useSession();
  const [showMenu, setShowMenu] = useState(false);

  const tabs = [
    { id: "photo-set", label: "Photo Slides", icon: "📸", shortLabel: "Photo Slides" },
    { id: "reel-creator", label: "Reel Creator", icon: "🎬", shortLabel: "Reel Creator" },
    { id: "ad-creator", label: "Ad Creator", icon: "🎯", shortLabel: "Ad Creator" },
    { id: "theme-magic", label: "Theme Magic", icon: "🌍", shortLabel: "Theme Magic" },
  ];

  const isLocked = (tabId: string) => {
    const minTier = TAB_MIN_TIER[tabId] || "free";
    return TIER_ORDER.indexOf(userTier) < TIER_ORDER.indexOf(minTier);
  };

  const tierLabel = (tabId: string) => {
    const minTier = TAB_MIN_TIER[tabId];
    if (minTier === "base") return "Base";
    if (minTier === "premium") return "Premium";
    return null;
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-100 shadow-sm">
      {/* Desktop Layout */}
      <div className="hidden md:block">
        <div className="max-w-6xl mx-auto px-6 flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => onTabChange("photo-set")}>
            <div className="w-8 h-8 bg-gradient-to-br from-violet-500 to-fuchsia-500 rounded-lg flex items-center justify-center">
              <span className="text-white text-sm font-bold">C</span>
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-violet-600 to-fuchsia-600 bg-clip-text text-transparent">
              Convertly
            </span>
          </div>

          {/* Tabs */}
          <div className="flex items-center bg-gray-50 rounded-full p-1">
            {tabs.map((tab) => {
              const locked = isLocked(tab.id);
              return (
                <button
                  key={tab.id}
                  onClick={() => !locked && onTabChange(tab.id)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all relative ${
                    locked
                      ? "text-gray-300 cursor-not-allowed"
                      : activeTab === tab.id
                      ? "bg-white text-gray-900 shadow-sm"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  <span className="mr-1">{locked ? "🔒" : tab.icon}</span>
                  {tab.label}
                  {locked && (
                    <span className="ml-1 text-[9px] bg-violet-100 text-violet-600 px-1.5 py-0.5 rounded-full font-semibold">
                      {tierLabel(tab.id)}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* User */}
          {session?.user ? (
            <div className="relative flex items-center gap-2">
              <span className="text-[10px] bg-violet-100 text-violet-600 px-2 py-0.5 rounded-full font-semibold uppercase">
                {userTier}
              </span>
              <button onClick={() => setShowMenu(!showMenu)} className="flex items-center gap-2 hover:opacity-80 transition-all">
                {session.user.image ? (
                  <img src={session.user.image} alt="" className="w-8 h-8 rounded-full" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-violet-100 flex items-center justify-center text-violet-600 font-bold text-sm">
                    {session.user.name?.[0]}
                  </div>
                )}
              </button>
              {showMenu && (
                <>
                  <div className="fixed inset-0" onClick={() => setShowMenu(false)} />
                  <div className="absolute right-0 top-12 bg-white rounded-xl border border-gray-100 shadow-lg py-2 w-48">
                    <div className="px-4 py-2 border-b border-gray-50">
                      <p className="text-sm font-medium text-gray-900">{session.user.name}</p>
                      <p className="text-xs text-gray-400 truncate">{session.user.email}</p>
                    </div>
                    {userTier === 'free' && (
                      <a href="/pricing"
                        className="block w-full text-left px-4 py-2 text-sm text-violet-600 hover:bg-violet-50 transition-all">
                        ⬆ View Plans & Upgrade
                      </a>
                    )}
                    {userTier === 'base' && (
                      <a href="/pricing"
                        className="block w-full text-left px-4 py-2 text-sm text-violet-600 hover:bg-violet-50 transition-all">
                        🚀 View Plans & Upgrade
                      </a>
                    )}
                    <button onClick={() => signOut()} className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-all">
                      Sign Out
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <a href="/login" className="bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white text-sm font-semibold px-5 py-2.5 rounded-full hover:shadow-lg hover:shadow-violet-200 transition-all">
              Sign In
            </a>
          )}
        </div>
      </div>

      {/* Mobile Layout */}
      <div className="md:hidden">
        {/* Top Row - Logo and User */}
        <div className="px-4 flex items-center justify-between h-14 border-b border-gray-50">
          {/* Logo */}
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => onTabChange("photo-set")}>
            <div className="w-7 h-7 bg-gradient-to-br from-violet-500 to-fuchsia-500 rounded-lg flex items-center justify-center">
              <span className="text-white text-xs font-bold">C</span>
            </div>
            <span className="text-lg font-bold bg-gradient-to-r from-violet-600 to-fuchsia-600 bg-clip-text text-transparent">
              Convertly
            </span>
          </div>

          {/* User */}
          {session?.user ? (
            <div className="relative flex items-center gap-2">
              <span className="text-[9px] bg-violet-100 text-violet-600 px-1.5 py-0.5 rounded-full font-semibold uppercase">
                {userTier}
              </span>
              <button onClick={() => setShowMenu(!showMenu)} className="flex items-center gap-1 hover:opacity-80 transition-all">
                {session.user.image ? (
                  <img src={session.user.image} alt="" className="w-7 h-7 rounded-full" />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-violet-100 flex items-center justify-center text-violet-600 font-bold text-xs">
                    {session.user.name?.[0]}
                  </div>
                )}
              </button>
              {showMenu && (
                <>
                  <div className="fixed inset-0" onClick={() => setShowMenu(false)} />
                  <div className="absolute right-0 top-10 bg-white rounded-xl border border-gray-100 shadow-lg py-2 w-48">
                    <div className="px-4 py-2 border-b border-gray-50">
                      <p className="text-sm font-medium text-gray-900">{session.user.name}</p>
                      <p className="text-xs text-gray-400 truncate">{session.user.email}</p>
                    </div>
                    {userTier === 'free' && (
                      <a href="/pricing"
                        className="block w-full text-left px-4 py-2 text-sm text-violet-600 hover:bg-violet-50 transition-all">
                        ⬆ View Plans & Upgrade
                      </a>
                    )}
                    {userTier === 'base' && (
                      <a href="/pricing"
                        className="block w-full text-left px-4 py-2 text-sm text-violet-600 hover:bg-violet-50 transition-all">
                        🚀 View Plans & Upgrade
                      </a>
                    )}
                    <button onClick={() => signOut()} className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-all">
                      Sign Out
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <a href="/login" className="bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white text-xs font-semibold px-4 py-2 rounded-full hover:shadow-lg hover:shadow-violet-200 transition-all">
              Sign In
            </a>
          )}
        </div>

        {/* Bottom Row - Tabs */}
        <div className="px-2 py-2">
          <div className="grid grid-cols-2 gap-1">
            {tabs.map((tab) => {
              const locked = isLocked(tab.id);
              return (
                <button
                  key={tab.id}
                  onClick={() => !locked && onTabChange(tab.id)}
                  className={`px-3 py-2 rounded-lg text-xs font-medium transition-all relative flex items-center justify-center gap-1 ${
                    locked
                      ? "text-gray-300 cursor-not-allowed bg-gray-50"
                      : activeTab === tab.id
                      ? "bg-violet-100 text-violet-700 shadow-sm"
                      : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  <span>{locked ? "🔒" : tab.icon}</span>
                  <span>{tab.shortLabel}</span>
                  {locked && (
                    <span className="text-[8px] bg-violet-100 text-violet-600 px-1 py-0.5 rounded-full font-semibold">
                      {tierLabel(tab.id)}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </nav>
  );
}