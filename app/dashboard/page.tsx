import { cookies } from 'next/headers';
import { getSessionCookie } from '../_lib/session';

export const metadata = {
  title: 'Terminal — Barter',
};

const s = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    background: '#020205',
    color: '#fff',
    fontFamily: 'Inter, system-ui, sans-serif',
    textAlign: 'center' as const,
    padding: '0 24px',
  },
  logo: { marginBottom: 32, borderRadius: 16 },
  title: {
    fontSize: 'clamp(1.8rem, 4vw, 2.8rem)',
    fontWeight: 900,
    letterSpacing: '-0.03em',
    margin: '0 0 12px',
    lineHeight: 1.1,
  },
  sub: {
    fontSize: '1rem',
    color: 'rgba(255,255,255,0.45)',
    maxWidth: 380,
    margin: '0 0 40px',
    lineHeight: 1.6,
  },
  btnPrimary: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 10,
    background: '#000',
    color: '#fff',
    padding: '13px 28px',
    borderRadius: 12,
    fontSize: '0.95rem',
    fontWeight: 600,
    textDecoration: 'none',
    border: '1px solid rgba(255,255,255,0.15)',
    marginBottom: 12,
  },
  btnSecondary: {
    display: 'inline-block',
    color: 'rgba(255,255,255,0.35)',
    fontSize: '0.8rem',
    textDecoration: 'none',
    marginTop: 8,
  },
  welcome: {
    display: 'inline-block',
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 99,
    padding: '4px 14px',
    fontSize: '0.8rem',
    color: 'rgba(255,255,255,0.5)',
    marginBottom: 24,
  },
  launchBtn: {
    display: 'inline-block',
    background: 'linear-gradient(135deg, #6d28d9, #8b5cf6)',
    color: '#fff',
    padding: '14px 36px',
    borderRadius: 14,
    fontSize: '1rem',
    fontWeight: 600,
    textDecoration: 'none',
    boxShadow: '0 8px 32px rgba(109,40,217,0.35)',
    marginBottom: 16,
  },
};

const XIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.507 11.24H16.32l-5.11-6.675-5.84 6.675H2.06l7.73-8.84L1.61 2.25h6.676l4.62 6.11 5.338-6.11Zm-1.162 17.52h1.833L6.68 4.126H4.72l12.362 15.645Z" />
  </svg>
);

export default async function DashboardPage() {
  const cookieStore = await cookies();
  const session = getSessionCookie(cookieStore);

  if (!session) {
    return (
      <main style={s.page}>
        <img src="/BarterPaymentLogo.png" alt="Barter" width={56} height={56} style={s.logo} />
        <h1 style={s.title}>Barter Terminal</h1>
        <p style={s.sub}>Connect your X account to access the terminal.</p>
        <a href="/api/auth/x/start" style={s.btnPrimary}>
          <XIcon />
          Connect with X
        </a>
      </main>
    );
  }

  return (
    <main style={s.page}>
      <img src="/BarterPaymentLogo.png" alt="Barter" width={56} height={56} style={s.logo} />
      <span style={s.welcome}>@{session.username}</span>
      <h1 style={s.title}>Barter Terminal</h1>
      <p style={s.sub}>Your agent is ready. Launch the terminal to start.</p>
      <a href="/dashboard/chat" style={s.launchBtn}>
        Launch Terminal →
      </a>
      <br />
      <a href="/api/auth/x/logout" style={s.btnSecondary}>Sign out</a>
    </main>
  );
}
