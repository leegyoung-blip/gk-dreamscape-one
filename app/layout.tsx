import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import PostLoginWelcome from "@/components/PostLoginWelcome";
import MarketingConsentModal from "./components/MarketingConsentModal";
import ScreenTimeController from "@/components/parental-controls/ScreenTimeController";
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
  metadataBase: new URL("https://dreamscape-one.com"),

  title: {
    default: "Dreamscape One",
    template: "%s | Dreamscape One",
  },

  description:
    "A learning world where children think, learn, earn, build, and grow through curriculum mastery, financial literacy, business, and real-world decision-making.",

  applicationName: "Dreamscape One",

  openGraph: {
    title: "Dreamscape One",
    description:
      "A learning world where children think, learn, earn, build, and grow through curriculum mastery, financial literacy, business, and real-world decision-making.",
    url: "https://dreamscape-one.com",
    siteName: "Dreamscape One",
    type: "website",
    locale: "en_SG",
  },

  twitter: {
    card: "summary_large_image",
    title: "Dreamscape One",
    description:
      "A learning world where children think, learn, earn, build, and grow through curriculum mastery, financial literacy, business, and real-world decision-making.",
  },

  alternates: {
    canonical: "https://dreamscape-one.com",
  },
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
        <ScreenTimeController />
        <PostLoginWelcome />
        <MarketingConsentModal />
      </body>
    </html>
  );
}
