"use client";

import { startTransition, useDeferredValue, useEffect, useMemo, useState } from "react";
import type {
  AgenticMarketplaceCategory,
  AgenticMarketplaceSnapshot,
} from "@/modules/agentic-marketplace/contracts";

const categoryOptions: { value: AgenticMarketplaceCategory; label: string }[] = [
  { value: "all", label: "All" },
  { value: "data", label: "Data" },
  { value: "search", label: "Search" },
  { value: "social", label: "Social" },
  { value: "media", label: "Media" },
  { value: "inference", label: "Inference" },
  { value: "infrastructure", label: "Infrastructure" },
  { value: "trading", label: "Trading" },
];

const numberFormatter = new Intl.NumberFormat("en-US");

function relativeTime(value: string) {
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) return "just now";

  const seconds = Math.round((Date.now() - parsed) / 1_000);
  if (seconds < 60) return "just now";
  if (seconds < 3_600) return `${Math.round(seconds / 60)}m ago`;
  if (seconds < 86_400) return `${Math.round(seconds / 3_600)}h ago`;
  return `${Math.round(seconds / 86_400)}d ago`;
}

export function AgenticMarketplaceSection({
  initialSnapshot,
}: {
  initialSnapshot: AgenticMarketplaceSnapshot;
}) {
  const [snapshot, setSnapshot] = useState(initialSnapshot);
  const [query, setQuery] = useState(initialSnapshot.filters.query);
  const [category, setCategory] = useState<AgenticMarketplaceCategory>(
    initialSnapshot.filters.category
  );
  const [network, setNetwork] = useState(initialSnapshot.filters.network);
  const [status, setStatus] = useState<"idle" | "loading">("idle");
  const deferredQuery = useDeferredValue(query);

  const networks = useMemo(() => {
    const unique = new Set<string>();
    for (const item of initialSnapshot.items) {
      if (item.network) unique.add(item.network);
    }
    for (const item of snapshot.items) {
      if (item.network) unique.add(item.network);
    }
    return Array.from(unique.values()).sort();
  }, [initialSnapshot.items, snapshot.items]);

  useEffect(() => {
    const controller = new AbortController();
    setStatus("loading");

    const timeout = window.setTimeout(async () => {
      try {
        const params = new URLSearchParams();
        if (deferredQuery.trim()) params.set("q", deferredQuery.trim());
        if (category !== "all") params.set("category", category);
        if (network !== "all") params.set("network", network);
        params.set("limit", "12");

        const response = await fetch(`/api/agentic-marketplace/services?${params.toString()}`, {
          cache: "no-store",
          signal: controller.signal,
        });

        if (!response.ok) return;
        const data = (await response.json()) as { snapshot?: AgenticMarketplaceSnapshot };
        const nextSnapshot = data.snapshot;
        if (!nextSnapshot) return;

        startTransition(() => {
          setSnapshot(nextSnapshot);
          setStatus("idle");
        });
      } catch {
        setStatus("idle");
      }
    }, 250);

    return () => {
      controller.abort();
      window.clearTimeout(timeout);
    };
  }, [category, deferredQuery, network]);

  const programmaticUrl = useMemo(() => {
    const params = new URLSearchParams();
    params.set("limit", "5");
    if (deferredQuery.trim()) params.set("q", deferredQuery.trim());
    if (category !== "all") params.set("category", category);
    if (network !== "all") params.set("network", network);
    return `/api/agentic-marketplace/services?${params.toString()}`;
  }, [category, deferredQuery, network]);

  return (
    <section className="pb-24">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-[10px] font-medium uppercase tracking-[0.22em] text-white/60">
            <span className="h-1.5 w-1.5 rounded-full bg-white/80" />
            Marketplace
          </div>
          <h2 className="font-[var(--font-display)] text-xl font-bold tracking-tight text-white sm:text-2xl">
            Browse the commerce layer.
          </h2>
        </div>

        <div className="flex gap-2">
          <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2">
            <div className="text-[10px] uppercase tracking-[0.16em] text-white/50">Catalog</div>
            <div className="mt-0.5 text-base font-bold text-white">
              {numberFormatter.format(snapshot.stats.totalResources)}
            </div>
          </div>
          <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2">
            <div className="text-[10px] uppercase tracking-[0.16em] text-white/50">Visible</div>
            <div className="mt-0.5 text-base font-bold text-white">
              {numberFormatter.format(snapshot.stats.visibleResults)}
            </div>
          </div>
          <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2">
            <div className="text-[10px] uppercase tracking-[0.16em] text-white/50">Tape hits</div>
            <div className="mt-0.5 text-base font-bold text-white">
              {numberFormatter.format(snapshot.stats.liveTapeHits)}
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4">
          <div className="space-y-5">
            <label className="flex flex-col gap-2">
              <span className="text-[11px] uppercase tracking-[0.18em] text-white/50">
                Search services
              </span>
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search data, social, trading, browser..."
                className="rounded-2xl border border-white/[0.1] bg-[#0c0c0d] px-4 py-3 text-sm text-white outline-none transition-all placeholder:text-white/40 focus:border-white/20"
              />
            </label>

            <div className="grid gap-3">
              <label className="flex flex-col gap-2">
                <span className="text-[11px] uppercase tracking-[0.18em] text-white/50">Category</span>
                <select
                  value={category}
                  onChange={(event) => setCategory(event.target.value as AgenticMarketplaceCategory)}
                  className="rounded-2xl border border-white/[0.1] bg-[#0c0c0d] px-4 py-3 text-sm text-white outline-none transition-all focus:border-white/20"
                >
                  {categoryOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-2">
                <span className="text-[11px] uppercase tracking-[0.18em] text-white/50">Network</span>
                <select
                  value={network}
                  onChange={(event) => setNetwork(event.target.value)}
                  className="rounded-2xl border border-white/[0.1] bg-[#0c0c0d] px-4 py-3 text-sm text-white outline-none transition-all focus:border-white/20"
                >
                  <option value="all">All networks</option>
                  {networks.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="flex flex-wrap gap-2">
              {categoryOptions.slice(1).map((option) => (
                <button
                  key={option.value}
                  onClick={() => setCategory(option.value)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-all ${
                    category === option.value
                      ? "border-white/18 bg-white/[0.08] text-white"
                      : "border-white/[0.08] bg-transparent text-white/48 hover:border-white/14 hover:text-white/72"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>

            <div className="rounded-[24px] border border-white/[0.08] bg-[#0c0c0d] p-4">
              <div className="text-[11px] uppercase tracking-[0.18em] text-white/48">Zero friction</div>
              <p className="mt-3 text-sm leading-7 text-white/48">
                No accounts, no API keys, no separate discovery endpoint. Humans and agents hit the
                same catalog.
              </p>
              <div className="mt-4 rounded-2xl border border-white/[0.08] bg-black/30 p-4 font-mono text-[11px] leading-6 text-white/74">
                GET {programmaticUrl}
              </div>
            </div>
          </div>
        </aside>

        <div className="min-w-0 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4">
          <div className="mb-4 flex items-center justify-between gap-4">
            <div>
              <div className="text-[11px] uppercase tracking-[0.18em] text-white/48">Browse deck</div>
              <div className="mt-1 text-sm text-white/66">
                {status === "loading" ? "Refreshing services…" : `Synced ${relativeTime(snapshot.fetchedAt)}`}
              </div>
            </div>
            <div className="text-right text-[11px] uppercase tracking-[0.18em] text-white/45">
              {snapshot.stats.sourceLabel}
            </div>
          </div>

          {snapshot.items.length ? (
            <div className="grid gap-2">
              {snapshot.items.map((item) => (
                <a
                  key={item.id}
                  href={item.resourceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="group flex items-center gap-4 rounded-2xl border border-white/[0.06] bg-[#0c0c0d] px-4 py-3 transition-all hover:border-white/14 hover:bg-white/[0.04]"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2.5">
                      <h3 className="truncate text-sm font-semibold text-white">
                        {item.title}
                      </h3>
                      <div className="flex shrink-0 gap-1.5">
                        <span className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] uppercase tracking-[0.14em] text-white/48">
                          {item.categoryLabel}
                        </span>
                        <span className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] uppercase tracking-[0.14em] text-white/48">
                          {item.networkLabel}
                        </span>
                        {item.liveTapeMentions > 0 ? (
                          <span className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] uppercase tracking-[0.14em] text-white/68">
                            {item.liveTapeMentions}x live
                          </span>
                        ) : null}
                      </div>
                    </div>
                    <p className="mt-1 truncate text-xs text-white/44">{item.description}</p>
                  </div>

                  <div className="hidden shrink-0 items-center gap-4 text-xs text-white/50 sm:flex">
                    <span className="w-24 truncate text-white/60">{item.providerName}</span>
                    <span className="w-12 text-center font-mono text-white/40">{item.method}</span>
                    <span className="w-40 truncate font-mono text-white/40">{item.host}</span>
                  </div>

                  <div className="shrink-0 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-right">
                    <div className="text-xs font-semibold text-white">{item.priceLabel}</div>
                  </div>

                  <span className="shrink-0 text-xs text-white/40 transition-colors group-hover:text-white/70">↗</span>
                </a>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-white/[0.08] px-6 py-10 text-center text-sm text-white/42">
              No services matched. Broaden the query or reset filters.
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
