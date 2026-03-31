"use client";

import { TIERS } from "@/config/billing.config";

const FEATURE_LABELS: Record<string, string> = {
  photoSlides: "📸 Photo Slides",
  adCreator: "🎯 Ad Creator",
  reelCreator: "🎬 Reel Creator",
  themeMagic: "🌍 Theme Magic",
  socialPosts: "📱 Social Posts",
};

const tiers = [
  { key: "free", border: "border-gray-200", bg: "bg-gray-50", btn: "bg-gray-900 text-white hover:bg-gray-800", badge: null },
  { key: "base", border: "border-blue-200", bg: "bg-blue-50/40", btn: "bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:shadow-lg hover:shadow-blue-200", badge: "POPULAR" },
  { key: "premium", border: "border-fuchsia-200", bg: "bg-fuchsia-50/30", btn: "bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white hover:shadow-lg hover:shadow-fuchsia-200", badge: "BEST VALUE" },
];

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-gray-50/50">
      <nav className="bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-6xl mx-auto px-6 flex items-center justify-between h-16">
          <a href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-violet-500 to-fuchsia-500 rounded-lg flex items-center justify-center">
              <span className="text-white text-sm font-bold">C</span>
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-violet-600 to-fuchsia-600 bg-clip-text text-transparent">Convertly</span>
          </a>
          <a href="/" className="text-sm text-gray-500 hover:text-gray-700">← Back to app</a>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-6 py-16">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900">Simple, transparent pricing</h1>
          <p className="text-gray-500 mt-3 text-lg">Start free. Upgrade when you need more.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {tiers.map(({ key, border, bg, btn, badge }) => {
            const tier = TIERS[key as keyof typeof TIERS];
            return (
              <div key={key} className={`rounded-2xl border-2 ${border} ${bg} p-6 relative`}>
                {badge && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-[11px] bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white px-3 py-1 rounded-full font-semibold">
                    {badge}
                  </span>
                )}
                <h3 className="text-xl font-bold text-gray-900">{tier.name}</h3>
                <div className="mt-2">
                  {tier.price === 0 ? (
                    <p className="text-3xl font-bold text-gray-900">Free</p>
                  ) : (
                    <p className="text-3xl font-bold text-gray-900">${tier.price}<span className="text-base text-gray-400 font-normal">/mo</span></p>
                  )}
                </div>

                <div className="mt-6 space-y-3">
                  {Object.entries(tier.limits).map(([k, v]) => (
                    <div key={k} className="flex items-center gap-2">
                      {v > 0 ? (
                        <span className="text-green-500 text-sm">✓</span>
                      ) : (
                        <span className="text-gray-300 text-sm">✗</span>
                      )}
                      <span className={`text-sm ${v > 0 ? "text-gray-700" : "text-gray-400"}`}>
                        {FEATURE_LABELS[k] || k}
                        {v > 0 && <span className="text-gray-400 ml-1">({v}/mo)</span>}
                      </span>
                    </div>
                  ))}
                </div>

                <a href={key === "free" ? "/login" : "/login"}
                  className={`block w-full mt-6 py-3 rounded-xl text-sm font-semibold text-center transition-all ${btn}`}>
                  {key === "free" ? "Get Started" : `Upgrade to ${tier.name}`}
                </a>
              </div>
            );
          })}
        </div>

        <div className="mt-16 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Frequently Asked Questions</h2>
          <div className="max-w-2xl mx-auto text-left space-y-4">
            <div className="bg-white rounded-xl border border-gray-100 p-5">
              <p className="font-semibold text-gray-900">What counts as one Photo Slide generation?</p>
              <p className="text-sm text-gray-500 mt-1">One generation creates up to 7 themed slides for your product. Each generation counts as 1 toward your limit.</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-100 p-5">
              <p className="font-semibold text-gray-900">Do unused credits roll over?</p>
              <p className="text-sm text-gray-500 mt-1">No, limits reset at the start of each calendar month.</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-100 p-5">
              <p className="font-semibold text-gray-900">Can I cancel anytime?</p>
              <p className="text-sm text-gray-500 mt-1">Yes, you can downgrade or cancel at any time. You'll keep access until the end of your billing period.</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-100 p-5">
              <p className="font-semibold text-gray-900">What's included in Theme Magic?</p>
              <p className="text-sm text-gray-500 mt-1">Theme Magic generates 5 AI-planned slides for any topic (e.g. "Top 5 Wonders of the World") with real names, captions, and a social media post. Available on Premium only.</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
