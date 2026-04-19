import type { Metadata } from 'next';
import { Inter, Sora, DM_Sans } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
});

const sora = Sora({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap'
});

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-body',
  display: 'swap'
});

export const metadata: Metadata = {
  title: 'Barter — Agentic Payments',
  description: 'The future of payments is autonomous. Join the waitlist.',
  metadataBase: new URL('https://barterpayments.xyz'),
  alternates: {
    canonical: '/'
  },
  openGraph: {
    title: 'Barter — Agentic Payments',
    description: 'The future of payments is autonomous. Join the waitlist.',
    url: 'https://barterpayments.xyz/',
    siteName: 'Barter Payments',
    images: [
      {
        url: '/opengraph-image',
        width: 1200,
        height: 630,
        alt: 'Barter Payments — Agentic Payments',
      },
    ],
    type: 'website'
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Barter — Agentic Payments',
    description: 'The future of payments is autonomous. Join the waitlist.',
    images: ['/opengraph-image'],
  },
  icons: {
    icon: '/icon',
    shortcut: '/icon',
    apple: '/apple-icon'
  }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const organizationSchema = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Barter Payments',
    url: 'https://barterpayments.xyz',
    logo: 'https://barterpayments.xyz/BarterPaymentLogo.png',
    sameAs: ['https://x.com/barterpayments'],
  };

  const websiteSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Barter Payments',
    url: 'https://barterpayments.xyz',
    potentialAction: {
      '@type': 'SearchAction',
      target: 'https://barterpayments.xyz/home?q={search_term_string}',
      'query-input': 'required name=search_term_string',
    },
  };

  const softwareSchema = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'Barter Payments Agent API',
    applicationCategory: 'DeveloperApplication',
    operatingSystem: 'Cloud',
    url: 'https://barterpayments.xyz',
    description: 'Agentic onchain infrastructure enabling autonomous swaps, transfers, and wallet orchestration.',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD'
    }
  };

  return (
    <html lang="en" className={`${inter.className} ${sora.variable} ${dmSans.variable}`}>
      <body>
        {children}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareSchema) }}
        />
      </body>
    </html>
  );
}
