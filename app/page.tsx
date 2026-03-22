"use client";

import { useState } from "react";
import Navbar from "@/components/Navbar";
import ReelCreator from "@/components/ReelCreator";
import PhotoSetGenerator from "@/components/PhotoSetGenerator";
import AdCreator from "@/components/AdCreator";

export default function Home() {
  const [activeTab, setActiveTab] = useState("reel-creator");

  return (
    <div className="min-h-screen bg-gray-50/50">
      <Navbar activeTab={activeTab} onTabChange={setActiveTab} />
      <main className="max-w-5xl mx-auto px-6 pt-24 pb-16">
        <div className={activeTab === "reel-creator" ? "" : "hidden"}><ReelCreator /></div>
        <div className={activeTab === "photo-set" ? "" : "hidden"}><PhotoSetGenerator /></div>
        <div className={activeTab === "ad-creator" ? "" : "hidden"}><AdCreator /></div>
      </main>
    </div>
  );
}
