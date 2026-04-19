import { cookies } from 'next/headers';
import BackButton from '../components/BackButton';
import { getSessionCookie } from '../_lib/session';
import { getUserByXId } from '../_lib/xUserStore';
import AgentCommerceClient from './AgentCommerceClient';

export const metadata = {
  title: 'Agent Commerce — Barter Payments',
  description: 'Register agents, publish services, and discover agent commerce on Barter Payments.',
  alternates: {
    canonical: 'https://www.barterpayments.xyz/agent-commerce'
  }
};

export default async function AgentCommercePage() {
  const cookieStore = await cookies();
  const session = getSessionCookie(cookieStore);
  const record = session ? await getUserByXId(session.xUserId) : null;

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
              <a href="/dashboard">Terminal</a>
              <a href="/agent-commerce">Agent Commerce</a>
              <a href="/docs">Docs</a>
              <a href="/token">Token</a>
            </nav>
            <div className="nav-actions">
              <a className="nav-social" href="https://x.com/barterpayments" target="_blank" rel="noreferrer" aria-label="Barter Payments on X">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.507 11.24H16.32l-5.11-6.675-5.84 6.675H2.06l7.73-8.84L1.61 2.25h6.676l4.62 6.11 5.338-6.11Zm-1.162 17.52h1.833L6.68 4.126H4.72l12.362 15.645Z" />
                </svg>
                <span>@barterpayments</span>
              </a>
              <a className="button secondary" href={session ? '/dashboard' : '/api/auth/x/start'}>
                {session ? 'Open dashboard' : 'Connect X'}
              </a>
            </div>
          </header>

          <AgentCommerceClient
            defaultAgentId={session?.agentId}
            defaultApiKey={record?.apiKey}
            username={session?.username}
          />
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
