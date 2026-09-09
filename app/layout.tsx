import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://somi-lyart.vercel.app"),
  title: "Somi's Story",
  description: "Follow Somi's journey from Wrigley in South Korea to a new name, a new home, and the memories that come next.",
  openGraph: {
    title: "Somi's Story",
    description: "From South Korea to Portland, one golden retriever's new beginning.",
    images: ["/somi-first-1.webp"],
  },
  twitter: {
    card: "summary_large_image",
    title: "Somi's Story",
    description: "From South Korea to Portland, one golden retriever's new beginning.",
    images: ["/somi-first-1.webp"],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
