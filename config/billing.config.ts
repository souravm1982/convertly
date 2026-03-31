// Billing & metering configuration
// All limits are per calendar month unless noted

export const TIERS = {
  free: {
    name: 'Free',
    price: 0,
    features: ['Photo Slides'],
    limits: {
      photoSlides: 2,       // full generations (each = up to 7 images)
      adCreator: 0,         // locked
      reelCreator: 0,       // locked
      themeMagic: 0,        // locked
      socialPosts: 2,       // auto-generated with slides
    },
  },
  base: {
    name: 'Base',
    price: 9.99,            // $/month
    features: ['Photo Slides', 'Ad Creator', 'Reel Creator'],
    limits: {
      photoSlides: 20,
      adCreator: 20,
      reelCreator: 10,
      themeMagic: 0,        // locked — premium only
      socialPosts: 50,
    },
  },
  premium: {
    name: 'Premium',
    price: 29.99,           // $/month
    features: ['Photo Slides', 'Ad Creator', 'Reel Creator', 'Theme Magic', 'Priority Support'],
    limits: {
      photoSlides: 100,     // soft cap to prevent abuse
      adCreator: 100,
      reelCreator: 50,
      themeMagic: 50,
      socialPosts: 200,
    },
  },
} as const;

export type TierName = keyof typeof TIERS;

// Maps API actions to which limit counter to check/increment
// lockedBelow: minimum tier required to access this feature
export const ACTION_LIMITS: Record<string, { limitKey: keyof typeof TIERS.free.limits; lockedBelow?: TierName }> = {
  'generate-images':       { limitKey: 'photoSlides' },
  'generate-ad':           { limitKey: 'adCreator', lockedBelow: 'base' },
  'generate-ad-copy':      { limitKey: 'adCreator', lockedBelow: 'base' },
  'create-reel':           { limitKey: 'reelCreator', lockedBelow: 'base' },
  'generate-theme-slides': { limitKey: 'themeMagic', lockedBelow: 'premium' },
  'generate-social-post':  { limitKey: 'socialPosts' },
};

// Estimated AWS cost per action (for internal tracking, not shown to users)
export const AWS_COST_PER_ACTION: Record<string, number> = {
  'generate-images': 0.008,       // single Titan image
  'generate-ad': 0.025,           // Titan bg + optional bg removal + Haiku
  'generate-ad-copy': 0.001,      // Haiku only
  'create-reel': 0,               // FFmpeg only
  'generate-theme-slides': 0.009, // Titan image + Haiku plan (amortized)
  'generate-social-post': 0.001,  // Haiku only
};
