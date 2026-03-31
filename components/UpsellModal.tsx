"use client";

import { TIERS, TierName } from "@/config/billing.config";

interface UpsellModalProps {
  show: boolean;
  message: string;
  tierRequired?: TierName;
  onClose: () => void;
  onUpgrade: (tier: TierName) => void;
}

export default function UpsellModal({ show, message, tierRequired, onClose, onUpgrade }: UpsellModalProps) {
  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full mx-4 p-6" onClick={(e) => e.stopPropagation()}>
        <div className="text-center mb-5">
          <div className="text-3xl mb-2">🚀</div>
          <h3 className="text-lg font-bold text-gray-900">{message}</h3>
          <p className="text-sm text-gray-500 mt-1">Upgrade to unlock more features and higher limits.</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {/* Base */}
          <div className="rounded-xl border-2 border-blue-200 bg-blue-50/30 p-4">
            <p className="font-bold text-gray-900">{TIERS.base.name}</p>
            <p className="text-2xl font-bold text-blue-600 mt-1">${TIERS.base.price}<span className="text-xs text-gray-400 font-normal">/mo</span></p>
            <div className="mt-2 space-y-1">
              {Object.entries(TIERS.base.limits).filter(([, v]) => v > 0).map(([k, v]) => (
                <p key={k} className="text-xs text-gray-500">{k}: <span className="font-semibold text-gray-700">{v}/mo</span></p>
              ))}
            </div>
            <button onClick={() => onUpgrade('base')}
              className="w-full mt-3 py-2.5 rounded-lg text-sm font-semibold bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:shadow-lg hover:shadow-blue-200 transition-all">
              Upgrade to Base
            </button>
          </div>

          {/* Premium */}
          <div className="rounded-xl border-2 border-fuchsia-200 bg-fuchsia-50/30 p-4 relative">
            <span className="absolute -top-2.5 right-3 text-[10px] bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white px-2 py-0.5 rounded-full font-semibold">BEST VALUE</span>
            <p className="font-bold text-gray-900">{TIERS.premium.name}</p>
            <p className="text-2xl font-bold text-fuchsia-600 mt-1">${TIERS.premium.price}<span className="text-xs text-gray-400 font-normal">/mo</span></p>
            <div className="mt-2 space-y-1">
              {Object.entries(TIERS.premium.limits).filter(([, v]) => v > 0).map(([k, v]) => (
                <p key={k} className="text-xs text-gray-500">{k}: <span className="font-semibold text-gray-700">{v}/mo</span></p>
              ))}
            </div>
            <button onClick={() => onUpgrade('premium')}
              className="w-full mt-3 py-2.5 rounded-lg text-sm font-semibold bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white hover:shadow-lg hover:shadow-fuchsia-200 transition-all">
              Upgrade to Premium
            </button>
          </div>
        </div>

        <div className="text-center mt-4">
          <a href="/pricing" className="text-xs text-violet-500 hover:text-violet-600 underline">Compare all plans →</a>
        </div>

        <button onClick={onClose} className="w-full mt-3 text-sm text-gray-400 hover:text-gray-600 transition-all">
          Maybe later
        </button>
      </div>
    </div>
  );
}
