import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { CallProvider } from "@/context/CallContext";
import { CallOverlay } from "@/components/ui/CallOverlay";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Chat PWA",
  description: "A highly modern, privacy-focused messaging application.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Chat PWA",
  },
};

export const viewport: Viewport = {
  themeColor: "#09090b",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-[100dvh] antialiased dark`}
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                navigator.serviceWorker.getRegistrations().then(function(registrations) {
                  for(let registration of registrations) {
                    registration.unregister();
                  }
                });
              }
            `,
          }}
        />
      </head>
      <body className="h-[100dvh] w-full flex flex-col bg-background text-foreground overscroll-none selection:bg-primary/30 overflow-hidden fixed inset-0">
        <AuthProvider>
          <CallProvider>
            <ThemeProvider>
              <div className="w-full max-w-md mx-auto h-[100dvh] relative bg-background shadow-2xl shadow-black/50 overflow-y-auto overflow-x-hidden flex flex-col scroll-smooth">
                {children}
                <CallOverlay />
              </div>
            </ThemeProvider>
          </CallProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
