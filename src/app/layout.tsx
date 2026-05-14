import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import PWAInstaller from "./pwa-installer";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Pepiniere Abouelaaz",
  description: "Pepiniere Abouelaaz - Full Offline PWA App",
  manifest: "/manifest.json",
  themeColor: "#065f46",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Pepiniere Abouelaaz",
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
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Pepiniere Abouelaaz" />
        <meta name="application-name" content="Pepiniere Abouelaaz" />
        <meta name="msapplication-config" content="/browserconfig.xml" />
        <meta name="msapplication-TileColor" content="#065f46" />
      </head>
      <body className="min-h-full flex flex-col">
        <PWAInstaller />
        {children}
      </body>
    </html>
  );
}
