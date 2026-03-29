"use client";

import { useSession, signOut } from "next-auth/react";
import { useState } from "react";

interface NavbarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export default function Navbar({ activeTab, onTabChange }: NavbarProps) {
  const { data: session } = useSession();
  const [showMenu, setShowMenu] = useState(false);

  const tabs = [
    { id: "reel-creator", label: "Reel Creator", icon: "🎬" },
    { id: "photo-set", label: "Photo Set Magic", icon: "📸" },
    { id: "ad-creator", label: "Ad Creator", icon: "🎯" },
    { id: "theme-magic", label: "Theme Magic", icon: "🌍" },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-100 shadow-sm">
      <div className="max-w-6xl mx-auto px-6 flex items-center justify-between h-16">
        {/* Logo */}
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => onTabChange("reel-creator")}>
          <div className="w-8 h-8 bg-gradient-to-br from-violet-500 to-fuchsia-500 rounded-lg flex items-center justify-center">
            <span className="text-white text-sm font-bold">C</span>
          </div>
          <span className="text-xl font-bold bg-gradient-to-r from-violet-600 to-fuchsia-600 bg-clip-text text-transparent">
            Convertly
          </span>
        </div>

        {/* Tabs */}
        <div className="flex items-center bg-gray-50 rounded-full p-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`px-5 py-2 rounded-full text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <span className="mr-1.5">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* User */}
        {session?.user ? (
          <div className="relative">
            <button onClick={() => setShowMenu(!showMenu)} className="flex items-center gap-2 hover:opacity-80 transition-all">
              {session.user.image ? (
                <img src={session.user.image} alt="" className="w-8 h-8 rounded-full" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-violet-100 flex items-center justify-center text-violet-600 font-bold text-sm">
                  {session.user.name?.[0]}
                </div>
              )}
              <span className="text-sm font-medium text-gray-700 hidden md:block">{session.user.name?.split(" ")[0]}</span>
            </button>
            {showMenu && (
              <>
                <div className="fixed inset-0" onClick={() => setShowMenu(false)} />
                <div className="absolute right-0 top-12 bg-white rounded-xl border border-gray-100 shadow-lg py-2 w-48">
                  <div className="px-4 py-2 border-b border-gray-50">
                    <p className="text-sm font-medium text-gray-900">{session.user.name}</p>
                    <p className="text-xs text-gray-400 truncate">{session.user.email}</p>
                  </div>
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
    </nav>
  );
}
