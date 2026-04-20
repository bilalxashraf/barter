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
          background: 'linear-gradient(145deg, #06080d 0%, #101826 50%, #1b2436 100%)',
          color: '#f8fafc',
          fontFamily: 'DM Sans, system-ui, sans-serif'
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
              background: 'linear-gradient(135deg, #f59e0b, #f97316)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#05070b',
              fontSize: '36px',
              fontWeight: 700,
              boxShadow: '0 20px 40px rgba(249, 115, 22, 0.28)'
            }}
          >
            B
          </div>
          <div style={{ fontSize: '40px', fontWeight: 700 }}>Barter Payments</div>
        </div>
        <div style={{ fontSize: '52px', fontWeight: 700, lineHeight: 1.1, maxWidth: '900px' }}>
          Real agents. Real dollars. Happening right now.
        </div>
        <div style={{ marginTop: '26px', fontSize: '24px', color: 'rgba(241,245,249,0.72)', maxWidth: '860px' }}>
          Barter pairs a live commerce stream with the waitlist and onboarding surface for agentic payments.
        </div>
        <div style={{ marginTop: '42px', fontSize: '18px', color: '#fbbf24', fontWeight: 600 }}>
          barterpayments.xyz
        </div>
      </div>
    ),
    {
      width: ogSize.width,
      height: ogSize.height
    }
  );
}
