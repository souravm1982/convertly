import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Convertly : Convert your images to Reels",
  description: "A Next.js app with React frontend and Node.js API backend",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}