import BackButton from '../components/BackButton';
import CopyContractButton from './CopyContractButton';

export const metadata = {
  title: 'Barter Payments Token — $IGNOTUS on Solana',
  description: 'Trade $IGNOTUS on Pump.fun. The official token of Barter Payments — agentic onchain infrastructure.',
  alternates: {
    canonical: 'https://www.barterpayments.xyz/token'
  }
};

const tokenStats = [
  {
    title: 'Contract Address',
    value: 'E6gcKfrnAsZ6hNbTDd1qa5Pz6A9C7yRAUyop9Jx4pump',
    isMono: true
  },
  {
    title: 'Blockchain',
    value: 'Solana',
    isMono: false
  },
  {
    title: 'Platform',
    value: 'Pump.fun',
    isMono: false
  }
];

const features = [
  {
    title: 'Community‑Driven',
    text: 'Built by the community, for the community. $IGNOTUS represents the future of agentic onchain infrastructure.'
  },
  {
    title: 'Fair Launch',
    text: 'Launched on Pump.fun with no pre‑mine or team allocation. Every holder started from the same line.'
  },
  {
    title: 'Ecosystem Token',
    text: 'The official token of the Barter Payments ecosystem, powering autonomous agent execution across chains.'
  }
];

export default function TokenPage() {
  return (
    <main>
      <section>
        <div className="container">
          <header className="nav">
            <div className="nav-left">
              <BackButton />
              <a className="nav-logo" href="/">
                <img src="/BarterPaymentLogo.png" alt="Barter Payments logo" width={36} height={36} />
                <span>Barter Payments</span>
              </a>
            </div>
            <nav className="nav-links">
              <a href="/#api">Custodial vs Non‑custodial</a>
              <a href="/agent-commerce">Agent Commerce</a>
              <a href="/docs">Docs</a>
              <a href="/dashboard">Dashboard</a>
              <a href="/token">Token</a>
            </nav>
            <div className="nav-actions">
              <a className="nav-social" href="https://x.com/barterpayments" target="_blank" rel="noreferrer" aria-label="Barter Payments on X">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.507 11.24H16.32l-5.11-6.675-5.84 6.675H2.06l7.73-8.84L1.61 2.25h6.676l4.62 6.11 5.338-6.11Zm-1.162 17.52h1.833L6.68 4.126H4.72l12.362 15.645Z" />
                </svg>
                <span>@barterpayments</span>
              </a>
              <a className="button primary" href="https://pump.fun/coin/E6gcKfrnAsZ6hNbTDd1qa5Pz6A9C7yRAUyop9Jx4pump" target="_blank" rel="noreferrer">Buy $IGNOTUS</a>
            </div>
          </header>

          <div className="page-hero">
            <h1><span className="accent-text">$iGNOTUS</span> - The Token</h1>
            <p>
              The official token of Barter Payments, launched on Solana via Pump.fun. Join the community building the future of autonomous onchain execution.
            </p>
          </div>
        </div>
      </section>

      <section>
        <div className="container">
          <div className="hero-card" style={{ maxWidth: '100%' }}>
            <div className="hero-card-inner">
              <div style={{ display: 'flex', alignItems: 'center', gap: '18px', marginBottom: '8px' }}>
                <img src="/BarterPaymentLogo.png" alt="Barter Payments logo" width={56} height={56} />
                <div>
                  <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', marginBottom: '4px' }}>$iGNOTUS</h2>
                  <p style={{ color: 'var(--ink-subtle)', margin: 0 }}>Solana • Pump.fun</p>
                </div>
              </div>

              <div className="stats" style={{ marginTop: '24px' }}>
                {tokenStats.map((stat) => (
                  <div className="stat" key={stat.title}>
                    <p style={{ fontSize: '0.85rem', marginBottom: '8px', color: 'var(--ink-subtle)' }}>{stat.title}</p>
                    <div style={{
                      fontSize: stat.isMono ? '0.75rem' : '1rem',
                      fontFamily: stat.isMono ? 'ui-monospace, monospace' : 'inherit',
                      wordBreak: 'break-all',
                      color: 'var(--ink)',
                      fontWeight: 600
                    }}>
                      {stat.value}
                    </div>
                  </div>
                ))}
              </div>

              <div className="hero-actions" style={{ marginTop: '24px' }}>
                <a
                  className="button primary"
                  href="https://pump.fun/coin/E6gcKfrnAsZ6hNbTDd1qa5Pz6A9C7yRAUyop9Jx4pump"
                  target="_blank"
                  rel="noreferrer"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
                >
                  <span>Trade on Pump.fun</span>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                    <polyline points="15 3 21 3 21 9" />
                    <line x1="10" y1="14" x2="21" y2="3" />
                  </svg>
                </a>
                <CopyContractButton address="E6gcKfrnAsZ6hNbTDd1qa5Pz6A9C7yRAUyop9Jx4pump" />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section>
        <div className="container">
          <div className="section-title">
            <h2>About $iGNOTUS</h2>
            <p>The token that powers the Barter Payments ecosystem and community.</p>
          </div>
          <div className="card-grid">
            {features.map((feature) => (
              <div className="card" key={feature.title}>
                <h4>{feature.title}</h4>
                <p>{feature.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section>
        <div className="container">
          <div className="card" style={{ textAlign: 'center', padding: '40px 24px' }}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', marginBottom: '12px' }}>
              Ready to join?
            </h3>
            <p style={{ color: 'var(--ink-subtle)', marginBottom: '24px', maxWidth: '560px', margin: '0 auto 24px' }}>
              Trade $iGNOTUS on Pump.fun and become part of the community building autonomous onchain infrastructure.
            </p>
            <a
              className="button primary"
              href="https://pump.fun/coin/E6gcKfrnAsZ6hNbTDd1qa5Pz6A9C7yRAUyop9Jx4pump"
              target="_blank"
              rel="noreferrer"
            >
              Buy Now on Pump.fun
            </a>
          </div>
        </div>
      </section>

      <footer className="footer">
        <div className="container footer-inner">
          <strong>Barter Payments</strong>
          <nav className="footer-links">
            <a href="/agent-commerce">Agent Commerce</a>
            <a href="/docs">Docs</a>
            <a href="/about">About</a>
            <a href="/contact">Contact</a>
            <a href="/legal/privacy">Privacy</a>
            <a href="/legal/terms">Terms</a>
          </nav>
        </div>
      </footer>
    </main>
  );
}
