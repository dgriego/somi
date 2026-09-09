import type { Metadata } from "next";
import "./globals.css";
import "./enhancements.css";

export const metadata: Metadata = {
  title: "Somi's Story",
  description: "A little timeline of Somi's life, from Korea to home and everything that comes next.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
