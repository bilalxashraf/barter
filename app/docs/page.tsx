import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { DOCS, loadDocs } from './_lib/docs';
import BackButton from '../components/BackButton';

export const metadata = {
  title: 'Barter Payments Docs — Agent API',
  alternates: {
    canonical: 'https://www.barterpayments.xyz/docs'
  }
};

export default async function DocsPage() {
  const docs = await loadDocs();

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
              {docs.map((doc) => (
                <a key={doc.id} href={`#${doc.id}`}>{doc.title}</a>
              ))}
            </nav>
            <div className="nav-actions">
              <a className="button secondary" href="/agent-commerce">Agent Commerce</a>
              <a className="nav-social" href="https://x.com/barterpayments" target="_blank" rel="noreferrer" aria-label="Barter Payments on X">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.507 11.24H16.32l-5.11-6.675-5.84 6.675H2.06l7.73-8.84L1.61 2.25h6.676l4.62 6.11 5.338-6.11Zm-1.162 17.52h1.833L6.68 4.126H4.72l12.362 15.645Z" />
                </svg>
                <span>@barterpayments</span>
              </a>
              <a className="button secondary" href="/">Back to home</a>
            </div>
          </header>
        </div>
      </section>

      <section>
        <div className="container docs-layout">
          <aside className="docs-sidebar">
            <h4>Docs</h4>
            <p>Agent API reference & execution model.</p>
            <nav>
              {docs.map((doc) => (
                <a key={doc.id} href={`#${doc.id}`}>{doc.title}</a>
              ))}
            </nav>
          </aside>

          <div className="docs-content">
            {docs.map((doc) => (
              <article key={doc.id} id={doc.id} className="docs-article">
                <h2>{doc.title}</h2>
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{doc.content}</ReactMarkdown>
                {doc.id === 'demo' ? (
                  <div className="demo-card">
                    <div>
                      <p className="demo-eyebrow">Live Demo</p>
                      <h3>Agent executes a real onchain swap, no UI, no clicks</h3>
                      <p>
                        Watch the full flow: the agent reads the API docs, creates a wallet, waits for funding,
                        then swaps on Base — all from natural language.
                      </p>
                    </div>
                    <a
                      className="demo-cta"
                      href="https://x.com/barterpayments/status/2022570242787115108?s=20"
                      target="_blank"
                      rel="noreferrer"
                    >
                      Watch the 60‑second demo
                    </a>
                  </div>
                ) : null}
              </article>
            ))}
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
