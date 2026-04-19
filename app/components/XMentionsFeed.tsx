"use client";

import { useEffect, useState } from "react";
import type { XMentionsPayload } from "../_lib/xMentions";

const compactNumberFormatter = new Intl.NumberFormat("en-US", {
  notation: "compact",
  maximumFractionDigits: 1,
});
const MENTIONS_REFRESH_INTERVAL_MS = 60000;

function formatTimestamp(value: string | null) {
  if (!value) return "Recent";

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}

function MentionMetric({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <span className="inline-flex items-center gap-1 text-[11px] text-white/30">
      <span>{compactNumberFormatter.format(value)}</span>
      <span>{label}</span>
    </span>
  );
}

export default function XMentionsFeed() {
  const [payload, setPayload] = useState<XMentionsPayload | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function loadMentions() {
      try {
        const response = await fetch("/api/x/mentions", {
          cache: "no-store",
          credentials: "same-origin",
        });

        if (!response.ok) return;

        const data = (await response.json()) as XMentionsPayload;

        if (active) {
          setPayload(data);
        }
      } catch {
        // no-op
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadMentions();

    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        void loadMentions();
      }
    }, MENTIONS_REFRESH_INTERVAL_MS);

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void loadMentions();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      active = false;
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  if (loading) {
    return (
      <div className="rounded-[28px] border border-white/[0.07] bg-white/[0.02] p-6">
        <div className="text-xs uppercase tracking-[0.18em] text-white/40 mb-4">Mentions</div>
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div
              key={index}
              className="rounded-2xl border border-white/[0.06] bg-black/30 p-4 animate-pulse"
            >
              <div className="h-3 w-24 rounded bg-white/10 mb-3" />
              <div className="h-3 w-full rounded bg-white/10 mb-2" />
              <div className="h-3 w-4/5 rounded bg-white/10" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!payload || payload.mentions.length === 0) {
    return (
      <div className="rounded-[28px] border border-white/[0.07] bg-white/[0.02] p-6 flex h-full flex-col justify-between">
        <div>
          <div className="text-xs uppercase tracking-[0.18em] text-white/40 mb-3">Mentions</div>
          <h3 className="text-lg font-semibold text-white mb-3">
            See public posts that mention @{payload?.username ?? "barterpayments"}
          </h3>
          <p className="text-sm text-white/35 leading-relaxed">
            Open X live search to browse replies, shout-outs, and public discussion that references the account in real time.
          </p>
        </div>
        <a
          href={payload?.searchUrl ?? "https://x.com/search?q=%40barterpayments&src=typed_query&f=live"}
          target="_blank"
          rel="noreferrer"
          className="mt-6 inline-flex items-center justify-center rounded-2xl border border-white/10 px-5 py-3 text-sm text-white/70 hover:border-white/20 hover:text-white transition-all"
        >
          Browse mentions on X →
        </a>
      </div>
    );
  }

  return (
    <div className="rounded-[28px] border border-white/[0.07] bg-white/[0.02] p-6">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <div className="text-xs uppercase tracking-[0.18em] text-white/40 mb-2">Mentions</div>
          <h3 className="text-lg font-semibold text-white">
            Recent public mentions
          </h3>
        </div>
        <a
          href={payload.searchUrl}
          target="_blank"
          rel="noreferrer"
          className="text-xs text-white/45 hover:text-white transition-colors"
        >
          Open live search →
        </a>
      </div>

      <div className="space-y-3">
        {payload.mentions.map((mention) => (
          <a
            key={mention.id}
            href={mention.url}
            target="_blank"
            rel="noreferrer"
            className="block rounded-2xl border border-white/[0.06] bg-black/30 p-4 hover:border-white/15 transition-all"
          >
            <div className="flex items-center justify-between gap-3 mb-3">
              <div className="flex items-center gap-3 min-w-0">
                {mention.author.avatarUrl ? (
                  <img
                    src={mention.author.avatarUrl}
                    alt={mention.author.name}
                    className="h-9 w-9 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-xs font-semibold text-white/60">
                    {mention.author.name.slice(0, 1).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium text-white">
                    {mention.author.name}
                  </div>
                  <div className="truncate text-xs text-white/35">
                    @{mention.author.username}
                  </div>
                </div>
              </div>
              <div className="text-[11px] text-white/30 shrink-0">
                {formatTimestamp(mention.createdAt)}
              </div>
            </div>

            <p className="text-sm leading-relaxed text-white/75 whitespace-pre-line line-clamp-4">
              {mention.text}
            </p>

            <div className="mt-3 flex flex-wrap gap-3">
              <MentionMetric label="likes" value={mention.metrics.likes} />
              <MentionMetric label="replies" value={mention.metrics.replies} />
              <MentionMetric label="reposts" value={mention.metrics.reposts} />
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}
