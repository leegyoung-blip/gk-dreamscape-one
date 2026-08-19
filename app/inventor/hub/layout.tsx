import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  manifest: "/nova-home.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Nova Home",
    statusBarStyle: "black-translucent",
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#020713",
};

export default function NovaHomeLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return children;
}
