import BackButton from '../components/BackButton';
export const metadata = {
  title: 'About — Barter Payments',
  alternates: {
    canonical: 'https://www.barterpayments.xyz/about'
  }
};

export default function AboutPage() {
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
              <a href="/about">About</a>
              <a href="/contact">Contact</a>
            </nav>
            <div className="nav-actions">
              <a className="nav-social" href="https://x.com/barterpayments" target="_blank" rel="noreferrer" aria-label="Barter Payments on X">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.507 11.24H16.32l-5.11-6.675-5.84 6.675H2.06l7.73-8.84L1.61 2.25h6.676l4.62 6.11 5.338-6.11Zm-1.162 17.52h1.833L6.68 4.126H4.72l12.362 15.645Z" />
                </svg>
                <span>@barterpayments</span>
              </a>
            </div>
          </header>
        </div>
      </section>

      <section>
        <div className="container">
          <div className="page-hero">
            <h1>About Barter Payments</h1>
            <p>
              Barter Payments is building the execution layer for autonomous agents. Our goal is simple: make onchain actions
              as reliable and programmable as any API call.
            </p>
          </div>
          <div className="page-grid">
            <div className="card">
              <h4>Mission</h4>
              <p>
                Give agents a secure, production‑grade way to create wallets, manage funds, and execute transactions
                without human clicks.
              </p>
            </div>
            <div className="card">
              <h4>Why now</h4>
              <p>
                Agents are ready to operate onchain, but the infrastructure is fragmented. We’re unifying wallets,
                routing, and execution behind a clean interface.
              </p>
            </div>
            <div className="card">
              <h4>Built for teams</h4>
              <p>
                Deterministic responses, audit‑ready logs, and policy enforcement help teams ship agent systems safely.
              </p>
            </div>
          </div>
        </div>
      </section>

      <footer className="footer">
        <div className="container footer-inner">
          <strong>Barter Payments</strong>
          <nav className="footer-links">
            <a href="/contact">Contact</a>
            <a href="/legal/privacy">Privacy</a>
            <a href="/legal/terms">Terms</a>
          </nav>
        </div>
      </footer>
    </main>
  );
}
