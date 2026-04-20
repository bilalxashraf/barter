import type { Metadata } from 'next';
import { Sora, DM_Sans } from 'next/font/google';
import './globals.css';

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
  title: 'Barter — Live Agent Commerce',
  description: 'Barter pairs a public waitlist with a live stream of agents buying tools, data, and compute in real time.',
  metadataBase: new URL('https://barterpayments.xyz'),
  alternates: {
    canonical: '/'
  },
  openGraph: {
    title: 'Barter — Live Agent Commerce',
    description: 'Real agents. Real dollars. Happening right now.',
    url: 'https://barterpayments.xyz/',
    siteName: 'Barter Payments',
    images: [
      {
        url: '/opengraph-image',
        width: 1200,
        height: 630,
        alt: 'Barter Payments — Live Agent Commerce',
      },
    ],
    type: 'website'
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Barter — Live Agent Commerce',
    description: 'Real agents. Real dollars. Happening right now.',
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
  };

  const softwareSchema = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'Barter Payments',
    applicationCategory: 'DeveloperApplication',
    operatingSystem: 'Cloud',
    url: 'https://barterpayments.xyz',
    description: "Live stream of agent commerce with public waitlist access for Barter's agentic payments beta.",
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD'
    }
  };

  return (
    <html lang="en" className={`${dmSans.className} ${sora.variable} ${dmSans.variable}`}>
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
