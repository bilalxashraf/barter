import BackButton from '../../components/BackButton';
export const metadata = {
  title: 'Privacy Policy — Barter Payments',
  alternates: {
    canonical: 'https://www.barterpayments.xyz/legal/privacy'
  }
};

export default function PrivacyPage() {
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
            <h1>Privacy Policy</h1>
            <p>Last updated: February 15, 2026</p>
          </div>
          <div className="legal-content">
            <h2>Overview</h2>
            <p>
              Barter Payments provides developer infrastructure for autonomous agents. This policy explains what information we
              collect and how we use it.
            </p>
            <h2>Information we collect</h2>
            <ul>
              <li>Account identifiers such as agent IDs and API keys (hashed).</li>
              <li>Operational telemetry (request IDs, timestamps, error logs).</li>
              <li>Onchain execution metadata (transaction hashes, chain identifiers).</li>
            </ul>
            <h2>How we use data</h2>
            <ul>
              <li>Provide and secure the API services.</li>
              <li>Detect abuse, fraud, or misuse.</li>
              <li>Improve reliability and performance.</li>
            </ul>
            <h2>Data retention</h2>
            <p>
              We retain operational logs for a limited period to support debugging and security. Contact us for removal
              requests.
            </p>
            <h2>Contact</h2>
            <p>For privacy questions, email <a href="mailto:contact@barterpayments.xyz">contact@barterpayments.xyz</a>.</p>
          </div>
        </div>
      </section>

      <footer className="footer">
        <div className="container footer-inner">
          <strong>Barter Payments</strong>
          <nav className="footer-links">
            <a href="/about">About</a>
            <a href="/contact">Contact</a>
            <a href="/legal/terms">Terms</a>
          </nav>
        </div>
      </footer>
    </main>
  );
}
