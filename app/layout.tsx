import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { PixelSky } from "@/components/PixelSky";
import { THEME_COLORS, THEME_INIT_SCRIPT } from "@/lib/theme";
import "./globals.css";

const minecraftFont = localFont({
  src: [
    { path: "./fonts/Monocraft-Regular.ttf", weight: "400", style: "normal" },
    { path: "./fonts/Monocraft-SemiBold.ttf", weight: "600", style: "normal" },
  ],
  variable: "--font-minecraft",
  display: "swap",
  fallback: ["monospace"],
  adjustFontFallback: false,
});

export const metadata: Metadata = {
  title: "Study",
  description: "Study time tracker for friends",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: THEME_COLORS.light,
  colorScheme: "light dark",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={minecraftFont.variable} data-theme="light" suppressHydrationWarning>
      <head>
        <script
          type={typeof window === "undefined" ? "text/javascript" : "text/plain"}
          suppressHydrationWarning
          dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }}
        />
      </head>
      <body className="min-h-dvh bg-bg font-sans text-ink">
        <PixelSky />
        {children}
      </body>
    </html>
  );
}
