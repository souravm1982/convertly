import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Convertly — Convert your images to Reels",
  description: "AI-powered tool to create stunning reels and photo sets from your images.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="font-sans">{children}</body>
    </html>
  );
}
