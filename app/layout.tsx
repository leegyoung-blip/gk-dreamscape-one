import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import MarketingConsentModal from "./components/MarketingConsentModal";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://dreamscape.gurukidspro.com"),

  applicationName: "Dreamscape One",

  title: {
    default: "Dreamscape One | Gamified Education Platform",
    template: "%s | Dreamscape One",
  },

  description:
    "Dreamscape One is a gamified education platform by Guru Kids Pro. Children and teenagers learn through curriculum-based missions, thinking challenges, financial literacy activities and safe real-world simulations.",

  keywords: [
    "Dreamscape One",
    "Guru Kids Pro",
    "gamified education platform",
    "English learning",
    "Mathematics learning",
    "Science learning",
    "primary school learning",
    "thinking skills",
    "financial literacy",
    "entrepreneurship education",
    "student learning platform",
    "Singapore education",
  ],

  authors: [
    {
      name: "Guru Kids Pro",
      url: "https://gurukidspro.com",
    },
  ],

  creator: "Guru Kids Pro",
  publisher: "Guru Kids Pro",

  alternates: {
    canonical: "/",
  },

  openGraph: {
    type: "website",
    locale: "en_SG",
    url: "https://dreamscape.gurukidspro.com",
    siteName: "Dreamscape One",
    title: "Dreamscape One | Gamified Education Platform",
    description:
      "A gamified education platform where children and teenagers build curriculum knowledge, thinking skills, financial literacy and real-world decision-making skills.",
    images: [
      {
        url: "/home/dreamscape-logo.png",
        width: 1200,
        height: 630,
        alt: "Dreamscape One",
      },
    ],
  },

  twitter: {
    card: "summary_large_image",
    title: "Dreamscape One | Gamified Education Platform",
    description:
      "Curriculum learning, thinking skills, financial literacy and real-world simulations in one connected education platform.",
    images: ["/home/dreamscape-logo.png"],
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

  category: "education",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en-SG"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        <MarketingConsentModal />
      </body>
    </html>
  );
}