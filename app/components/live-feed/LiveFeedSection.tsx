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

export type LiveFeedLiveStats = {
  totalItems24h: number;
  accumulatedVolume: number;
  viewerCount: number;
  connected: boolean;
};

function computeItemsVolume(items: LiveFeedItem[]): number {
  return items.reduce((sum, item) => {
    const raw = item.money.rawAmount;
    if (raw == null) return sum;
    return sum + (item.money.scale === "usd-micros" ? raw / 1_000_000 : raw);
  }, 0);
}

export function LiveFeedSection({
  initialSnapshot,
  onStatsChange,
}: {
  initialSnapshot: LiveFeedSnapshot;
  onStatsChange?: (stats: LiveFeedLiveStats) => void;
}) {
  const [snapshot, setSnapshot] = useState(initialSnapshot);
  const [viewerCount, setViewerCount] = useState(0);
  const [transportState, setTransportState] = useState<"connecting" | "live" | "reconnecting">(
    "connecting"
  );
  const [freshIds, setFreshIds] = useState<string[]>([]);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [accumulatedVolume, setAccumulatedVolume] = useState(() => computeItemsVolume(initialSnapshot.items));
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
        const vol = computeItemsVolume(payload.snapshot.items);
        startTransition(() => {
          setSnapshot(payload.snapshot);
          setViewerCount(payload.viewerCount);
          setTransportState("live");
          setAccumulatedVolume(vol);
        });
      }
    };

    const handleAppend = (event: Event) => {
      const payload = parseEvent<LiveFeedAppendEvent>(event as MessageEvent<string>);
      if (payload?.type === "append") {
        const ids = payload.items.map((item) => item.id);
        const newVolume = computeItemsVolume(payload.items);

        startTransition(() => {
          setSnapshot((current) => ({
            items: mergeItems(current.items, payload.items, current.stats.visibleItems),
            stats: payload.stats,
            status: payload.status,
            fetchedAt: payload.fetchedAt,
          }));
          setViewerCount(payload.viewerCount);
          setTransportState("live");
          setAccumulatedVolume((prev) => prev + newVolume);
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

  useEffect(() => {
    onStatsChange?.({
      totalItems24h: snapshot.stats.totalItems24h,
      accumulatedVolume,
      viewerCount,
      connected: transportState === "live",
    });
  }, [snapshot.stats.totalItems24h, accumulatedVolume, viewerCount, transportState, onStatsChange]);

  if (!deferredItems.length) {
    return (
      <div className="py-10 text-center text-sm text-white/48">
        Waiting for live purchases…
      </div>
    );
  }

  return (
    <section>

      <div className="columns-1 gap-2.5 sm:columns-2 lg:columns-3">
        {deferredItems.map((item) => {
          const isFresh = freshIds.includes(item.id);

          return (
            <div
              key={item.id}
              className={`mb-2.5 break-inside-avoid rounded-xl border p-4 transition-all duration-500 ${
                isFresh
                  ? "animate-slide-up border-white/20 bg-white/[0.06]"
                  : "border-white/[0.07] bg-white/[0.025]"
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-1.5 text-[11px] text-white/45">
                  <span className="font-medium text-white/60">agent-{item.agentMaskedId}</span>
                  <span className="text-white/20">·</span>
                  <span>{formatRelativeTime(item.displayedAt, nowMs)}</span>
                </div>
                <span className="shrink-0 text-sm font-bold tabular-nums text-white">
                  {item.money.formatted}
                </span>
              </div>

              <h3 className="mt-2 text-[15px] font-semibold leading-snug text-white">
                {item.itemName}
              </h3>

              {item.commentary ? (
                <p className="mt-1.5 text-[13px] leading-relaxed text-white/45">
                  {item.commentary}
                </p>
              ) : null}

              <div className="mt-3 flex flex-wrap items-center gap-1.5">
                <span className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] uppercase tracking-[0.12em] text-white/40">
                  {item.categoryLabel}
                </span>
                {item.metadata.networkLabel ? (
                  <span className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] uppercase tracking-[0.12em] text-white/40">
                    {item.metadata.networkLabel}
                  </span>
                ) : null}
                <span className="ml-auto text-[11px] text-white/30">
                  {compactHost(item.metadata.serviceHost)}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
