export interface SlideConfig {
  id: string;
  label: string;
  emoji: string;
  visualPrompt: (product: string) => string;
  headline: (product: string) => string;
  bodyText: (product: string) => string;
  footer?: (product: string) => string;
}

export const PHOTO_SET_CONFIG: SlideConfig[] = [
  {
    id: 'hook',
    label: 'The Hook',
    emoji: '✨',
    visualPrompt: (p) =>
      `Stunning sunlit product photo of ${p}, beautiful presentation, minimalist aesthetic, warm tones, professional product photography, no text no words no letters`,
    headline: (p) => `Crafted Just for You.`,
    bodyText: (p) => `Discover what makes ${p} truly special.`,
  },
  {
    id: 'taste_journey',
    label: 'The Story',
    emoji: '🔬',
    visualPrompt: (p) =>
      `Clean simple infographic style illustration showing the key qualities of ${p}, three icons representing its best features, minimal design, warm color palette, no text no words no letters no labels`,
    headline: (p) => `What Sets It Apart.`,
    bodyText: (p) => `Crafted with care, designed to delight.`,
  },
  {
    id: 'blueprint',
    label: 'How To Enjoy',
    emoji: '📋',
    visualPrompt: (p) =>
      `Clean stylish top-down flat lay photo showing the ideal way to enjoy ${p}, beautiful arrangement of the product and accessories, minimalist surface, soft natural light, professional photography, no text no words no letters`,
    headline: (p) => `The Perfect Way to Enjoy It.`,
    bodyText: (p) => `Simple steps to get the most out of your experience.`,
  },
  {
    id: 'impact',
    label: 'The Impact',
    emoji: '🐕',
    visualPrompt: (p) =>
      `Heartwarming photo of a cute happy dog in a cozy home environment with ${p} nearby, soft lighting, emotional photography, no text no words no letters`,
    headline: (p) => `Feel Good With Every Sip.`,
    bodyText: (p) => `Every purchase makes a difference.`,
  },
  {
    id: 'vibe',
    label: 'The Vibe',
    emoji: '🕯️',
    visualPrompt: (p) =>
      `Cozy lifestyle photo featuring ${p} in a beautiful relaxed setting, warm ambient lighting, aesthetic composition, lifestyle photography, no text no words no letters`,
    headline: (p) => `Your New Favorite Ritual.`,
    bodyText: (p) => `Perfect for those moments you want to savor.`,
  },
  {
    id: 'social_proof',
    label: 'Social Proof',
    emoji: '💬',
    visualPrompt: (p) =>
      `Happy person smiling while holding and enjoying ${p}, cozy cafe or home setting, warm natural lighting, candid authentic feel, lifestyle photography, no text no words no letters no quotes`,
    headline: (p) => `Loved by Thousands.`,
    bodyText: (p) => `"This completely changed my routine. Can't imagine going back." — Happy Customer`,
  },
  {
    id: 'cta',
    label: 'The CTA',
    emoji: '🛒',
    visualPrompt: (p) =>
      `Beautiful styled photo of ${p} with a hand reaching for it, inviting composition, warm lighting, call to action feeling, professional photography, no text no words no letters`,
    headline: (p) => `Grab Yours Today.`,
    bodyText: (p) => `Tap the link to order. Your new favorite is one click away.`,
    footer: () => `Follow us for tips and updates!`,
  },
];
