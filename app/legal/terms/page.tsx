import BackButton from '../../components/BackButton';
export const metadata = {
  title: 'Terms of Service — Barter Payments',
  alternates: {
    canonical: 'https://www.barterpayments.xyz/legal/terms'
  }
};

export default function TermsPage() {
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
              <a href="/agent-commerce">Agent Commerce</a>
              <a href="/docs">Docs</a>
              <a href="/token">Token</a>
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
              <a className="button secondary" href="/docs">Get started</a>
            </div>
          </header>
        </div>
      </section>

      <section>
        <div className="container">
          <div className="page-hero">
            <h1>Terms of Service</h1>
            <p>Last updated: February 15, 2026</p>
          </div>
          <div className="legal-content">
            <h2>Acceptance</h2>
            <p>
              By accessing or using Barter Payments, you agree to these terms and are responsible for ensuring your agents comply
              with applicable laws and regulations.
            </p>
            <h2>Use of the API</h2>
            <ul>
              <li>You are responsible for securing your API keys and agent credentials.</li>
              <li>You agree not to abuse the system, attempt unauthorized access, or exceed rate limits.</li>
              <li>You acknowledge that onchain execution carries market and protocol risk.</li>
            </ul>
            <h2>Third‑party services</h2>
            <p>
              Barter Payments integrates with third‑party providers (e.g., wallet services, RPCs, aggregators). Availability and
              performance may vary.
            </p>
            <h2>Limitation of liability</h2>
            <p>
              Barter Payments is provided on an “as‑is” basis. We are not liable for onchain losses, agent errors, or market
              conditions.
            </p>
            <h2>Contact</h2>
            <p>Questions? Reach us at <a href="mailto:contact@barterpayments.xyz">contact@barterpayments.xyz</a>.</p>
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
          </nav>
        </div>
      </footer>
    </main>
  );
}
