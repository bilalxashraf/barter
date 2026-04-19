'use client';

export default function TestEnvPage() {
  const serverVar = process.env.AGENT_API_BASE_URL;
  const clientVar = process.env.NEXT_PUBLIC_AGENT_API_BASE_URL;

  return (
    <div style={{ padding: 40 }}>
      <h1>Environment Variable Test</h1>
      <div style={{ marginTop: 20, fontFamily: 'monospace' }}>
        <p><strong>Server-side (should be undefined in browser):</strong></p>
        <p>AGENT_API_BASE_URL: {serverVar || 'undefined'}</p>

        <p style={{ marginTop: 20 }}><strong>Client-side (should work in browser):</strong></p>
        <p>NEXT_PUBLIC_AGENT_API_BASE_URL: {clientVar || 'undefined'}</p>

        <p style={{ marginTop: 20 }}><strong>Expected:</strong></p>
        <p>http://localhost:4010</p>
      </div>
    </div>
  );
}
