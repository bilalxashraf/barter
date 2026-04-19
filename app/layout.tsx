import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Barter — Agentic Payments",
  description: "The future of payments is autonomous. Join the waitlist.",
  openGraph: {
    title: "Barter — Agentic Payments",
    description: "The future of payments is autonomous. Join the waitlist.",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
