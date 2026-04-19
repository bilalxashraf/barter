"use client";

import { useCallback } from 'react';
import { usePathname } from 'next/navigation';

export default function BackButton() {
  const pathname = usePathname();

  const handleBack = useCallback(() => {
    if (typeof window === 'undefined') return;
    if (pathname === '/') return;

    const currentUrl = new URL(window.location.href);
    const referrer = document.referrer;

    if (referrer) {
      try {
        const refUrl = new URL(referrer);
        if (refUrl.origin === currentUrl.origin && refUrl.pathname !== currentUrl.pathname) {
          window.location.href = referrer;
          return;
        }
      } catch {
        // ignore invalid referrer
      }
    }

    if (window.history.length > 1) {
      window.history.back();
    } else {
      window.location.href = '/';
    }
  }, [pathname]);

  if (pathname === '/') return null;

  return (
    <button type="button" className="back-button" onClick={handleBack} aria-label="Go back">
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M15.5 19.5a1 1 0 0 1-.71-.29l-6.5-6.5a1 1 0 0 1 0-1.42l6.5-6.5a1 1 0 1 1 1.42 1.42L10.41 12l5.8 5.79a1 1 0 0 1-.71 1.71Z" />
      </svg>
      <span>Back</span>
    </button>
  );
}
