import type { Metadata } from "next";
import "./globals.css";
import "./enhancements.css";

export const metadata: Metadata = {
  title: "Somi's Story",
  description: "Follow Somi's journey from Wrigley in South Korea to a new name, a new home, and the memories that come next.",
  openGraph: {
    title: "Somi's Story",
    description: "From South Korea to Portland, one golden retriever's new beginning.",
    images: ["/somi-first-1.webp"],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">">
      <body>{children}</body>
    </html>
  );
}
