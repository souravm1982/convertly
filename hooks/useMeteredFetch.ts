"use client";

import { useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { TierName } from "@/config/billing.config";

interface UpsellState {
  show: boolean;
  message: string;
  tierRequired?: TierName;
}

export function useMeteredFetch() {
  const { data: session } = useSession();
  const [upsell, setUpsell] = useState<UpsellState>({ show: false, message: "" });

  const meteredFetch = useCallback(async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const res = await fetch(input, init);

    if (res.status === 403) {
      const data = await res.clone().json();
      if (data.error === "limit_reached") {
        setUpsell({ show: true, message: data.message, tierRequired: data.tierRequired });
      }
      return res;
    }

    // Check for limit warning on successful responses
    if (res.ok) {
      const cloned = res.clone();
      try {
        const data = await cloned.json();
        if (data._limitWarning) {
          setTimeout(() => {
            setUpsell({ show: true, message: data._limitWarning.message, tierRequired: data._limitWarning.tierRequired });
          }, 1000);
        }
      } catch {}
    }

    return res;
  }, []);

  const closeUpsell = useCallback(() => setUpsell({ show: false, message: "" }), []);

  const handleUpgrade = useCallback(async (tier: TierName) => {
    const res = await fetch("/api/upgrade", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tier, email: session?.user?.email }),
    });
    if (res.ok) {
      setUpsell({ show: false, message: "" });
    }
  }, [session]);

  return { meteredFetch, upsell, closeUpsell, handleUpgrade };
}
