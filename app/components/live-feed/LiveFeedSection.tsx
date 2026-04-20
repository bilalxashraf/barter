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
    classes: "border-emerald-400/25 bg-emerald-400/10 text-emerald-100",
  },
  stale: {
    label: "Holding last signal",
    classes: "border-amber-300/30 bg-amber-300/10 text-amber-100",
  },
  fallback: {
    label: "Demo mode",
    classes: "border-sky-300/30 bg-sky-300/10 text-sky-100",
  },
};

const categoryStyles: Record<string, string> = {
  compute: "border-fuchsia-300/20 bg-fuchsia-300/10 text-fuchsia-100",
  data_feed: "border-cyan-300/20 bg-cyan-300/10 text-cyan-100",
  dev_tools: "border-violet-300/20 bg-violet-300/10 text-violet-100",
  market_data: "border-cyan-300/20 bg-cyan-300/10 text-cyan-100",
  research: "border-amber-300/20 bg-amber-300/10 text-amber-100",
  security: "border-rose-300/20 bg-rose-300/10 text-rose-100",
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
      ? "border-white/15 bg-white/10 text-white/85"
      : "border-amber-300/25 bg-amber-300/10 text-amber-50";

  return (
    <section className="relative overflow-hidden py-16 sm:py-20">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,_rgba(245,158,11,0.18),_transparent_28%),radial-gradient(circle_at_85%_15%,_rgba(56,189,248,0.16),_transparent_26%),linear-gradient(180deg,_rgba(7,10,17,0.92),_rgba(6,8,13,1))]" />

      <div className="grid gap-8 xl:grid-cols-[minmax(0,0.95fr)_minmax(360px,0.9fr)] xl:items-start">
        <div className="space-y-7">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-xs font-medium uppercase tracking-[0.22em] text-white/65">
            <span className="h-2 w-2 rounded-full bg-emerald-300" />
            Live agent commerce
          </div>

          <div className="space-y-5">
            <h1 className="max-w-4xl font-[var(--font-display)] text-5xl font-black leading-[0.95] tracking-[-0.05em] text-white sm:text-6xl lg:text-7xl">
              Real agents.
              <br />
              <span className="text-white/35">Real dollars.</span>
              <br />
              Happening right now.
            </h1>

            <p className="max-w-2xl text-base leading-8 text-white/62 sm:text-lg">
              Barter keeps the waitlist, onboarding, X-linked identity, and live product counters you
              already had, then layers on a typed feed of agents buying tools, data, and compute in
              the open.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              onClick={onJoinWaitlist}
              className="inline-flex items-center justify-center rounded-full bg-white px-6 py-3 text-sm font-semibold text-black transition-all hover:bg-white/90"
            >
              Join waitlist
            </button>
            <a
              href="https://wtfareagentsbuying.com"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center rounded-full border border-white/10 bg-white/[0.03] px-6 py-3 text-sm font-semibold text-white/85 transition-all hover:border-white/20 hover:bg-white/[0.06]"
            >
              Reference stream ↗
            </a>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-5">
              <div className="mb-2 text-xs uppercase tracking-[0.18em] text-white/38">watching now</div>
              <div className="text-3xl font-black text-white">
                {viewerCount ? numberFormatter.format(viewerCount) : "—"}
              </div>
            </div>
            <div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-5">
              <div className="mb-2 text-xs uppercase tracking-[0.18em] text-white/38">categories</div>
              <div className="text-3xl font-black text-white">
                {numberFormatter.format(snapshot.stats.categories)}
              </div>
            </div>
            <div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-5">
              <div className="mb-2 text-xs uppercase tracking-[0.18em] text-white/38">refresh cadence</div>
              <div className="text-3xl font-black text-white">
                {formatCadence(snapshot.stats.refreshCadenceMs)}
              </div>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-[26px] border border-white/10 bg-white/[0.03] p-5">
              <div className="mb-3 text-xs uppercase tracking-[0.18em] text-white/38">ingest layer</div>
              <p className="text-sm leading-7 text-white/62">
                Provider-backed source adapters normalize every upstream record into one stable Barter
                feed contract.
              </p>
            </div>
            <div className="rounded-[26px] border border-white/10 bg-white/[0.03] p-5">
              <div className="mb-3 text-xs uppercase tracking-[0.18em] text-white/38">delivery</div>
              <p className="text-sm leading-7 text-white/62">
                The browser stays on same-origin SSE, so the live wall updates without a separate
                websocket stack or client polling loop.
              </p>
            </div>
            <div className="rounded-[26px] border border-white/10 bg-white/[0.03] p-5">
              <div className="mb-3 text-xs uppercase tracking-[0.18em] text-white/38">swap-ready</div>
              <p className="text-sm leading-7 text-white/62">
                When Barter owns native x402 settlement events, the adapter changes. The page and the
                stream protocol do not.
              </p>
            </div>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-[36px] border border-white/10 bg-white/[0.04] shadow-[0_30px_80px_rgba(2,6,23,0.45)]">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/35 to-transparent" />
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-5 py-4 sm:px-6">
            <div>
              <div className="text-xs uppercase tracking-[0.18em] text-white/38">now streaming</div>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span
                  className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium ${statusCopy[snapshot.status].classes}`}
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-current" />
                  {statusCopy[snapshot.status].label}
                </span>
                <span
                  className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium ${freshnessChip}`}
                >
                  {transportState === "live" ? "SSE connected" : "Reconnecting"}
                </span>
              </div>
            </div>
            <div className="text-right text-xs text-white/42">
              <div>{snapshot.stats.providerLabel}</div>
              <div className="mt-1">
                Synced {formatRelativeTime(snapshot.fetchedAt, nowMs)}
              </div>
            </div>
          </div>

          <div className="max-h-[780px] space-y-3 overflow-y-auto px-4 py-4 sm:px-5">
            {deferredItems.map((item) => {
              const isFresh = freshIds.includes(item.id);
              const categoryTone =
                categoryStyles[item.category] ||
                "border-white/10 bg-white/[0.05] text-white/78";

              return (
                <article
                  key={item.id}
                  className={`rounded-[28px] border p-5 transition-all duration-500 ${
                    isFresh
                      ? "border-amber-300/30 bg-amber-300/[0.07] shadow-[0_0_0_1px_rgba(252,211,77,0.18),0_22px_50px_rgba(252,211,77,0.12)]"
                      : "border-white/10 bg-[#0c1119]"
                  }`}
                >
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`inline-flex rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${categoryTone}`}
                      >
                        {item.categoryLabel}
                      </span>
                      {item.metadata.networkLabel ? (
                        <span className="inline-flex rounded-full border border-white/10 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.16em] text-white/58">
                          {item.metadata.networkLabel}
                        </span>
                      ) : null}
                    </div>
                    <div className="text-xs uppercase tracking-[0.18em] text-white/38">
                      {formatRelativeTime(item.displayedAt, nowMs)}
                    </div>
                  </div>

                  <div className="mb-4 flex items-start justify-between gap-4">
                    <div className="space-y-2">
                      <h2 className="font-[var(--font-display)] text-xl leading-tight text-white">
                        {item.itemName}
                      </h2>
                      <p className="max-w-[54ch] text-sm leading-7 text-white/60">
                        {item.commentary}
                      </p>
                    </div>
                    <div className="shrink-0 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-right">
                      <div className="text-[11px] uppercase tracking-[0.16em] text-white/34">price</div>
                      <div className="mt-2 text-lg font-semibold text-white">{item.money.formatted}</div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 text-xs text-white/52">
                    <span className="rounded-full border border-white/10 px-3 py-1">
                      agent {item.agentMaskedId}
                    </span>
                    <span className="rounded-full border border-white/10 px-3 py-1">
                      {item.sourceLabel}
                    </span>
                    {item.metadata.facilitatorName ? (
                      <span className="rounded-full border border-white/10 px-3 py-1">
                        {item.metadata.facilitatorName}
                      </span>
                    ) : null}
                    {item.metadata.serviceHost ? (
                      <span className="rounded-full border border-white/10 px-3 py-1">
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
