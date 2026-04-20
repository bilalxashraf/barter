"use client";

import { startTransition, useDeferredValue, useEffect, useState } from "react";
import type {
  LiveFeedAppendEvent,
  LiveFeedItem,
  LiveFeedPulseEvent,
  LiveFeedSnapshot,
  LiveFeedSnapshotEvent,
  LiveFeedStatus,
  LiveFeedStreamEvent,
} from "@/modules/live-feed/contracts";

const numberFormatter = new Intl.NumberFormat("en-US");
const relativeTimeFormatter = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

const statusCopy: Record<LiveFeedStatus, { label: string; dot: string }> = {
  live: { label: "Live", dot: "bg-white" },
  stale: { label: "Idle", dot: "bg-white/55" },
  fallback: { label: "Demo", dot: "bg-white/35" },
};

function formatRelativeTime(value: string, nowMs: number) {
  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) return "just now";

  const deltaSeconds = Math.round((timestamp - nowMs) / 1000);
  const abs = Math.abs(deltaSeconds);

  if (abs < 60) return "just now";
  if (abs < 3_600) return relativeTimeFormatter.format(Math.round(deltaSeconds / 60), "minute");
  if (abs < 86_400) return relativeTimeFormatter.format(Math.round(deltaSeconds / 3_600), "hour");
  return relativeTimeFormatter.format(Math.round(deltaSeconds / 86_400), "day");
}

function compactHash(value: string | null) {
  if (!value) return "Unavailable";
  if (value.length <= 14) return value;
  return `${value.slice(0, 6)}…${value.slice(-4)}`;
}

function compactHost(value: string | null) {
  if (!value) return "Unknown service";
  return value.replace(/^www\./, "");
}

function mergeItems(currentItems: LiveFeedItem[], incomingItems: LiveFeedItem[], limit: number) {
  const ordered = [...incomingItems, ...currentItems];
  const deduped = new Map<string, LiveFeedItem>();

  for (const item of ordered) {
    if (!deduped.has(item.id)) {
      deduped.set(item.id, item);
    }
  }

  return Array.from(deduped.values()).slice(0, limit);
}

function parseEvent<T extends LiveFeedStreamEvent>(event: MessageEvent<string>) {
  try {
    return JSON.parse(event.data) as T;
  } catch {
    return null;
  }
}

export function LiveFeedSection({
  initialSnapshot,
  onJoinWaitlist,
}: {
  initialSnapshot: LiveFeedSnapshot;
  onJoinWaitlist: () => void;
}) {
  const [snapshot, setSnapshot] = useState(initialSnapshot);
  const [viewerCount, setViewerCount] = useState(0);
  const [transportState, setTransportState] = useState<"connecting" | "live" | "reconnecting">(
    "connecting"
  );
  const [freshIds, setFreshIds] = useState<string[]>([]);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const deferredItems = useDeferredValue(snapshot.items);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setNowMs(Date.now());
    }, 30_000);

    return () => {
      window.clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    const stream = new EventSource("/api/live-feed/stream");

    const handleSnapshot = (event: Event) => {
      const payload = parseEvent<LiveFeedSnapshotEvent>(event as MessageEvent<string>);
      if (payload?.type === "snapshot") {
        startTransition(() => {
          setSnapshot(payload.snapshot);
          setViewerCount(payload.viewerCount);
          setTransportState("live");
        });
      }
    };

    const handleAppend = (event: Event) => {
      const payload = parseEvent<LiveFeedAppendEvent>(event as MessageEvent<string>);
      if (payload?.type === "append") {
        const ids = payload.items.map((item) => item.id);

        startTransition(() => {
          setSnapshot((current) => ({
            items: mergeItems(current.items, payload.items, current.stats.visibleItems),
            stats: payload.stats,
            status: payload.status,
            fetchedAt: payload.fetchedAt,
          }));
          setViewerCount(payload.viewerCount);
          setTransportState("live");
          setFreshIds((current) => Array.from(new Set([...ids, ...current])).slice(0, 12));
        });

        window.setTimeout(() => {
          setFreshIds((current) => current.filter((id) => !ids.includes(id)));
        }, 4_500);
      }
    };

    const handlePulse = (event: Event) => {
      const payload = parseEvent<LiveFeedPulseEvent>(event as MessageEvent<string>);
      if (payload?.type === "pulse") {
        startTransition(() => {
          setSnapshot((current) => ({
            ...current,
            stats: payload.stats,
            status: payload.status,
            fetchedAt: payload.fetchedAt,
          }));
          setViewerCount(payload.viewerCount);
          setTransportState("live");
        });
      }
    };

    const handlePresence = (event: Event) => {
      const payload = parseEvent<{ type: "presence"; viewerCount: number }>(
        event as MessageEvent<string>
      );
      if (payload?.type === "presence") {
        setViewerCount(payload.viewerCount);
      }
    };

    stream.onopen = () => {
      setTransportState("live");
    };

    stream.onerror = () => {
      setTransportState("reconnecting");
    };

    stream.addEventListener("snapshot", handleSnapshot);
    stream.addEventListener("append", handleAppend);
    stream.addEventListener("pulse", handlePulse);
    stream.addEventListener("presence", handlePresence);

    return () => {
      stream.removeEventListener("snapshot", handleSnapshot);
      stream.removeEventListener("append", handleAppend);
      stream.removeEventListener("pulse", handlePulse);
      stream.removeEventListener("presence", handlePresence);
      stream.close();
    };
  }, []);

  const statusInfo = statusCopy[snapshot.status];
  const leadItem = deferredItems[0];
  const trailItems = deferredItems.slice(1);
  const leadIsFresh = leadItem ? freshIds.includes(leadItem.id) : false;

  if (!leadItem) {
    return (
      <div className="flex h-full items-center justify-center rounded-[34px] border border-white/[0.08] bg-white/[0.03] p-10 text-white/48">
        Waiting for live purchases…
      </div>
    );
  }

  return (
    <section className="flex h-full flex-col overflow-hidden rounded-[34px] border border-white/[0.08] bg-[radial-gradient(circle_at_top_right,_rgba(255,255,255,0.06),_transparent_35%),linear-gradient(180deg,_rgba(255,255,255,0.04),_rgba(255,255,255,0.02))]">
      <div className="flex items-center justify-between border-b border-white/[0.08] px-6 py-4">
        <div className="flex items-center gap-3">
          <span
            className={`h-2.5 w-2.5 rounded-full ${statusInfo.dot} ${
              snapshot.status === "live" ? "animate-pulse" : ""
            }`}
          />
          <div>
            <div className="text-[11px] uppercase tracking-[0.22em] text-white/50">
              {statusInfo.label} tape
            </div>
            <div className="mt-1 text-sm text-white/72">The latest purchase, updated in real time.</div>
          </div>
        </div>

        <div className="text-right">
          <div className="text-[11px] uppercase tracking-[0.18em] text-white/48">
            {transportState === "live" ? "Connected" : "Reconnecting"}
          </div>
          <div className="mt-1 text-sm text-white/72">
            {numberFormatter.format(viewerCount)} watching now
          </div>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-4 p-5">
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-[20px] border border-white/[0.08] bg-white/[0.04] px-4 py-3">
            <div className="text-[11px] uppercase tracking-[0.18em] text-white/48">Transactions</div>
            <div className="mt-1.5 text-xl font-black text-white">
              {numberFormatter.format(snapshot.stats.totalItems24h)}
            </div>
            <div className="mt-1 text-xs text-white/42">Last 24h</div>
          </div>
          <div className="rounded-[20px] border border-white/[0.08] bg-white/[0.04] px-4 py-3">
            <div className="text-[11px] uppercase tracking-[0.18em] text-white/48">Categories</div>
            <div className="mt-1.5 text-xl font-black text-white">
              {numberFormatter.format(snapshot.stats.categories)}
            </div>
            <div className="mt-1 text-xs text-white/42">Distinct buckets</div>
          </div>
          <div className="rounded-[20px] border border-white/[0.08] bg-white/[0.04] px-4 py-3">
            <div className="text-[11px] uppercase tracking-[0.18em] text-white/48">Viewers</div>
            <div className="mt-1.5 text-xl font-black text-white">
              {numberFormatter.format(viewerCount)}
            </div>
            <div className="mt-1 text-xs text-white/42">Watching now</div>
          </div>
        </div>

        <div
          className={`rounded-[24px] border p-5 transition-all duration-300 ${
            leadIsFresh
              ? "border-white/20 bg-white/[0.08]"
              : "border-white/[0.08] bg-white/[0.04]"
          }`}
        >
          <div className="flex gap-6">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-3">
                <div className="text-[11px] uppercase tracking-[0.2em] text-white/50">
                  Latest purchase
                </div>
                <span className="text-white/40">•</span>
                <span className="text-sm text-white/62">agent-{leadItem.agentMaskedId}</span>
                <span className="text-sm text-white/62">{formatRelativeTime(leadItem.displayedAt, nowMs)}</span>
              </div>

              <h2 className="mt-3 font-[var(--font-display)] text-xl font-black leading-tight tracking-[-0.03em] text-white">
                {leadItem.itemName}
              </h2>

              <p className="mt-2 text-sm leading-6 text-white/54">
                {leadItem.commentary || "A new x402 payment just landed on the tape."}
              </p>

              <div className="mt-3 flex flex-wrap gap-2">
                <span className="rounded-full border border-white/10 px-3 py-1 text-[10px] uppercase tracking-[0.16em] text-white/56">
                  {leadItem.categoryLabel}
                </span>
                {leadItem.metadata.networkLabel ? (
                  <span className="rounded-full border border-white/10 px-3 py-1 text-[10px] uppercase tracking-[0.16em] text-white/56">
                    {leadItem.metadata.networkLabel}
                  </span>
                ) : null}
                <span className="rounded-full border border-white/10 px-3 py-1 text-[10px] uppercase tracking-[0.16em] text-white/56">
                  {leadItem.sourceLabel}
                </span>
              </div>
            </div>

            <div className="hidden shrink-0 sm:flex sm:flex-col sm:gap-2">
              <div className="rounded-[16px] border border-white/[0.08] bg-[#0c0c0d] px-4 py-3 text-right">
                <div className="text-[10px] uppercase tracking-[0.18em] text-white/48">Amount paid</div>
                <div className="mt-1 text-lg font-black tracking-tight text-white">
                  {leadItem.money.formatted}
                </div>
              </div>
              <div className="rounded-[16px] border border-white/[0.08] bg-[#0c0c0d] px-4 py-2.5">
                <div className="text-[10px] uppercase tracking-[0.18em] text-white/48">Service</div>
                <div className="mt-1 text-xs text-white/74">{compactHost(leadItem.metadata.serviceHost)}</div>
              </div>
              <div className="rounded-[16px] border border-white/[0.08] bg-[#0c0c0d] px-4 py-2.5">
                <div className="text-[10px] uppercase tracking-[0.18em] text-white/48">Provider</div>
                <div className="mt-1 text-xs text-white/74">{snapshot.stats.providerLabel}</div>
              </div>
            </div>
          </div>

          <div className="mt-4 flex items-center gap-3">
            <button
              onClick={onJoinWaitlist}
              className="rounded-full bg-white px-4 py-2 text-[13px] font-semibold text-black transition-all hover:bg-white/92"
            >
              Get early access
            </button>
            {leadItem.metadata.serviceUrl ? (
              <a
                href={leadItem.metadata.serviceUrl}
                target="_blank"
                rel="noreferrer"
                className="rounded-full border border-white/12 bg-white/[0.03] px-4 py-2 text-[13px] font-medium text-white/76 transition-all hover:border-white/18 hover:bg-white/[0.05]"
              >
                Open service ↗
              </a>
            ) : null}
          </div>
        </div>

        <div className="min-h-0 flex-1 rounded-[24px] border border-white/[0.08] bg-white/[0.03]">
          <div className="flex items-center justify-between border-b border-white/[0.08] px-5 py-3">
            <div className="text-[11px] uppercase tracking-[0.18em] text-white/48">
              Recent purchases
            </div>
            <div className="text-[11px] uppercase tracking-[0.18em] text-white/45">
              Synced {formatRelativeTime(snapshot.fetchedAt, nowMs)}
            </div>
          </div>

          <div className="overflow-x-auto p-3 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-white/8 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar]:h-1.5">
            <div className="flex min-w-max gap-3 pr-3">
              {trailItems.map((item) => {
                const isFresh = freshIds.includes(item.id);

                return (
                  <article
                    key={item.id}
                    className={`w-[280px] shrink-0 rounded-[20px] border p-4 transition-all ${
                      isFresh
                        ? "border-white/18 bg-white/[0.07]"
                        : "border-white/[0.08] bg-[#0c0c0d]"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 text-[11px] text-white/50">
                        <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-[10px] font-semibold uppercase text-white/58">
                          {item.agentMaskedId.slice(0, 2)}
                        </div>
                        <span className="font-medium text-white/64">agent-{item.agentMaskedId}</span>
                      </div>
                      <span className="text-sm font-semibold text-white/72">
                        {item.money.formatted}
                      </span>
                    </div>

                    <h3 className="mt-2.5 truncate text-sm font-semibold text-white/88">
                      {item.itemName}
                    </h3>
                    <p className="mt-1 line-clamp-2 text-xs leading-5 text-white/44">
                      {item.commentary || "New x402 transaction recorded."}
                    </p>

                    <div className="mt-2.5 flex flex-wrap gap-1.5">
                      <span className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] uppercase tracking-[0.14em] text-white/48">
                        {item.categoryLabel}
                      </span>
                      {item.metadata.networkLabel ? (
                        <span className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] uppercase tracking-[0.14em] text-white/48">
                          {item.metadata.networkLabel}
                        </span>
                      ) : null}
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
