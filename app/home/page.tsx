export const metadata = {
  title: 'Barter — Agentic Payments',
  alternates: {
    canonical: 'https://barterpayments.xyz/home',
  },
};

export default function HomePage() {
  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#020205',
        color: '#fff',
        fontFamily: 'Inter, system-ui, sans-serif',
        textAlign: 'center',
        padding: '0 24px',
      }}
    >
      <img
        src="/BarterPaymentLogo.png"
        alt="Barter"
        width={64}
        height={64}
        style={{ marginBottom: 32, borderRadius: 16 }}
      />

      <h1
        style={{
          fontSize: 'clamp(2rem, 5vw, 3.5rem)',
          fontWeight: 900,
          letterSpacing: '-0.03em',
          margin: '0 0 16px',
          lineHeight: 1.1,
        }}
      >
        Agentic Payments
      </h1>

      <p
        style={{
          fontSize: '1.1rem',
          color: 'rgba(255,255,255,0.5)',
          maxWidth: 420,
          margin: '0 0 48px',
          lineHeight: 1.6,
        }}
      >
        Let your AI agents transact — pay, settle, and execute onchain autonomously.
      </p>

      <a
        href="/dashboard"
        style={{
          display: 'inline-block',
          background: 'linear-gradient(135deg, #6d28d9, #8b5cf6)',
          color: '#fff',
          padding: '14px 36px',
          borderRadius: 14,
          fontSize: '1rem',
          fontWeight: 600,
          textDecoration: 'none',
          letterSpacing: '0.01em',
          boxShadow: '0 8px 32px rgba(109,40,217,0.35)',
          transition: 'opacity 0.2s',
        }}
      >
        Launch Terminal →
      </a>
    </main>
  );
}
