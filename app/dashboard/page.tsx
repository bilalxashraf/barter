import { cookies } from 'next/headers';
import { getSessionCookie } from '../_lib/session';
import { getUserByXId } from '../_lib/xUserStore';
import { listAgentWallets, listSolanaWallets } from '../_lib/agentApi';
import ApiKeyField from './ApiKeyField';
import CopyButton from './CopyButton';
import StatusBanner from './StatusBanner';
import WalletBalance from './WalletBalance';
import WalletSelector from './WalletSelector';
import SolanaWalletBalance from './SolanaWalletBalance';
import SolanaWalletSelector from './SolanaWalletSelector';
import PaymentLinksSection from './PaymentLinksSection';
import CardsSection from './CardsSection';

export const metadata = {
  title: 'Dashboard — Barter',
  alternates: { canonical: 'https://barterpayments.xyz/dashboard' },
};

type DashboardSearchParams = Record<string, string | string[] | undefined>;

function readSearchParam(v: string | string[] | undefined) {
  return Array.isArray(v) ? v[0] : v;
}
function decodeParam(v: string | undefined) {
  if (!v) return undefined;
  try { return decodeURIComponent(v); } catch { return v; }
}
function getAuthError(p?: DashboardSearchParams) {
  const error  = decodeParam(readSearchParam(p?.error));
  const detail = decodeParam(readSearchParam(p?.detail));
  if (!error) return null;
  const map: Record<string, { title: string; detail?: string }> = {
    'config_missing:missing_x_client_secret':       { title: 'X OAuth not configured.', detail: 'Add X_CLIENT_SECRET to Vercel and redeploy.' },
    'config_missing:missing_or_invalid_x_client_secret': { title: 'X rejected the token exchange.', detail: 'The client secret is missing or invalid.' },
    'config_missing:missing_auth_secret':           { title: 'Session signing not configured.', detail: 'Add X_AUTH_SECRET to Vercel and redeploy.' },
    'oauth_state:cookie_mismatch':                  { title: 'Login session expired.', detail: 'Try connecting X again in the same tab.' },
  };
  return map[`${error}:${detail}`] ?? { title: error.replace(/_/g, ' '), detail: detail?.replace(/_/g, ' ') };
}

/* ─── shared inline style tokens ─── */
const S = {
  page:    { background: '#000', minHeight: '100vh', color: '#fff', fontFamily: 'Inter, system-ui, sans-serif' } as React.CSSProperties,
  nav:     { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', borderBottom: '1px solid rgba(255,255,255,0.07)', maxWidth: 760, margin: '0 auto', width: '100%' } as React.CSSProperties,
  logo:    { display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', color: '#fff', fontWeight: 700, fontSize: '0.95rem' } as React.CSSProperties,
  logoBox: { width: 28, height: 28, borderRadius: 8, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 900, color: '#000' } as React.CSSProperties,
  wrap:    { maxWidth: 760, margin: '0 auto', padding: '0 24px 80px' } as React.CSSProperties,
  section: { marginTop: 48 } as React.CSSProperties,
  label:   { fontSize: '0.7rem', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' as const, color: 'rgba(255,255,255,0.3)', marginBottom: 6 },
  card:    { background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: '20px 24px' } as React.CSSProperties,
  row:     { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 } as React.CSSProperties,
  mono:    { fontFamily: 'monospace', fontSize: '0.85rem', color: 'rgba(255,255,255,0.7)', wordBreak: 'break-all' as const },
  muted:   { fontSize: '0.82rem', color: 'rgba(255,255,255,0.35)', marginTop: 4 } as React.CSSProperties,
  btnW:    { background: '#fff', color: '#000', border: 'none', borderRadius: 10, padding: '9px 18px', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer', textDecoration: 'none', display: 'inline-block' } as React.CSSProperties,
  btnO:    { background: 'transparent', color: 'rgba(255,255,255,0.6)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 10, padding: '8px 16px', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer', textDecoration: 'none', display: 'inline-block' } as React.CSSProperties,
  divider: { borderTop: '1px solid rgba(255,255,255,0.06)', margin: '16px 0' } as React.CSSProperties,
  tag:     { display: 'inline-block', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 99, padding: '2px 10px', fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)' } as React.CSSProperties,
};

const XIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.507 11.24H16.32l-5.11-6.675-5.84 6.675H2.06l7.73-8.84L1.61 2.25h6.676l4.62 6.11 5.338-6.11Zm-1.162 17.52h1.833L6.68 4.126H4.72l12.362 15.645Z" />
  </svg>
);

export default async function DashboardPage({ searchParams }: { searchParams?: Promise<DashboardSearchParams> }) {
  const cookieStore = await cookies();
  const session = getSessionCookie(cookieStore);
  const params = searchParams ? await searchParams : undefined;
  const authError = getAuthError(params);

  /* ── Not logged in ── */
  if (!session) {
    return (
      <main style={S.page}>
        <nav style={{ ...S.nav, maxWidth: '100%', padding: '16px 32px' }}>
          <a href="/" style={S.logo}>
            <div style={S.logoBox}>B</div>
            <span>Barter</span>
          </a>
          <a href="https://x.com/barterpayments" target="_blank" rel="noreferrer" style={{ color: 'rgba(255,255,255,0.3)', display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8rem', textDecoration: 'none' }}>
            <XIcon /> @barterpayments
          </a>
        </nav>

        <div style={{ maxWidth: 480, margin: '80px auto', padding: '0 24px', textAlign: 'center' }}>
          {authError && (
            <div style={{ background: 'rgba(255,80,80,0.07)', border: '1px solid rgba(255,80,80,0.2)', borderRadius: 12, padding: '14px 18px', marginBottom: 28, textAlign: 'left' }}>
              <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>{authError.title}</div>
              {authError.detail && <div style={S.muted}>{authError.detail}</div>}
            </div>
          )}
          <div style={{ ...S.logoBox, width: 48, height: 48, borderRadius: 12, fontSize: 20, margin: '0 auto 24px' }}>B</div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 900, margin: '0 0 10px', letterSpacing: '-0.02em' }}>Barter Terminal</h1>
          <p style={{ ...S.muted, fontSize: '0.9rem', marginBottom: 32 }}>Connect your X account to access the terminal.</p>
          <a href="/api/auth/x/start" style={{ ...S.btnW, padding: '12px 28px', fontSize: '0.9rem', display: 'inline-flex', alignItems: 'center', gap: 9 }}>
            <XIcon /> Connect with X
          </a>
        </div>
      </main>
    );
  }

  /* ── Fetch data ── */
  const record = await getUserByXId(session.xUserId);
  let wallets: { agentId: string; walletNo: number; address: string; networkId: string; createdAt: number }[] = [];
  let solanaWallets: { agentId: string; walletNo: number; address: string; networkId: string; createdAt: number }[] = [];

  if (record?.apiKey) {
    try { wallets = (await listAgentWallets(session.agentId, record.apiKey)).wallets || []; } catch { wallets = []; }
    try { solanaWallets = (await listSolanaWallets(session.agentId, record.apiKey)).wallets || []; } catch { solanaWallets = []; }
  }

  const activeWallet =
    wallets.find(w => record?.walletNo && w.walletNo === record.walletNo) ||
    wallets.find(w => record?.walletAddress && w.address.toLowerCase() === record.walletAddress?.toLowerCase()) ||
    wallets[0] ||
    (record?.walletAddress ? { agentId: session.agentId, walletNo: record.walletNo || 1, address: record.walletAddress, networkId: 'base', createdAt: record.createdAt || Date.now() } : undefined);

  const activeSolanaWallet =
    solanaWallets.find(w => record?.solanaWalletNo && w.walletNo === record.solanaWalletNo) ||
    solanaWallets.find(w => record?.solanaWalletAddress && w.address === record.solanaWalletAddress) ||
    solanaWallets[0] ||
    (record?.solanaWalletAddress ? { agentId: session.agentId, walletNo: record.solanaWalletNo || 1, address: record.solanaWalletAddress, networkId: 'solana', createdAt: record.createdAt || Date.now() } : undefined);

  const activeWalletNo = activeWallet?.walletNo || 1;
  const activeSolanaWalletNo = activeSolanaWallet?.walletNo || 1;
  const isReady = record?.apiKey && (wallets.length > 0 || solanaWallets.length > 0);

  /* ── Logged in UI ── */
  return (
    <main style={S.page}>

      {/* Nav */}
      <div style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        <nav style={S.nav}>
          <a href="/" style={S.logo}>
            <div style={S.logoBox}>B</div>
            <span>Barter</span>
          </a>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {isReady && (
              <a href="/dashboard/chat" style={S.btnW}>Launch Terminal →</a>
            )}
            <a href="/api/auth/x/logout" style={S.btnO}>Sign out</a>
          </div>
        </nav>
      </div>

      <div style={S.wrap}>

        {/* Header */}
        <div style={{ paddingTop: 40, marginBottom: 40 }}>
          <span style={S.tag}>@{session.username}</span>
          <h1 style={{ fontSize: 'clamp(1.5rem, 3vw, 2rem)', fontWeight: 900, margin: '12px 0 6px', letterSpacing: '-0.02em' }}>
            Your Dashboard
          </h1>
          <p style={{ ...S.muted, fontSize: '0.88rem' }}>
            {isReady ? 'All set — launch the terminal to start transacting.' : 'Complete setup below to start using @barterpayments.'}
          </p>
        </div>

        {/* Error banner */}
        {authError && (
          <div style={{ background: 'rgba(255,80,80,0.07)', border: '1px solid rgba(255,80,80,0.2)', borderRadius: 12, padding: '14px 18px', marginBottom: 24 }}>
            <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>{authError.title}</div>
            {authError.detail && <div style={S.muted}>{authError.detail}</div>}
          </div>
        )}

        <StatusBanner status={readSearchParam(params?.status)} />

        {/* ── Agent ID ── */}
        <div style={{ ...S.card, marginBottom: 12 }}>
          <div style={S.label}>Agent ID</div>
          <div style={S.mono}>{record?.agentId || session.agentId}</div>
        </div>

        {/* ── API Key ── */}
        <div style={{ ...S.card, marginBottom: 12 }}>
          <div style={{ ...S.row, marginBottom: record?.apiKey ? 12 : 0 }}>
            <div style={S.label}>API Key</div>
            {!record?.apiKey && (
              <form action="/api/agent/keys/create" method="post">
                <button style={S.btnW} type="submit">Create API key</button>
              </form>
            )}
          </div>
          {record?.apiKey ? (
            <ApiKeyField apiKey={record.apiKey} />
          ) : (
            <>
              <div style={S.divider} />
              <div style={S.muted}>Already have a key? Paste it below to link your account.</div>
              <form action="/api/agent/keys/save" method="post" style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                <input type="text" name="apiKey" placeholder="ak_..." required
                  style={{ flex: 1, background: '#000', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, padding: '8px 12px', color: '#fff', fontSize: '0.85rem', outline: 'none' }} />
                <button style={S.btnO} type="submit">Save</button>
              </form>
            </>
          )}
        </div>

        {/* ── EVM Wallets ── */}
        <div style={{ ...S.card, marginBottom: 12 }}>
          <div style={{ ...S.row, marginBottom: 12 }}>
            <div>
              <div style={S.label}>EVM Wallet</div>
              <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.25)', marginTop: 2 }}>Base network</div>
            </div>
            {record?.apiKey && (
              <form action="/api/agent/wallets/create" method="post">
                <button style={S.btnO} type="submit">{activeWallet ? '+ New' : 'Create wallet'}</button>
              </form>
            )}
          </div>

          {activeWallet?.address ? (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' as const }}>
                <span style={S.tag}>{(activeWallet.networkId || 'base').toUpperCase()}</span>
                <span style={S.tag}>Wallet {activeWallet.walletNo}</span>
              </div>
              <div style={{ ...S.mono, marginTop: 10, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' as const }}>
                <span style={{ flex: 1 }}>{activeWallet.address}</span>
                <CopyButton value={activeWallet.address} label="Copy" />
              </div>
              {wallets.length > 1 && <WalletSelector wallets={wallets} activeWalletNo={activeWalletNo} />}
              <WalletBalance address={activeWallet.address} networkId={activeWallet.networkId || 'base'} />
            </>
          ) : (
            <div style={S.muted}>{record?.apiKey ? 'No wallet yet — create one above.' : 'Create an API key first.'}</div>
          )}
        </div>

        {/* ── Solana Wallets ── */}
        <div style={{ ...S.card, marginBottom: 24 }}>
          <div style={{ ...S.row, marginBottom: 12 }}>
            <div>
              <div style={S.label}>Solana Wallet</div>
              <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.25)', marginTop: 2 }}>Solana network</div>
            </div>
            {record?.apiKey && (
              <form action="/api/agent/wallets/solana/create" method="post">
                <button style={S.btnO} type="submit">{activeSolanaWallet ? '+ New' : 'Create wallet'}</button>
              </form>
            )}
          </div>

          {activeSolanaWallet?.address ? (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={S.tag}>SOLANA</span>
                <span style={S.tag}>Wallet {activeSolanaWallet.walletNo}</span>
              </div>
              <div style={{ ...S.mono, marginTop: 10, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' as const }}>
                <span style={{ flex: 1 }}>{activeSolanaWallet.address}</span>
                <CopyButton value={activeSolanaWallet.address} label="Copy" />
              </div>
              {solanaWallets.length > 1 && <SolanaWalletSelector wallets={solanaWallets} activeWalletNo={activeSolanaWalletNo} />}
              <SolanaWalletBalance agentId={session.agentId} walletNo={activeSolanaWallet.walletNo} address={activeSolanaWallet.address} />
            </>
          ) : (
            <div style={S.muted}>{record?.apiKey ? 'No Solana wallet yet — create one above.' : 'Create an API key first.'}</div>
          )}
        </div>

        {/* Payment links + Cards */}
        {record?.apiKey && (wallets.length > 0 || solanaWallets.length > 0) && (
          <PaymentLinksSection agentId={session.agentId} apiKey={record.apiKey} wallets={wallets} solanaWallets={solanaWallets} />
        )}
        {record?.apiKey && (
          <CardsSection agentId={session.agentId} apiKey={record.apiKey} username={session.username} />
        )}

        {/* How to use */}
        <div style={{ ...S.card, marginTop: 12 }}>
          <div style={S.label}>How to use on X</div>
          <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column' as const, gap: 8 }}>
            {[
              '@barterpayments swap 0.05 eth to usdc on base',
              '@barterpayments swap 0.1 sol to usdc on solana',
            ].map(cmd => (
              <div key={cmd} style={{ background: '#000', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 8, padding: '10px 14px', fontFamily: 'monospace', fontSize: '0.82rem', color: 'rgba(255,255,255,0.6)' }}>
                {cmd}
              </div>
            ))}
          </div>
          <div style={{ ...S.muted, marginTop: 14, fontSize: '0.78rem' }}>
            Fund your wallet → mention @barterpayments → we execute and reply with the tx hash.
          </div>
        </div>

      </div>
    </main>
  );
}
