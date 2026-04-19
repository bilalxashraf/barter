"use client";

import { useEffect, useRef } from "react";

declare global {
  interface Window {
    twttr?: {
      widgets?: {
        load?: (element?: HTMLElement | null) => void;
      };
    };
  }
}

const X_WIDGET_SCRIPT_ID = "x-widgets-script";
const X_TIMELINE_URL = "https://x.com/barterpayments";

export default function XTimelineEmbed() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadWidgets = () => {
      window.twttr?.widgets?.load?.(containerRef.current);
    };

    const existingScript = document.getElementById(X_WIDGET_SCRIPT_ID) as HTMLScriptElement | null;
    const script = existingScript ?? document.createElement("script");

    if (!existingScript) {
      script.id = X_WIDGET_SCRIPT_ID;
      script.async = true;
      script.src = "https://platform.twitter.com/widgets.js";
      document.body.appendChild(script);
    }

    script.addEventListener("load", loadWidgets);
    loadWidgets();

    return () => {
      script.removeEventListener("load", loadWidgets);
    };
  }, []);

  return (
    <div ref={containerRef} className="space-y-3">
      <a
        className="twitter-timeline"
        data-chrome="noheader nofooter noborders transparent"
        data-dnt="true"
        data-height="560"
        data-theme="dark"
        data-tweet-limit="5"
        href={X_TIMELINE_URL}
      >
        Posts by @barterpayments
      </a>
      <p className="text-xs text-white/25">
        If the embed is blocked by your browser, open{" "}
        <a
          href={X_TIMELINE_URL}
          target="_blank"
          rel="noreferrer"
          className="text-white/50 hover:text-white transition-colors"
        >
          @barterpayments
        </a>
        .
      </p>
    </div>
  );
}
