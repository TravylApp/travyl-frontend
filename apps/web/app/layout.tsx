import type { Metadata } from "next";
import { Geist_Mono, Sora, Lustria } from "next/font/google";
import Providers from "@/components/providers";
import { validateEnv } from "@/lib/validateEnv";
import "./globals.css";

validateEnv();

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const sora = Sora({
  variable: "--font-brand",
  subsets: ["latin"],
  weight: ["700", "800"],
});

const lustria = Lustria({
  variable: "--font-lustria",
  subsets: ["latin"],
  weight: "400",
});

export const metadata: Metadata = {
  title: {
    default: "Travyl",
    template: "%s | Travyl",
  },
  description: "AI-powered travel assistant",
  icons: {
    icon: "/icon.svg",
  },
  other: {
    "developed-by": "JPB Developments — https://www.jpbdevelopments.com",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="author" content="JPB Developments — https://www.jpbdevelopments.com" />
        <link rel="preconnect" href="https://images.pexels.com" />
        <link rel="dns-prefetch" href="https://images.pexels.com" />
        <link rel="preconnect" href="https://api.fontshare.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://flagcdn.com" />
        <link href="https://api.fontshare.com/v2/css?f[]=satoshi@300,400,500,600,700,800,900&display=swap" rel="stylesheet" />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('theme');if(t==='dark')document.documentElement.classList.add('dark')}catch(e){}})();`,
          }}
        />
      </head>
      <body
        className={`${geistMono.variable} ${sora.variable} ${lustria.variable} antialiased`}
        style={{ fontFamily: "'Satoshi', system-ui, sans-serif" }}
      >
        <Providers>
          {children}
        </Providers>
        <script
          dangerouslySetInnerHTML={{
            __html: `console.log("%cFront-end developed by JPB Developments%c\\nhttps://www.jpbdevelopments.com","font-size:14px;font-weight:bold;color:#1e3a5f;","font-size:12px;color:#666;");`,
          }}
        />
      </body>
    </html>
  );
}
