"use client";

import { useEffect, useState } from 'react';

export default function StatusBanner({ status }: { status?: string }) {
  const [visible, setVisible] = useState(Boolean(status));

  useEffect(() => {
    if (!status) return;
    setVisible(true);
    const timer = setTimeout(() => {
      setVisible(false);
      try {
        const url = new URL(window.location.href);
        url.searchParams.delete('status');
        window.history.replaceState({}, '', url.toString());
      } catch {
        // no-op
      }
    }, 3500);

    return () => clearTimeout(timer);
  }, [status]);

  if (!status || !visible) return null;

  return (
    <div className="card status-card">
      <strong>Status:</strong> {status.replace(/_/g, ' ')}
    </div>
  );
}
