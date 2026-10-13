import type { Metadata } from "next";
import Background from "@/components/Background";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Footer from "@/components/Footer";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Game Hub | Play Free Online Games",
  description: "Play puzzle, car, bike, arcade and shooting games free in your browser.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-screen flex-col text-white antialiased">
  <Background />
  <div className="flex flex-1 flex-col">{children}</div>
  <Footer />
</body>
    </html>
  );
}
