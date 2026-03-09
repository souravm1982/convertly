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
      `Stunning sunlit photo of a warm ceramic mug with ${p}, soft cream glaze, scattered whole coffee beans and raw hazelnuts near the base, chunky knit blanket slightly visible in background, minimalist aesthetic, warm tones, professional product photography`,
    headline: (p) => `${p}: Your Morning Embrace.`,
    bodyText: () => `The comforting ritual your quiet hour has been missing.`,
  },
  {
    id: 'taste_journey',
    label: 'The Taste Journey',
    emoji: '🔬',
    visualPrompt: (p) =>
      `Clean simple infographic with three circles showing coffee tasting notes for ${p}, icon of cocoa bean labeled medium roast, icon of hazelnut shell labeled rich toasted hazelnut, icon of caramel swirl labeled smooth sweet finish, minimal design, warm color palette, educational style`,
    headline: () => `Crafted to wrap you in warmth.`,
    bodyText: () => `It's comforting, familiar, and always welcoming.`,
    footer: () => `Medium Roast · Toasted Hazelnut · Smooth Caramel Finish`,
  },
  {
    id: 'blueprint',
    label: 'The Blueprint',
    emoji: '📋',
    visualPrompt: (p) =>
      `Clean stylish top-down flat lay photo of coffee brewing equipment for ${p}, aesthetic AeroPress or pour-over cone sitting over a ceramic mug, recipe card graphic overlaid in corner, minimalist kitchen surface, soft natural light, professional food photography`,
    headline: () => `Our Ideal Ritual`,
    bodyText: () => `3 tbsp of grounds per 8oz water. Brew: Pour-Over or AeroPress. Pro-Tip: Add a splash of milk to activate the creamy notes.`,
  },
  {
    id: 'impact',
    label: 'The Impact',
    emoji: '🐕',
    visualPrompt: (p) =>
      `Deeply appealing photo of a cozy rescue dog, expressive spaniel or relaxed Golden Retriever looking calmly at camera, nestled in warm home environment with ${p} mug nearby, soft lighting, emotional heartwarming photography`,
    headline: () => `Brewing Comfort, Funding Hope.`,
    bodyText: (p) => `When you choose ${p}, you directly support the homing and care of animals. Your quiet cup makes their tomorrow brighter.`,
  },
  {
    id: 'vibe',
    label: 'The Vibe',
    emoji: '🕯️',
    visualPrompt: (p) =>
      `Cozy living room corner with ceramic mug of ${p} resting on side table next to stack of books, unlit candle, and journal, soft natural morning light filling the frame, warm lifestyle photography, hygge aesthetic`,
    headline: () => `The "Wind-Down" Blend.`,
    bodyText: () => `Perfect for slow Saturdays, reading nooks, and finding stillness before the day begins.`,
  },
  {
    id: 'social_proof',
    label: 'Social Proof',
    emoji: '💬',
    visualPrompt: (p) =>
      `Clean graphic background in warm muted orange or soft brown brand color, stylish centered quote card graphic about ${p}, elegant typography, minimal design, social media testimonial style`,
    headline: () => `What Our Community Says`,
    bodyText: (p) => `"This is the best I've ever had. It makes my whole kitchen smell amazing, and knowing it helps local pets is the best part." – Sarah J.`,
  },
  {
    id: 'cta',
    label: 'The CTA',
    emoji: '🛒',
    visualPrompt: (p) =>
      `Crisp product photography of coffee bag packaging standing upright next to ceramic mug, clean white background, ${p} branding visible, professional e-commerce style, call to action composition`,
    headline: () => `Bring the Ritual Home.`,
    bodyText: (p) => `Tap the link in our bio to order ${p}. Your best morning ritual starts here.`,
    footer: () => `Follow us for home brewing tips and rescue updates!`,
  },
];
