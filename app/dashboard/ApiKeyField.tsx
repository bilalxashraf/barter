"use client";

import { useState } from 'react';

function maskKey(value: string) {
  if (!value) return '';
  if (value.length <= 8) return '•'.repeat(value.length);
  return `${value.slice(0, 4)}••••••${value.slice(-4)}`;
}

export default function ApiKeyField({ apiKey }: { apiKey: string }) {
  const [revealed, setRevealed] = useState(false);
  const [copied, setCopied] = useState(false);

  const display = revealed ? apiKey : maskKey(apiKey);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(apiKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="api-key-row">
      <code className="mono">{display}</code>
      <div className="api-key-actions">
        <button
          type="button"
          className="button ghost"
          onClick={() => setRevealed((prev) => !prev)}
        >
          {revealed ? 'Hide' : 'Show'}
        </button>
        <button type="button" className="button ghost" onClick={handleCopy}>
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
    </div>
  );
}
