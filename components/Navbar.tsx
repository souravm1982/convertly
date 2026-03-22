"use client";

interface NavbarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export default function Navbar({ activeTab, onTabChange }: NavbarProps) {
  const tabs = [
    { id: "reel-creator", label: "Reel Creator", icon: "🎬" },
    { id: "photo-set", label: "Photo Set Magic", icon: "📸" },
    { id: "ad-creator", label: "Ad Creator", icon: "🎯" },
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

        {/* CTA */}
        <button className="bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white text-sm font-semibold px-5 py-2.5 rounded-full hover:shadow-lg hover:shadow-violet-200 transition-all">
          Get Started
        </button>
      </div>
    </nav>
  );
}
