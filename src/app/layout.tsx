import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import LayoutWrapper from "../components/LayoutWrapper";
import SWRProvider from "../components/SWRProvider";
import PerformanceMonitor from "../components/PerformanceMonitor";
import { AuthProvider } from "../contexts/AuthContext";
import { ErrorBoundary } from "../components/ErrorBoundary";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: 'swap', // Better loading performance
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: 'swap',
});

export const metadata: Metadata = {
  title: "Front Desk Management System",
  description: "Complete front desk management solution for healthcare facilities",
  keywords: "healthcare, front desk, patient management, queue management, appointments",
  authors: [{ name: "Healthcare Solutions" }],
  robots: "index, follow",
  openGraph: {
    title: "Front Desk Management System",
    description: "Complete front desk management solution for healthcare facilities",
    type: "website",
  },
  // Performance optimizations
  other: {
    'charset': 'utf-8',
  }
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#7c3aed', // violet-600
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        {/* Preconnect to external domains for faster loading */}
        <link rel="preconnect" href="https://frontdesk-sigma.vercel.app" />
        <link rel="dns-prefetch" href="https://frontdesk-sigma.vercel.app" />
        
        {/* Preload critical resources */}
        <link rel="preload" href="/allo-logo.png" as="image" type="image/png" />
        
        {/* Security headers */}
        <meta httpEquiv="X-Content-Type-Options" content="nosniff" />
        <meta httpEquiv="X-Frame-Options" content="DENY" />
        <meta httpEquiv="X-XSS-Protection" content="1; mode=block" />
        <meta name="referrer" content="strict-origin-when-cross-origin" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen bg-gray-50`}
      >
        <ErrorBoundary>
          <PerformanceMonitor>
            <AuthProvider>
              <SWRProvider>
                <LayoutWrapper>
                  {children}
                </LayoutWrapper>
              </SWRProvider>
            </AuthProvider>
          </PerformanceMonitor>
        </ErrorBoundary>
      </body>
    </html>
  );
}
