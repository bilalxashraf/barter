"use client";

import { useEffect, useState } from "react";
import type { XPostsPayload } from "../_lib/xMentions";

const compactNumberFormatter = new Intl.NumberFormat("en-US", {
  notation: "compact",
  maximumFractionDigits: 1,
});
const POSTS_REFRESH_INTERVAL_MS = 60000;

function formatTimestamp(value: string | null) {
  if (!value) return "Recent";

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}

function PostMetric({
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

export default function XPostsFeed() {
  const [payload, setPayload] = useState<XPostsPayload | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function loadPosts() {
      try {
        const response = await fetch("/api/x/posts", {
          cache: "no-store",
          credentials: "same-origin",
        });

        if (!response.ok) return;

        const data = (await response.json()) as XPostsPayload;

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

    void loadPosts();

    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        void loadPosts();
      }
    }, POSTS_REFRESH_INTERVAL_MS);

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void loadPosts();
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
      <div className="rounded-[24px] border border-white/[0.07] bg-white/[0.02] p-5">
        <div className="text-[11px] uppercase tracking-[0.22em] text-white/35 mb-4">Latest posts</div>
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="rounded-[18px] border border-white/[0.06] bg-black/30 p-4 animate-pulse"
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

  if (!payload || payload.posts.length === 0) {
    return (
      <div className="rounded-[24px] border border-white/[0.07] bg-white/[0.02] p-5">
        <div>
          <div className="text-[11px] uppercase tracking-[0.22em] text-white/35 mb-3">Latest posts</div>
          <h3 className="text-[28px] leading-tight font-semibold text-white mb-3 max-w-[12ch]">
            Follow @{payload?.username ?? "barterpayments"} on X
          </h3>
          <p className="text-sm text-white/35 leading-7 max-w-[42ch]">
            Open the profile to see the latest public updates, product notes, and rollout progress from the Barter account.
          </p>
        </div>
        <a
          href={payload?.profileUrl ?? "https://x.com/barterpayments"}
          target="_blank"
          rel="noreferrer"
          className="mt-5 inline-flex items-center text-sm text-white/60 hover:text-white transition-colors"
        >
          Open @barterpayments →
        </a>
      </div>
    );
  }

  return (
    <div className="rounded-[24px] border border-white/[0.07] bg-white/[0.02] p-5">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <div className="text-[11px] uppercase tracking-[0.22em] text-white/35 mb-2">Latest posts</div>
          <h3 className="text-base font-semibold text-white">
            Recent updates from @{payload.username}
          </h3>
        </div>
        <a
          href={payload.profileUrl}
          target="_blank"
          rel="noreferrer"
          className="text-xs text-white/40 hover:text-white transition-colors whitespace-nowrap uppercase tracking-[0.16em]"
        >
          Open profile →
        </a>
      </div>

      <div className="space-y-3">
        {payload.posts.map((post) => (
          <a
            key={post.id}
            href={post.url}
            target="_blank"
            rel="noreferrer"
            className="block rounded-[18px] border border-white/[0.06] bg-black/30 p-4 hover:border-white/15 transition-all"
          >
            <div className="flex items-center justify-between gap-3 mb-3">
              <div className="flex items-center gap-3 min-w-0">
                {post.author.avatarUrl ? (
                  <img
                    src={post.author.avatarUrl}
                    alt={post.author.name}
                    className="h-8 w-8 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-[11px] font-semibold text-white/60">
                    {post.author.name.slice(0, 1).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0">
                  <div className="truncate text-[13px] font-medium text-white">
                    {post.author.name}
                  </div>
                  <div className="truncate text-[11px] text-white/35">
                    @{post.author.username}
                  </div>
                </div>
              </div>
              <div className="text-[11px] text-white/30 shrink-0">
                {formatTimestamp(post.createdAt)}
              </div>
            </div>

            <p className="text-[13px] leading-6 text-white/72 whitespace-pre-line line-clamp-4">
              {post.text}
            </p>

            <div className="mt-3 flex flex-wrap gap-3">
              <PostMetric label="likes" value={post.metrics.likes} />
              <PostMetric label="replies" value={post.metrics.replies} />
              <PostMetric label="reposts" value={post.metrics.reposts} />
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}
