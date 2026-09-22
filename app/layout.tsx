import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import PostLoginWelcome from "@/components/PostLoginWelcome";
import MarketingConsentModal from "./components/MarketingConsentModal";
import ScreenTimeController from "@/components/parental-controls/ScreenTimeController";
import SiteStructuredData from "@/components/seo/SiteStructuredData";
import {
  DEFAULT_SITE_DESCRIPTION,
  SITE_NAME,
  SITE_URL,
  socialImageUrl,
} from "@/lib/seo";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const homepageSocialImage = socialImageUrl({
  title: SITE_NAME,
  eyebrow: "Learning That Grows With Them",
  accent: "#8ee8ff",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),

  title: {
    default: SITE_NAME,
    template: `%s | ${SITE_NAME}`,
  },

  description: DEFAULT_SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  creator: SITE_NAME,
  publisher: SITE_NAME,

  keywords: [
    "Dreamscape One",
    "primary school learning",
    "English learning",
    "Mathematics learning",
    "Science learning",
    "financial literacy for children",
    "learning through games",
    "NOVA+",
  ],

  alternates: {
    canonical: SITE_URL,
  },

  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },

  openGraph: {
    title: SITE_NAME,
    description: DEFAULT_SITE_DESCRIPTION,
    url: SITE_URL,
    siteName: SITE_NAME,
    locale: "en_SG",
    type: "website",
    images: [
      {
        url: homepageSocialImage,
        width: 1200,
        height: 630,
        alt: SITE_NAME,
      },
    ],
  },

  twitter: {
    card: "summary_large_image",
    title: SITE_NAME,
    description: DEFAULT_SITE_DESCRIPTION,
    images: [homepageSocialImage],
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
        <SiteStructuredData />
        {children}
        <ScreenTimeController />
        <PostLoginWelcome />
        <MarketingConsentModal />
      </body>
    </html>
  );
}
