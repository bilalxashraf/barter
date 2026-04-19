import { cookies } from 'next/headers';
import { getSessionCookie } from '../_lib/session';

export const metadata = {
  title: 'Terminal — Barter',
};

const page: React.CSSProperties = {
  minHeight: '100vh',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  background: '#000',
  color: '#fff',
  fontFamily: 'Inter, system-ui, sans-serif',
  textAlign: 'center',
  padding: '0 24px',
};

const logo: React.CSSProperties = {
  width: 48, height: 48, borderRadius: 12,
  background: '#fff', display: 'flex', alignItems: 'center',
  justifyContent: 'center', marginBottom: 32,
  fontSize: 20, fontWeight: 900, color: '#000',
};

const title: React.CSSProperties = {
  fontSize: 'clamp(1.8rem, 4vw, 2.6rem)',
  fontWeight: 900,
  letterSpacing: '-0.03em',
  margin: '0 0 10px',
  lineHeight: 1.1,
};

const sub: React.CSSProperties = {
  fontSize: '0.9rem',
  color: 'rgba(255,255,255,0.35)',
  maxWidth: 320,
  margin: '0 0 36px',
  lineHeight: 1.7,
};

const btnWhite: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 9,
  background: '#fff',
  color: '#000',
  padding: '13px 28px',
  borderRadius: 12,
  fontSize: '0.9rem',
  fontWeight: 700,
  textDecoration: 'none',
  marginBottom: 12,
};

const btnLaunch: React.CSSProperties = {
  display: 'inline-block',
  background: '#fff',
  color: '#000',
  padding: '13px 32px',
  borderRadius: 12,
  fontSize: '0.9rem',
  fontWeight: 700,
  textDecoration: 'none',
  marginBottom: 16,
};

const pill: React.CSSProperties = {
  display: 'inline-block',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 99,
  padding: '3px 12px',
  fontSize: '0.75rem',
  color: 'rgba(255,255,255,0.4)',
  marginBottom: 20,
};

const signout: React.CSSProperties = {
  display: 'inline-block',
  color: 'rgba(255,255,255,0.2)',
  fontSize: '0.75rem',
  textDecoration: 'none',
  marginTop: 4,
};

const XIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.507 11.24H16.32l-5.11-6.675-5.84 6.675H2.06l7.73-8.84L1.61 2.25h6.676l4.62 6.11 5.338-6.11Zm-1.162 17.52h1.833L6.68 4.126H4.72l12.362 15.645Z" />
  </svg>
);

export default async function DashboardPage() {
  const cookieStore = await cookies();
  const session = getSessionCookie(cookieStore);

  if (!session) {
    return (
      <main style={page}>
        <div style={logo}>B</div>
        <h1 style={title}>Barter Terminal</h1>
        <p style={sub}>Connect your X account to access the terminal.</p>
        <a href="/api/auth/x/start" style={btnWhite}>
          <XIcon />
          Connect with X
        </a>
      </main>
    );
  }

  return (
    <main style={page}>
      <div style={logo}>B</div>
      <span style={pill}>@{session.username}</span>
      <h1 style={title}>Barter Terminal</h1>
      <p style={sub}>Your agent is ready. Launch the terminal to start.</p>
      <a href="/dashboard/chat" style={btnLaunch}>
        Launch Terminal →
      </a>
      <br />
      <a href="/api/auth/x/logout" style={signout}>Sign out</a>
    </main>
  );
}
