import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import LayoutWrapper from "../components/LayoutWrapper";
import { AuthProvider } from "../contexts/AuthContext";
import ConnectionStatus from "../components/ConnectionStatus";
import SWRProvider from "../components/SWRProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Front Desk Management System",
  description: "Simple front desk management for healthcare facilities",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} antialiased min-h-screen bg-gray-50`}>
        <SWRProvider>
          <AuthProvider>
            <ConnectionStatus>
              <LayoutWrapper>
                {children}
              </LayoutWrapper>
            </ConnectionStatus>
          </AuthProvider>
        </SWRProvider>
      </body>
    </html>
  );
}
