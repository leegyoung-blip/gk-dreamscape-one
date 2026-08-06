import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import PostLoginWelcome from "@/components/PostLoginWelcome";
import MarketingConsentModal from "./components/MarketingConsentModal";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Dreamscape One",
  description: "A world by GKDL",
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
      <body className="min-h-full">
        {children}
        <PostLoginWelcome />
        <MarketingConsentModal />
      </body>
    </html>
  );
}
