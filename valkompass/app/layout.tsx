import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

const geist = Geist({ subsets: ["latin"], variable: "--font-geist-sans" });

export const metadata: Metadata = {
  title: "Valkompass — Källbaserad & granskningsbar",
  description: "En transparent valkompass där varje partiposition är kopplad till en verifierbar källa.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="sv" className={`${geist.variable} h-full`}>
      <body className="min-h-full flex flex-col bg-gray-50 text-gray-900 antialiased">
        <nav className="border-b border-gray-200 bg-white px-6 py-3">
          <div className="max-w-5xl mx-auto flex items-center justify-between">
            <a href="/" className="font-semibold text-lg text-blue-700 hover:text-blue-900">
              Valkompass
            </a>
            <div className="flex gap-6 text-sm">
              <a href="/kompass" className="text-gray-600 hover:text-gray-900">Gör testet</a>
              <a href="/admin" className="text-gray-400 hover:text-gray-600 text-xs">Admin</a>
            </div>
          </div>
        </nav>
        <main className="flex-1">{children}</main>
        <footer className="border-t border-gray-200 bg-white px-6 py-4 text-center text-xs text-gray-400">
          Valkompass är öppen källkod. Alla partipositioner är kopplade till verifierbara primärkällor.
        </footer>
      </body>
    </html>
  );
}
