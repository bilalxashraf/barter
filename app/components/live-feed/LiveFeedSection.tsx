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
  { label: string; dot: string }
> = {
  live: { label: "LIVE", dot: "bg-red-500" },
  stale: { label: "IDLE", dot: "bg-yellow-500" },
  fallback: { label: "DEMO", dot: "bg-blue-400" },
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

  return (
    <div className="flex h-full flex-col bg-[#0e0e0e]">
      {/* Twitch-style top bar */}
      <div className="flex items-center justify-between border-b border-white/[0.06] bg-[#18181b] px-5 py-2.5">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className={`h-2 w-2 rounded-full ${statusInfo.dot} ${snapshot.status === "live" ? "animate-pulse" : ""}`} />
            <span className="text-[12px] font-bold uppercase tracking-wider text-red-400">
              {statusInfo.label}
            </span>
          </div>
          <span className="text-[13px] font-medium text-white/70">Agent Commerce Stream</span>
        </div>

        <div className="flex items-center gap-5">
          <div className="flex items-center gap-1.5 text-[12px] text-white/40">
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/></svg>
            <span>{viewerCount ? numberFormatter.format(viewerCount) : "0"}</span>
          </div>
          <div className="text-[11px] text-white/25">
            {transportState === "live" ? "Connected" : "Reconnecting..."}
          </div>
        </div>
      </div>

      {/* Stream stats bar */}
      <div className="flex items-center gap-6 border-b border-white/[0.04] bg-[#131316] px-5 py-2">
        <div className="text-[11px] text-white/25">
          <span className="text-white/50">{numberFormatter.format(snapshot.stats.totalItems24h)}</span> txns/24h
        </div>
        <div className="text-[11px] text-white/25">
          <span className="text-white/50">{numberFormatter.format(snapshot.stats.categories)}</span> categories
        </div>
        <div className="ml-auto text-[11px] text-white/20">
          {snapshot.stats.providerLabel}
        </div>
      </div>

      {/* Stream feed */}
      <div className="flex-1 overflow-y-auto px-4 py-3 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-white/8 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar]:w-1">
        <div className="space-y-1">
          {deferredItems.map((item) => {
            const isFresh = freshIds.includes(item.id);

            return (
              <div
                key={item.id}
                className={`group rounded-md px-3 py-2.5 transition-colors duration-300 ${
                  isFresh
                    ? "bg-white/[0.04]"
                    : "hover:bg-white/[0.02]"
                }`}
              >
                <div className="flex items-start gap-3">
                  {/* Agent avatar */}
                  <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded bg-white/[0.06] text-[9px] font-bold uppercase text-white/30">
                    {item.agentMaskedId.slice(0, 2)}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-2">
                      <span className="text-[12px] font-semibold text-white/50">
                        agent-{item.agentMaskedId}
                      </span>
                      <span className="text-[10px] text-white/15">
                        {formatRelativeTime(item.displayedAt, nowMs)}
                      </span>
                    </div>

                    <div className="mt-0.5 flex items-baseline gap-2">
                      <span className="text-[13px] text-white/70">
                        {item.itemName}
                      </span>
                      <span className="shrink-0 text-[12px] font-medium text-white/30">
                        {item.money.formatted}
                      </span>
                    </div>

                    {item.commentary && (
                      <p className="mt-0.5 text-[11px] leading-5 text-white/20">
                        {item.commentary}
                      </p>
                    )}

                    <div className="mt-1 flex flex-wrap gap-1.5">
                      <span className="rounded bg-white/[0.04] px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-white/20">
                        {item.categoryLabel}
                      </span>
                      {item.metadata.networkLabel && (
                        <span className="rounded bg-white/[0.04] px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-white/20">
                          {item.metadata.networkLabel}
                        </span>
                      )}
                      <span className="rounded bg-white/[0.04] px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-white/20">
                        {item.sourceLabel}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-white/[0.04] bg-[#131316] px-5 py-2">
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-white/15">
            Synced {formatRelativeTime(snapshot.fetchedAt, nowMs)}
          </span>
          <span className="text-[10px] text-white/10">
            barter payments
          </span>
        </div>
      </div>
    </div>
  );
}
