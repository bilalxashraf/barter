import { randomUUID } from "crypto";
import type { LiveFeedSnapshot, LiveFeedStreamEvent } from "@/modules/live-feed/contracts";
import { liveFeedConfig } from "@/modules/live-feed/config";
import { getLiveFeedSnapshot } from "@/modules/live-feed/service";

type Sink = (event: LiveFeedStreamEvent) => void;

const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

class LiveFeedHub {
  private readonly sinks = new Map<string, Sink>();
  private readonly viewerIds = new Set<string>();
  private interval: ReturnType<typeof setInterval> | null = null;
  private currentSnapshot: LiveFeedSnapshot | null = null;
  private isRefreshing = false;
  private readonly seenItems = new Map<string, number>();

  private broadcast(event: LiveFeedStreamEvent) {
    for (const sink of this.sinks.values()) {
      sink(event);
    }
  }

  private ensureStarted() {
    if (this.interval) return;

    this.interval = setInterval(() => {
      void this.refresh();
    }, liveFeedConfig.pollIntervalMs);

    if (typeof this.interval.unref === "function") {
      this.interval.unref();
    }

    void this.refresh();
  }

  private trackItems(snapshot: LiveFeedSnapshot) {
    const now = Date.now();

    for (const item of snapshot.items) {
      if (!this.seenItems.has(item.id)) {
        this.seenItems.set(item.id, now);
      }
    }

    const cutoff = now - TWENTY_FOUR_HOURS_MS;
    for (const [id, ts] of this.seenItems) {
      if (ts < cutoff) {
        this.seenItems.delete(id);
      }
    }
  }

  private patchStats(snapshot: LiveFeedSnapshot): LiveFeedSnapshot {
    return {
      ...snapshot,
      stats: {
        ...snapshot.stats,
        totalItems24h: this.seenItems.size,
      },
    };
  }

  async getSnapshot() {
    this.ensureStarted();
    this.currentSnapshot ||= await getLiveFeedSnapshot();
    this.trackItems(this.currentSnapshot);
    return this.patchStats(this.currentSnapshot);
  }

  getViewerCount() {
    return this.viewerIds.size;
  }

  async subscribe(sink: Sink) {
    this.ensureStarted();

    const subscriberId = randomUUID();
    this.sinks.set(subscriberId, sink);
    this.viewerIds.add(subscriberId);

    sink({
      type: "presence",
      viewerCount: this.viewerIds.size,
    });

    const snapshot = await this.getSnapshot();
    sink({
      type: "snapshot",
      snapshot,
      viewerCount: this.viewerIds.size,
    });

    return () => {
      this.sinks.delete(subscriberId);
      this.viewerIds.delete(subscriberId);
      this.broadcast({
        type: "presence",
        viewerCount: this.viewerIds.size,
      });
    };
  }

  async refresh() {
    if (this.isRefreshing) return;
    this.isRefreshing = true;

    try {
      const previousIds = new Set(this.currentSnapshot?.items.map((item) => item.id) ?? []);
      const snapshot = await getLiveFeedSnapshot({ forceRefresh: true });

      this.trackItems(snapshot);

      const patched = this.patchStats(snapshot);
      const appendedItems = patched.items.filter((item) => !previousIds.has(item.id));

      this.currentSnapshot = snapshot;

      if (appendedItems.length) {
        this.broadcast({
          type: "append",
          items: appendedItems,
          stats: patched.stats,
          status: patched.status,
          fetchedAt: patched.fetchedAt,
          viewerCount: this.viewerIds.size,
        });
      }

      this.broadcast({
        type: "pulse",
        stats: patched.stats,
        status: patched.status,
        fetchedAt: patched.fetchedAt,
        viewerCount: this.viewerIds.size,
      });
    } finally {
      this.isRefreshing = false;
    }
  }
}

declare global {
  // eslint-disable-next-line no-var
  var __barterLiveFeedHub: LiveFeedHub | undefined;
}

export function getLiveFeedHub() {
  if (!globalThis.__barterLiveFeedHub) {
    globalThis.__barterLiveFeedHub = new LiveFeedHub();
  }

  return globalThis.__barterLiveFeedHub;
}
