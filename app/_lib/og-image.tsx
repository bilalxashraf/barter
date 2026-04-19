import { ImageResponse } from 'next/og';

export const ogSize = { width: 1200, height: 630 };

export function createOgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '60px',
          background: 'linear-gradient(135deg, #f6f3ff 0%, #ffffff 40%, #f0ecff 100%)',
          color: '#111216',
          fontFamily: 'Inter, system-ui, sans-serif'
        }}
      >
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '18px',
            marginBottom: '40px'
          }}
        >
          <div
            style={{
              width: '76px',
              height: '76px',
              borderRadius: '20px',
              background: 'linear-gradient(135deg, #6D28D9, #A78BFA)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              fontSize: '36px',
              fontWeight: 700,
              boxShadow: '0 20px 40px rgba(109, 40, 217, 0.25)'
            }}
          >
            I
          </div>
          <div style={{ fontSize: '40px', fontWeight: 700 }}>Barter Payments</div>
        </div>
        <div style={{ fontSize: '52px', fontWeight: 700, lineHeight: 1.1, maxWidth: '900px' }}>
          Agentic onchain infrastructure for autonomous execution.
        </div>
        <div style={{ marginTop: '26px', fontSize: '24px', color: '#4A4F5C', maxWidth: '860px' }}>
          One endpoint for agents to create wallets, resolve tokens, sign transactions, and execute swaps.
        </div>
        <div style={{ marginTop: '42px', fontSize: '18px', color: '#6D28D9', fontWeight: 600 }}>
          api.barterpayments.xyz
        </div>
      </div>
    ),
    {
      width: ogSize.width,
      height: ogSize.height
    }
  );
}
