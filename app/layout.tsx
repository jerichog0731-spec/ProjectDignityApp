import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Titlebar } from "@/components/Titlebar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Project Dignity — C.O.R.E.",
  description:
    "Community Outreach & Resource Engine — mobile client and volunteer PWA",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "C.O.R.E.",
  },
};

export const viewport: Viewport = {
  themeColor: "#ff6a00",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[#050c18] text-[#f4f7fa] antialiased overflow-x-hidden relative">
        {/* Global Glowing Mesh Orbs */}
        <div className="mesh-glow-orange" />
        <div className="mesh-glow-blue" />
        
        {/* Electron Window Frameless Titlebar */}
        <Titlebar />
        
        {/* Content Wrapper */}
        <div className="flex-1 flex flex-col pt-0 electron-only-pt">
          {children}
        </div>
      </body>
    </html>
  );
}

