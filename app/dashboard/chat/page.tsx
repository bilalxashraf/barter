import { cookies } from 'next/headers';
import { getSessionCookie } from '../../_lib/session';
import { getUserByXId } from '../../_lib/xUserStore';
import { listAgentWallets, listSolanaWallets } from '../../_lib/agentApi';
import BackButton from '../../components/BackButton';
import ChatInterface from './ChatInterface';
import { redirect } from 'next/navigation';

export const metadata = {
  title: 'Chat — Barter Payments',
  alternates: {
    canonical: 'https://www.barterpayments.xyz/dashboard/chat'
  }
};

export default async function ChatPage() {
  const cookieStore = await cookies();
  const session = getSessionCookie(cookieStore);

  if (!session) {
    redirect('/dashboard');
  }

  const record = await getUserByXId(session.xUserId);

  if (!record?.apiKey) {
    redirect('/dashboard?error=create_api_key_first');
  }

  let wallets: { agentId: string; walletNo: number; address: string; networkId: string; createdAt: number }[] = [];
  let solanaWallets: { agentId: string; walletNo: number; address: string; networkId: string; createdAt: number }[] = [];

  try {
    const list = await listAgentWallets(session.agentId, record.apiKey);
    wallets = list.wallets || [];
  } catch {
    wallets = [];
  }

  try {
    const solanaList = await listSolanaWallets(session.agentId, record.apiKey);
    solanaWallets = solanaList.wallets || [];
  } catch {
    solanaWallets = [];
  }

  return (
    <main className="dashboard">
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
              <a href="/dashboard">Dashboard</a>
              <a href="/agent-commerce">Agent Commerce</a>
              <a href="/docs">Docs</a>
              <a href="/about">About</a>
            </nav>
            <div className="nav-actions">
              <a className="nav-social" href="https://x.com/barterpayments" target="_blank" rel="noreferrer" aria-label="Barter Payments on X">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.507 11.24H16.32l-5.11-6.675-5.84 6.675H2.06l7.73-8.84L1.61 2.25h6.676l4.62 6.11 5.338-6.11Zm-1.162 17.52h1.833L6.68 4.126H4.72l12.362 15.645Z" />
                </svg>
                <span>@barterpayments</span>
              </a>
              <a className="button secondary" href="/api/auth/x/logout">Sign out</a>
            </div>
          </header>
        </div>
      </section>

      <section>
        <div className="container">
          <div className="page-hero">
            <h1>Chat with Barter Payments</h1>
            <p>Execute onchain actions with natural language commands.</p>
          </div>

          <ChatInterface
            agentId={session.agentId}
            apiKey={record.apiKey}
            username={session.username}
            wallets={wallets}
            solanaWallets={solanaWallets}
          />
        </div>
      </section>
    </main>
  );
}
