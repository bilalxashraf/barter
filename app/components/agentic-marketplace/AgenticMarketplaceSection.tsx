"use client";

import {
  startTransition,
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
} from "react";
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

  const seconds = Math.round((Date.now() - parsed) / 1000);
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.round(seconds / 60)}m ago`;
  if (seconds < 86_400) return `${Math.round(seconds / 3600)}h ago`;
  return `${Math.round(seconds / 86_400)}d ago`;
}

export function AgenticMarketplaceSection({
  initialSnapshot,
}: {
  initialSnapshot: AgenticMarketplaceSnapshot;
}) {
  const [snapshot, setSnapshot] = useState(initialSnapshot);
  const [query, setQuery] = useState(initialSnapshot.filters.query);
  const [category, setCategory] = useState<AgenticMarketplaceCategory>(initialSnapshot.filters.category);
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
        if (!data.snapshot) return;

        startTransition(() => {
          setSnapshot(data.snapshot!);
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
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-xs font-medium uppercase tracking-[0.22em] text-white/62">
            <span className="h-2 w-2 rounded-full bg-sky-300" />
            Agentic marketplace
          </div>
          <h2 className="font-[var(--font-display)] text-3xl font-bold tracking-[-0.03em] text-white sm:text-4xl">
            One stop destination for agentic commerce.
          </h2>
          <p className="mt-4 max-w-2xl text-sm leading-8 text-white/46 sm:text-base">
            Search live x402 services, inspect price and settlement metadata, and hit the same
            catalog through a JSON API that agents can consume without any separate auth flow.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-[24px] border border-white/10 bg-white/[0.03] px-5 py-4">
            <div className="text-[11px] uppercase tracking-[0.18em] text-white/35">catalog size</div>
            <div className="mt-2 text-2xl font-black text-white">
              {numberFormatter.format(snapshot.stats.totalResources)}
            </div>
          </div>
          <div className="rounded-[24px] border border-white/10 bg-white/[0.03] px-5 py-4">
            <div className="text-[11px] uppercase tracking-[0.18em] text-white/35">visible now</div>
            <div className="mt-2 text-2xl font-black text-white">
              {numberFormatter.format(snapshot.stats.visibleResults)}
            </div>
          </div>
          <div className="rounded-[24px] border border-white/10 bg-white/[0.03] px-5 py-4">
            <div className="text-[11px] uppercase tracking-[0.18em] text-white/35">live tape hits</div>
            <div className="mt-2 text-2xl font-black text-white">
              {numberFormatter.format(snapshot.stats.liveTapeHits)}
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_380px]">
        <div className="rounded-[34px] border border-white/10 bg-white/[0.03] p-5 sm:p-6">
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_170px_170px]">
            <label className="flex flex-col gap-2">
              <span className="text-[11px] uppercase tracking-[0.18em] text-white/34">Search services</span>
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search data, social, trading, browser..."
                className="rounded-2xl border border-white/10 bg-[#0a111a] px-4 py-3 text-sm text-white outline-none transition-all placeholder:text-white/22 focus:border-white/20"
              />
            </label>

            <label className="flex flex-col gap-2">
              <span className="text-[11px] uppercase tracking-[0.18em] text-white/34">Category</span>
              <select
                value={category}
                onChange={(event) => setCategory(event.target.value as AgenticMarketplaceCategory)}
                className="rounded-2xl border border-white/10 bg-[#0a111a] px-4 py-3 text-sm text-white outline-none transition-all focus:border-white/20"
              >
                {categoryOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-2">
              <span className="text-[11px] uppercase tracking-[0.18em] text-white/34">Network</span>
              <select
                value={network}
                onChange={(event) => setNetwork(event.target.value)}
                className="rounded-2xl border border-white/10 bg-[#0a111a] px-4 py-3 text-sm text-white outline-none transition-all focus:border-white/20"
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

          <div className="mt-4 flex flex-wrap items-center gap-2">
            {categoryOptions.slice(1).map((option) => (
              <button
                key={option.value}
                onClick={() => setCategory(option.value)}
                className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-all ${
                  category === option.value
                    ? "border-white/20 bg-white/10 text-white"
                    : "border-white/10 bg-transparent text-white/52 hover:border-white/16 hover:text-white/80"
                }`}
              >
                {option.label}
              </button>
            ))}
            <span className="ml-auto text-xs text-white/28">
              {status === "loading" ? "Refreshing..." : `Synced ${relativeTime(snapshot.fetchedAt)}`}
            </span>
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            {snapshot.items.map((item) => (
              <article
                key={item.id}
                className="rounded-[28px] border border-white/10 bg-[#0a111a] p-5"
              >
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-white/10 px-3 py-1 text-[11px] uppercase tracking-[0.16em] text-white/52">
                    {item.categoryLabel}
                  </span>
                  <span className="rounded-full border border-white/10 px-3 py-1 text-[11px] uppercase tracking-[0.16em] text-white/52">
                    {item.networkLabel}
                  </span>
                  {item.liveTapeMentions > 0 ? (
                    <span className="rounded-full border border-amber-300/20 bg-amber-300/10 px-3 py-1 text-[11px] uppercase tracking-[0.16em] text-amber-100">
                      Seen live {item.liveTapeMentions}x
                    </span>
                  ) : null}
                </div>

                <div className="mb-3 flex items-start justify-between gap-4">
                  <div>
                    <h3 className="font-[var(--font-display)] text-xl leading-tight text-white">
                      {item.title}
                    </h3>
                    {item.operationName ? (
                      <div className="mt-2 text-xs uppercase tracking-[0.16em] text-white/34">
                        {item.operationName}
                      </div>
                    ) : null}
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2 text-right">
                    <div className="text-[11px] uppercase tracking-[0.16em] text-white/32">pricing</div>
                    <div className="mt-1 text-sm font-semibold text-white">{item.priceLabel}</div>
                  </div>
                </div>

                <p className="text-sm leading-7 text-white/56">{item.description}</p>

                <dl className="mt-4 grid gap-3 text-xs text-white/44 sm:grid-cols-2">
                  <div>
                    <dt className="uppercase tracking-[0.16em] text-white/28">Provider</dt>
                    <dd className="mt-1 text-white/62">{item.providerName}</dd>
                  </div>
                  <div>
                    <dt className="uppercase tracking-[0.16em] text-white/28">Method</dt>
                    <dd className="mt-1 text-white/62">{item.method}</dd>
                  </div>
                  <div>
                    <dt className="uppercase tracking-[0.16em] text-white/28">Host</dt>
                    <dd className="mt-1 break-all text-white/62">{item.host}</dd>
                  </div>
                  <div>
                    <dt className="uppercase tracking-[0.16em] text-white/28">Payment</dt>
                    <dd className="mt-1 text-white/62">{item.paymentAsset || "Token metadata unavailable"}</dd>
                  </div>
                </dl>

                <div className="mt-5 flex items-center justify-between gap-3">
                  <div className="text-xs text-white/32">
                    {item.agentReady ? "Agent-readable" : "Browsable"}
                  </div>
                  <a
                    href={item.resourceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center justify-center rounded-full border border-white/10 px-4 py-2 text-xs font-medium text-white/78 transition-all hover:border-white/20 hover:bg-white/[0.05]"
                  >
                    Open endpoint ↗
                  </a>
                </div>
              </article>
            ))}
          </div>

          {!snapshot.items.length ? (
            <div className="mt-6 rounded-[28px] border border-dashed border-white/10 px-6 py-10 text-center text-sm text-white/42">
              No services matched that filter set yet. Try broadening the query or switching back to
              all categories.
            </div>
          ) : null}
        </div>

        <aside className="space-y-5">
          <div className="rounded-[34px] border border-white/10 bg-white/[0.03] p-6">
            <div className="text-[11px] uppercase tracking-[0.18em] text-white/34">Zero friction</div>
            <h3 className="mt-3 font-[var(--font-display)] text-2xl text-white">
              No accounts. No API keys. No logins.
            </h3>
            <p className="mt-3 text-sm leading-7 text-white/50">
              The public storefront stays readable for humans, while agents can query the same catalog
              through JSON without a second integration layer.
            </p>
            <div className="mt-4 rounded-2xl border border-white/10 bg-[#0a111a] p-4 font-mono text-[11px] leading-6 text-sky-100">
              GET {programmaticUrl}
            </div>
          </div>

          <div className="rounded-[34px] border border-white/10 bg-white/[0.03] p-6">
            <div className="text-[11px] uppercase tracking-[0.18em] text-white/34">For agents</div>
            <h3 className="mt-3 font-[var(--font-display)] text-2xl text-white">
              Same data, same surface.
            </h3>
            <p className="mt-3 text-sm leading-7 text-white/50">
              Search in the UI, or let an agent fetch the normalized JSON route and decide what to buy
              next. That keeps discovery, reporting, and execution pointed at one catalog.
            </p>
            <ul className="mt-4 space-y-3 text-sm text-white/56">
              <li>Search across live-discovered x402 services.</li>
              <li>Filter by category and settlement network.</li>
              <li>Inspect pricing and payment metadata before execution.</li>
            </ul>
          </div>
        </aside>
      </div>
    </section>
  );
}
