export const metadata = {
  title: 'Barter — Agentic Payments',
  alternates: { canonical: 'https://barterpayments.xyz/home' },
};

export default function HomePage() {
  return (
    <main style={{
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
    }}>
      <div style={{
        width: 48, height: 48, borderRadius: 12,
        background: '#fff', display: 'flex', alignItems: 'center',
        justifyContent: 'center', marginBottom: 32,
        fontSize: 20, fontWeight: 900, color: '#000',
      }}>
        B
      </div>

      <h1 style={{
        fontSize: 'clamp(2rem, 5vw, 3.2rem)',
        fontWeight: 900,
        letterSpacing: '-0.03em',
        margin: '0 0 14px',
        lineHeight: 1.1,
      }}>
        Agentic Payments
      </h1>

      <p style={{
        fontSize: '0.95rem',
        color: 'rgba(255,255,255,0.38)',
        maxWidth: 360,
        margin: '0 0 44px',
        lineHeight: 1.7,
      }}>
        Let your AI agents transact — pay, settle, and execute onchain autonomously.
      </p>

      <a href="/dashboard" style={{
        display: 'inline-block',
        background: '#fff',
        color: '#000',
        padding: '13px 32px',
        borderRadius: 12,
        fontSize: '0.9rem',
        fontWeight: 700,
        textDecoration: 'none',
        letterSpacing: '0.01em',
      }}>
        Launch Terminal →
      </a>

      <a href="/" style={{
        marginTop: 20,
        fontSize: '0.75rem',
        color: 'rgba(255,255,255,0.2)',
        textDecoration: 'none',
      }}>
        ← Back
      </a>
    </main>
  );
}
