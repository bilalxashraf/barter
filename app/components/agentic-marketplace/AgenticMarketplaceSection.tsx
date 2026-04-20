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
      <div className="mb-8 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div className="max-w-3xl">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-xs font-medium uppercase tracking-[0.22em] text-white/60">
            <span className="h-2 w-2 rounded-full bg-white/80" />
            Agentic marketplace
          </div>
          <h2 className="font-[var(--font-display)] text-3xl font-black tracking-[-0.04em] text-white sm:text-4xl">
            Browse the commerce layer horizontally.
          </h2>
          <p className="mt-4 max-w-2xl text-[15px] leading-8 text-white/46">
            Search live x402 services, inspect payment metadata, and browse the catalog like a
            product shelf instead of a docs page.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-[24px] border border-white/[0.08] bg-white/[0.03] px-5 py-4">
            <div className="text-[11px] uppercase tracking-[0.18em] text-white/50">Catalog size</div>
            <div className="mt-2 text-2xl font-black text-white">
              {numberFormatter.format(snapshot.stats.totalResources)}
            </div>
          </div>
          <div className="rounded-[24px] border border-white/[0.08] bg-white/[0.03] px-5 py-4">
            <div className="text-[11px] uppercase tracking-[0.18em] text-white/50">Visible now</div>
            <div className="mt-2 text-2xl font-black text-white">
              {numberFormatter.format(snapshot.stats.visibleResults)}
            </div>
          </div>
          <div className="rounded-[24px] border border-white/[0.08] bg-white/[0.03] px-5 py-4">
            <div className="text-[11px] uppercase tracking-[0.18em] text-white/50">Live tape hits</div>
            <div className="mt-2 text-2xl font-black text-white">
              {numberFormatter.format(snapshot.stats.liveTapeHits)}
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="rounded-[32px] border border-white/[0.08] bg-white/[0.03] p-6">
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

        <div className="min-w-0 rounded-[32px] border border-white/[0.08] bg-white/[0.03] p-5">
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
            <div className="overflow-x-auto pb-2 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-white/8 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar]:h-1.5">
              <div className="flex min-w-max gap-4 pr-5">
                {snapshot.items.map((item) => (
                  <article
                    key={item.id}
                    className="flex w-[320px] shrink-0 flex-col rounded-[28px] border border-white/[0.08] bg-[#0c0c0d] p-5"
                  >
                    <div className="mb-4 flex flex-wrap gap-2">
                      <span className="rounded-full border border-white/10 px-3 py-1 text-[11px] uppercase tracking-[0.16em] text-white/48">
                        {item.categoryLabel}
                      </span>
                      <span className="rounded-full border border-white/10 px-3 py-1 text-[11px] uppercase tracking-[0.16em] text-white/48">
                        {item.networkLabel}
                      </span>
                      {item.liveTapeMentions > 0 ? (
                        <span className="rounded-full border border-white/10 px-3 py-1 text-[11px] uppercase tracking-[0.16em] text-white/68">
                          Seen live {item.liveTapeMentions}x
                        </span>
                      ) : null}
                    </div>

                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <h3 className="font-[var(--font-display)] text-2xl leading-tight text-white">
                          {item.title}
                        </h3>
                        {item.operationName ? (
                          <div className="mt-2 text-[11px] uppercase tracking-[0.18em] text-white/48">
                            {item.operationName}
                          </div>
                        ) : null}
                      </div>
                      <div className="rounded-[20px] border border-white/[0.08] bg-white/[0.03] px-3 py-3 text-right">
                        <div className="text-[11px] uppercase tracking-[0.18em] text-white/48">Pricing</div>
                        <div className="mt-2 text-sm font-semibold text-white">{item.priceLabel}</div>
                      </div>
                    </div>

                    <p className="mt-4 text-sm leading-7 text-white/50">{item.description}</p>

                    <dl className="mt-5 grid gap-3 text-xs text-white/42">
                      <div className="flex items-center justify-between gap-4 border-b border-white/[0.06] pb-3">
                        <dt className="uppercase tracking-[0.16em]">Provider</dt>
                        <dd className="text-right text-white/64">{item.providerName}</dd>
                      </div>
                      <div className="flex items-center justify-between gap-4 border-b border-white/[0.06] pb-3">
                        <dt className="uppercase tracking-[0.16em]">Method</dt>
                        <dd className="text-right text-white/64">{item.method}</dd>
                      </div>
                      <div className="flex items-center justify-between gap-4 border-b border-white/[0.06] pb-3">
                        <dt className="uppercase tracking-[0.16em]">Host</dt>
                        <dd className="max-w-[180px] break-all text-right text-white/64">{item.host}</dd>
                      </div>
                      <div className="flex items-center justify-between gap-4">
                        <dt className="uppercase tracking-[0.16em]">Mode</dt>
                        <dd className="text-right text-white/64">
                          {item.agentReady ? "Agent-readable" : "Browsable"}
                        </dd>
                      </div>
                    </dl>

                    <div className="mt-auto pt-5">
                      <a
                        href={item.resourceUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center justify-center rounded-full border border-white/[0.1] px-4 py-2 text-xs font-medium text-white/78 transition-all hover:border-white/18 hover:bg-white/[0.05]"
                      >
                        Open endpoint ↗
                      </a>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          ) : (
            <div className="rounded-[28px] border border-dashed border-white/[0.08] px-6 py-12 text-center text-sm text-white/42">
              No services matched that filter set. Broaden the query or switch back to all categories.
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
