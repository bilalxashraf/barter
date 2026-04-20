"use client";

import {
  startTransition,
  useDeferredValue,
  useEffect,
  useState,
} from "react";
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

const statusCopy: Record<
  LiveFeedStatus,
  { label: string; classes: string }
> = {
  live: {
    label: "Live",
    classes: "border-emerald-400/25 bg-emerald-400/10 text-emerald-200",
  },
  stale: {
    label: "Holding last signal",
    classes: "border-amber-300/30 bg-amber-300/10 text-amber-200",
  },
  fallback: {
    label: "Demo mode",
    classes: "border-sky-300/30 bg-sky-300/10 text-sky-200",
  },
};

const categoryStyles: Record<string, string> = {
  compute: "border-fuchsia-300/20 bg-fuchsia-300/8 text-fuchsia-200",
  data_feed: "border-cyan-300/20 bg-cyan-300/8 text-cyan-200",
  dev_tools: "border-violet-300/20 bg-violet-300/8 text-violet-200",
  market_data: "border-cyan-300/20 bg-cyan-300/8 text-cyan-200",
  research: "border-amber-300/20 bg-amber-300/8 text-amber-200",
  security: "border-rose-300/20 bg-rose-300/8 text-rose-200",
};

function formatRelativeTime(value: string, nowMs: number) {
  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) return "just now";

  const deltaSeconds = Math.round((timestamp - nowMs) / 1000);
  const abs = Math.abs(deltaSeconds);

  if (abs < 60) return "just now";
  if (abs < 3600) return relativeTimeFormatter.format(Math.round(deltaSeconds / 60), "minute");
  if (abs < 86_400) return relativeTimeFormatter.format(Math.round(deltaSeconds / 3600), "hour");
  return relativeTimeFormatter.format(Math.round(deltaSeconds / 86_400), "day");
}

function formatCadence(value: number) {
  if (value < 1000) return `${value}ms`;
  if (value % 1000 === 0) return `${value / 1000}s`;
  return `${(value / 1000).toFixed(1)}s`;
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

  const freshnessChip =
    transportState === "live"
      ? "border-white/12 bg-white/8 text-white/80"
      : "border-amber-300/25 bg-amber-300/10 text-amber-100";

  return (
    <section className="relative py-16 sm:py-20">
      <div className="grid gap-10 xl:grid-cols-[minmax(0,0.95fr)_minmax(360px,0.9fr)] xl:items-start">
        {/* Left: Hero copy */}
        <div className="space-y-8">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/15 bg-emerald-400/[0.06] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-200/80">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-50" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
              </span>
              Live agent commerce
            </div>

            <h1 className="max-w-3xl font-[var(--font-display)] text-[clamp(2.8rem,5.5vw,4.5rem)] font-black leading-[0.93] tracking-[-0.05em] text-white">
              Real agents.
              <br />
              <span className="text-white/25">Real dollars.</span>
              <br />
              <span className="bg-gradient-to-r from-white via-white to-white/60 bg-clip-text text-transparent">
                Happening right now.
              </span>
            </h1>

            <p className="max-w-xl text-[15px] leading-8 text-white/45">
              Barter is building the infrastructure layer for AI payments. The live stream below
              is proof of demand — agents are already buying tools, data, and compute. We&apos;re
              building the native rails to make it seamless.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              onClick={onJoinWaitlist}
              className="group relative inline-flex items-center justify-center overflow-hidden rounded-full bg-white px-6 py-3 text-sm font-semibold text-black transition-all hover:shadow-[0_0_24px_rgba(255,255,255,0.12)]"
            >
              Join waitlist
            </button>
            <a
              href="https://wtfareagentsbuying.com"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center rounded-full border border-white/8 bg-white/[0.02] px-6 py-3 text-sm font-semibold text-white/70 transition-all hover:border-white/15 hover:bg-white/[0.04] hover:text-white/90"
            >
              Reference stream
              <svg className="ml-2 h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M7 17L17 7M17 7H7M17 7v10" />
              </svg>
            </a>
          </div>

          {/* Stats row */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-[22px] border border-amber-400/10 bg-amber-400/[0.03] p-5 transition-all duration-300 hover:border-amber-400/20">
              <div className="mb-2 text-[10px] uppercase tracking-[0.2em] text-amber-200/40">transactions 24h</div>
              <div className="text-3xl font-black tracking-tight text-white">
                {numberFormatter.format(snapshot.stats.totalItems24h)}
              </div>
            </div>
            <div className="rounded-[22px] border border-white/[0.06] bg-white/[0.015] p-5 transition-all duration-300 hover:border-white/[0.1]">
              <div className="mb-2 text-[10px] uppercase tracking-[0.2em] text-white/30">watching now</div>
              <div className="text-3xl font-black tracking-tight text-white">
                {viewerCount ? numberFormatter.format(viewerCount) : "—"}
              </div>
            </div>
            <div className="rounded-[22px] border border-white/[0.06] bg-white/[0.015] p-5 transition-all duration-300 hover:border-white/[0.1]">
              <div className="mb-2 text-[10px] uppercase tracking-[0.2em] text-white/30">categories</div>
              <div className="text-3xl font-black tracking-tight text-white">
                {numberFormatter.format(snapshot.stats.categories)}
              </div>
            </div>
            <div className="rounded-[22px] border border-white/[0.06] bg-white/[0.015] p-5 transition-all duration-300 hover:border-white/[0.1]">
              <div className="mb-2 text-[10px] uppercase tracking-[0.2em] text-white/30">refresh cadence</div>
              <div className="text-3xl font-black tracking-tight text-white">
                {formatCadence(snapshot.stats.refreshCadenceMs)}
              </div>
            </div>
          </div>

          {/* Architecture cards */}
          <div className="grid gap-3 md:grid-cols-3">
            {[
              {
                label: "ingest layer",
                text: "Provider-backed source adapters normalize every upstream record into one stable Barter feed contract.",
              },
              {
                label: "delivery",
                text: "Same-origin SSE keeps the live wall updating without a separate websocket stack or polling loop.",
              },
              {
                label: "swap-ready",
                text: "When Barter owns native settlement events, the adapter changes. The page and the stream protocol do not.",
              },
            ].map((card) => (
              <div
                key={card.label}
                className="group rounded-[20px] border border-white/[0.06] bg-white/[0.015] p-5 transition-all duration-300 hover:border-white/[0.1] hover:bg-white/[0.025]"
              >
                <div className="mb-3 text-[10px] font-bold uppercase tracking-[0.2em] text-white/30 transition-colors duration-300 group-hover:text-white/45">
                  {card.label}
                </div>
                <p className="text-[13px] leading-7 text-white/45">{card.text}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Live feed stream */}
        <div className="relative overflow-hidden rounded-[28px] border border-white/[0.07] bg-white/[0.02] shadow-[0_40px_100px_rgba(0,0,0,0.4)]">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent" />

          {/* Stream header */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.06] px-5 py-4 sm:px-6">
            <div>
              <div className="text-[10px] uppercase tracking-[0.2em] text-white/30">now streaming</div>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-medium ${statusCopy[snapshot.status].classes}`}
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-current" />
                  {statusCopy[snapshot.status].label}
                </span>
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-medium ${freshnessChip}`}
                >
                  {transportState === "live" ? "SSE connected" : "Reconnecting"}
                </span>
              </div>
            </div>
            <div className="text-right text-[11px] text-white/35">
              <div>{snapshot.stats.providerLabel}</div>
              <div className="mt-1">
                Synced {formatRelativeTime(snapshot.fetchedAt, nowMs)}
              </div>
            </div>
          </div>

          {/* Stream items */}
          <div className="max-h-[780px] space-y-2.5 overflow-y-auto px-4 py-4 sm:px-5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-white/10 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar]:w-1.5">
            {deferredItems.map((item) => {
              const isFresh = freshIds.includes(item.id);
              const categoryTone =
                categoryStyles[item.category] ||
                "border-white/8 bg-white/[0.04] text-white/70";

              return (
                <article
                  key={item.id}
                  className={`rounded-[22px] border p-5 transition-all duration-500 ${
                    isFresh
                      ? "border-amber-300/25 bg-amber-300/[0.05] shadow-[0_0_0_1px_rgba(252,211,77,0.12),0_16px_40px_rgba(252,211,77,0.08)]"
                      : "border-white/[0.06] bg-[#080b12] hover:border-white/[0.1]"
                  }`}
                >
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span
                        className={`inline-flex rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] ${categoryTone}`}
                      >
                        {item.categoryLabel}
                      </span>
                      {item.metadata.networkLabel ? (
                        <span className="inline-flex rounded-full border border-white/8 px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-[0.14em] text-white/50">
                          {item.metadata.networkLabel}
                        </span>
                      ) : null}
                    </div>
                    <div className="text-[10px] uppercase tracking-[0.16em] text-white/30">
                      {formatRelativeTime(item.displayedAt, nowMs)}
                    </div>
                  </div>

                  <div className="mb-3 flex items-start justify-between gap-4">
                    <div className="min-w-0 space-y-1.5">
                      <h2 className="font-[var(--font-display)] text-[17px] font-semibold leading-snug text-white">
                        {item.itemName}
                      </h2>
                      <p className="max-w-[48ch] text-[12px] leading-6 text-white/45">
                        {item.commentary}
                      </p>
                    </div>
                    <div className="shrink-0 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3.5 py-2.5 text-right">
                      <div className="text-[9px] uppercase tracking-[0.16em] text-white/28">price</div>
                      <div className="mt-1 text-base font-semibold tracking-tight text-white">{item.money.formatted}</div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1.5 text-[10px] text-white/40">
                    <span className="rounded-full border border-white/[0.06] px-2.5 py-0.5">
                      agent {item.agentMaskedId}
                    </span>
                    <span className="rounded-full border border-white/[0.06] px-2.5 py-0.5">
                      {item.sourceLabel}
                    </span>
                    {item.metadata.facilitatorName ? (
                      <span className="rounded-full border border-white/[0.06] px-2.5 py-0.5">
                        {item.metadata.facilitatorName}
                      </span>
                    ) : null}
                    {item.metadata.serviceHost ? (
                      <span className="rounded-full border border-white/[0.06] px-2.5 py-0.5">
                        {item.metadata.serviceHost}
                      </span>
                    ) : null}
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
