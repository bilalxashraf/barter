import { cookies } from 'next/headers';
import { getSessionCookie } from '../_lib/session';
import { getUserByXId } from '../_lib/xUserStore';
import { listAgentWallets, listSolanaWallets } from '../_lib/agentApi';
import ApiKeyField from './ApiKeyField';
import CopyButton from './CopyButton';
import StatusBanner from './StatusBanner';
import BackButton from '../components/BackButton';
import WalletBalance from './WalletBalance';
import WalletSelector from './WalletSelector';
import SolanaWalletBalance from './SolanaWalletBalance';
import SolanaWalletSelector from './SolanaWalletSelector';
import PaymentLinksSection from './PaymentLinksSection';
import CardsSection from './CardsSection';

export const metadata = {
  title: 'Dashboard — Barter',
  alternates: {
    canonical: 'https://www.barterpayments.xyz/dashboard'
  }
};

type DashboardSearchParams = Record<string, string | string[] | undefined>;

const shortAddress = (address?: string) => {
  if (!address) return '';
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
};

function readSearchParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function decodeSearchParam(value: string | undefined): string | undefined {
  if (!value) return undefined;
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function getAuthError(params?: DashboardSearchParams): { title: string; detail?: string } | null {
  const error = decodeSearchParam(readSearchParam(params?.error));
  const detail = decodeSearchParam(readSearchParam(params?.detail));

  if (!error) return null;

  if (error === 'config_missing' && detail === 'missing_x_client_secret') {
    return {
      title: 'X OAuth is not configured for this deployment.',
      detail: 'Add X_CLIENT_SECRET to the environment and redeploy before trying Connect X again.',
    };
  }

  if (error === 'config_missing' && detail === 'missing_or_invalid_x_client_secret') {
    return {
      title: 'X rejected the token exchange for this deployment.',
      detail: 'The X client secret is missing or invalid in the deployed environment.',
    };
  }

  if (error === 'config_missing' && detail === 'missing_auth_secret') {
    return {
      title: 'Session signing is not configured for this deployment.',
      detail: 'Add X_AUTH_SECRET to the environment and redeploy before trying Connect X again.',
    };
  }

  if (error === 'oauth_state' && detail === 'cookie_mismatch') {
    return {
      title: 'The X login session expired before the callback completed.',
      detail: 'Try Connect X again in the same browser tab.',
    };
  }

  return {
    title: error.replace(/_/g, ' '),
    detail: detail?.replace(/_/g, ' '),
  };
}

export default async function DashboardPage({ searchParams }: { searchParams?: Promise<DashboardSearchParams> }) {
  const cookieStore = await cookies();
  const session = getSessionCookie(cookieStore);
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const authError = getAuthError(resolvedSearchParams);

  if (!session) {
    return (
      <main className="dashboard">
        <section>
          <div className="container">
            <header className="nav">
              <div className="nav-left">
              <BackButton />
              <a className="nav-logo" href="/">
                <img src="/BarterPaymentLogo.png" alt="Barter logo" width={36} height={36} />
                <span>Barter</span>
              </a>
            </div>
              <nav className="nav-links">
              </nav>
              <div className="nav-actions">
                <a className="nav-social" href="https://x.com/barterpayments" target="_blank" rel="noreferrer" aria-label="Barter on X">
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
              <h1>Connect your X account</h1>
              <p>Sign in to manage your agent key and wallet for @barterpayments mentions.</p>
            </div>
            {authError ? (
              <div className="card" style={{ maxWidth: 720, marginBottom: 24, borderColor: 'rgba(255, 120, 120, 0.25)', background: 'rgba(255, 64, 64, 0.08)' }}>
                <strong>{authError.title}</strong>
                {authError.detail ? (
                  <p className="muted" style={{ marginTop: 10 }}>{authError.detail}</p>
                ) : null}
              </div>
            ) : null}
            <div className="card" style={{ maxWidth: 520 }}>
              <h4>Sign in with X</h4>
              <p>Connect your X account to claim your agent ID. You’ll create your API key and wallet next.</p>
              <a className="button primary" href="/api/auth/x/start">Connect X</a>
              <p className="muted" style={{ marginTop: 16, fontSize: "0.85rem" }}>
                💡 Tip: To switch accounts, first <a href="https://x.com/logout" target="_blank" rel="noreferrer" style={{ color: "var(--accent-4)", fontWeight: 600 }}>log out of X</a> in another tab, then return here.
              </p>
            </div>
          </div>
        </section>
      </main>
    );
  }

  const record = await getUserByXId(session.xUserId);
  let wallets: { agentId: string; walletNo: number; address: string; networkId: string; createdAt: number }[] = [];
  let solanaWallets: { agentId: string; walletNo: number; address: string; networkId: string; createdAt: number }[] = [];

  if (record?.apiKey) {
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
  }

  const fallbackWallet = record?.walletAddress
    ? {
        agentId: session.agentId,
        walletNo: record.walletNo || 1,
        address: record.walletAddress,
        networkId: 'base',
        createdAt: record.createdAt || Date.now()
      }
    : undefined;

  const preferredWallet =
    wallets.find((item) => record?.walletNo && item.walletNo === record.walletNo) ||
    wallets.find((item) => record?.walletAddress && item.address.toLowerCase() === record.walletAddress.toLowerCase()) ||
    wallets[0];

  const activeWallet = preferredWallet || fallbackWallet;
  const activeWalletNo = activeWallet?.walletNo || wallets[0]?.walletNo || 1;

  // Solana wallet
  const fallbackSolanaWallet = record?.solanaWalletAddress
    ? {
        agentId: session.agentId,
        walletNo: record.solanaWalletNo || 1,
        address: record.solanaWalletAddress,
        networkId: 'solana',
        createdAt: record.createdAt || Date.now()
      }
    : undefined;

  const preferredSolanaWallet =
    solanaWallets.find((item) => record?.solanaWalletNo && item.walletNo === record.solanaWalletNo) ||
    solanaWallets.find((item) => record?.solanaWalletAddress && item.address === record.solanaWalletAddress) ||
    solanaWallets[0];

  const activeSolanaWallet = preferredSolanaWallet || fallbackSolanaWallet;
  const activeSolanaWalletNo = activeSolanaWallet?.walletNo || solanaWallets[0]?.walletNo || 1;

  return (
    <main className="dashboard">
      <section>
        <div className="container">
          <header className="nav">
            <div className="nav-left">
              <BackButton />
              <a className="nav-logo" href="/">
                <img src="/BarterPaymentLogo.png" alt="Barter logo" width={36} height={36} />
                <span>Barter</span>
              </a>
            </div>
            <nav className="nav-links">
            </nav>
            <div className="nav-actions">
              <a className="nav-social" href="https://x.com/barterpayments" target="_blank" rel="noreferrer" aria-label="Barter on X">
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
            <h1>Welcome, @{session.username}</h1>
            <p>Finish setup by creating your API key and wallet, then use @barterpayments mentions to execute onchain actions.</p>
            {record?.apiKey && (wallets.length > 0 || solanaWallets.length > 0) ? (
              <div style={{ marginTop: 16 }}>
                <a href="/dashboard/chat" className="button primary">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                  </svg>
                  Chat with Barter
                </a>
              </div>
            ) : null}
          </div>

          {authError ? (
            <div className="card" style={{ borderColor: 'rgba(255, 0, 0, 0.2)', background: 'rgba(255, 0, 0, 0.04)' }}>
              <strong>{authError.title}</strong>
              {authError.detail ? (
                <p className="muted" style={{ marginTop: 10 }}>{authError.detail}</p>
              ) : null}
            </div>
          ) : null}

          <StatusBanner status={readSearchParam(resolvedSearchParams?.status)} />

          <div className="page-grid">
            <div className="card">
              <h4>Agent ID</h4>
              <p>{record?.agentId || session.agentId}</p>
            </div>
            <div className="card">
              <h4>API Key</h4>
              {record?.apiKey ? (
                <ApiKeyField apiKey={record.apiKey} />
              ) : (
                <p>Not created yet</p>
              )}
              {!record?.apiKey ? (
                <form action="/api/agent/keys/create" method="post">
                  <button className="button primary" type="submit">Create API key</button>
                </form>
              ) : null}
            </div>
            <div className="card wallet-card">
              <div className="wallet-header">
                <div>
                  <h4>Wallets</h4>
                  <p className="muted">Choose a default wallet for @barterpayments actions.</p>
                </div>
                {record?.apiKey ? (
                  <form action="/api/agent/wallets/create" method="post">
                    <button className="button secondary" type="submit">
                      {activeWallet ? 'Create new wallet' : 'Create wallet'}
                    </button>
                  </form>
                ) : null}
              </div>

              {activeWallet?.address ? (
                <div className="wallet-main">
                  <div className="wallet-meta">
                    <span className="wallet-label">Default wallet</span>
                    <span className="wallet-id">Wallet {activeWallet.walletNo ?? '-'} </span>
                    <span className="wallet-network">{(activeWallet.networkId || 'base').toUpperCase()}</span>
                  </div>
                  <div className="wallet-address-row">
                    <span className="wallet-address">{activeWallet.address}</span>
                    <CopyButton value={activeWallet.address} label="Copy" />
                  </div>
                </div>
              ) : (
                <div className="wallet-empty">
                  <p>Not created yet</p>
                </div>
              )}

              {wallets.length > 1 ? (
                <WalletSelector
                  wallets={wallets}
                  activeWalletNo={activeWalletNo}
                />
              ) : null}

              {activeWallet?.address ? (
                <WalletBalance
                  address={activeWallet.address}
                  networkId={activeWallet.networkId || 'base'}
                />
              ) : null}

              {!record?.apiKey ? (
                <p className="muted">Create an API key to enable wallets.</p>
              ) : null}
            </div>

            <div className="card wallet-card">
              <div className="wallet-header">
                <div>
                  <h4>Solana Wallets</h4>
                  <p className="muted">Create and manage Solana wallets for @barterpayments actions.</p>
                </div>
                {record?.apiKey ? (
                  <form action="/api/agent/wallets/solana/create" method="post">
                    <button className="button secondary" type="submit">
                      {activeSolanaWallet ? 'Create new Solana wallet' : 'Create Solana wallet'}
                    </button>
                  </form>
                ) : null}
              </div>

              {activeSolanaWallet?.address ? (
                <div className="wallet-main">
                  <div className="wallet-meta">
                    <span className="wallet-label">Default Solana wallet</span>
                    <span className="wallet-id">Wallet {activeSolanaWallet.walletNo ?? '-'} </span>
                    <span className="wallet-network">SOLANA</span>
                  </div>
                  <div className="wallet-address-row">
                    <span className="wallet-address">{activeSolanaWallet.address}</span>
                    <CopyButton value={activeSolanaWallet.address} label="Copy" />
                  </div>
                </div>
              ) : (
                <div className="wallet-empty">
                  <p>No Solana wallet created yet</p>
                </div>
              )}

              {solanaWallets.length > 1 ? (
                <SolanaWalletSelector
                  wallets={solanaWallets}
                  activeWalletNo={activeSolanaWalletNo}
                />
              ) : null}

              {activeSolanaWallet?.address ? (
                <SolanaWalletBalance
                  agentId={session.agentId}
                  walletNo={activeSolanaWallet.walletNo}
                  address={activeSolanaWallet.address}
                />
              ) : null}

              {!record?.apiKey ? (
                <p className="muted">Create an API key to enable Solana wallets.</p>
              ) : null}
            </div>
          </div>

          {!record?.apiKey ? (
            <div className="card" style={{ marginTop: 20 }}>
              <h4>Already have an API key?</h4>
              <p>Paste it here to link your X account to the existing agent.</p>
              <form action="/api/agent/keys/save" method="post" className="form-inline">
                <input type="text" name="apiKey" placeholder="ak_..." required />
                <button className="button secondary" type="submit">Save key</button>
              </form>
            </div>
          ) : null}

          {record?.apiKey && (wallets.length > 0 || solanaWallets.length > 0) ? (
            <PaymentLinksSection
              agentId={session.agentId}
              apiKey={record.apiKey}
              wallets={wallets}
              solanaWallets={solanaWallets}
            />
          ) : null}

          {record?.apiKey ? (
            <CardsSection
              agentId={session.agentId}
              apiKey={record.apiKey}
              username={session.username}
            />
          ) : null}

          <div className="card" style={{ marginTop: 24 }}>
            <h4>How to use on X</h4>
            <ul>
              <li>Fund your EVM wallet with ETH on Base or your Solana wallet with SOL.</li>
              <li>Mention @barterpayments with a command.</li>
              <li>We execute and reply with the tx hash.</li>
            </ul>
            <div className="code-block" style={{ marginTop: 16 }}>
              @barterpayments swap 0.05 eth to usdc on base
            </div>
            <div className="code-block" style={{ marginTop: 12 }}>
              @barterpayments swap 0.1 sol to usdc on solana
            </div>
          </div>
        </div>
      </section>

      <footer className="footer">
        <div className="container footer-inner">
          <strong>Barter</strong>
          <nav className="footer-links">
            <a href="/legal/privacy">Privacy</a>
            <a href="/legal/terms">Terms</a>
          </nav>
        </div>
      </footer>
    </main>
  );
}
