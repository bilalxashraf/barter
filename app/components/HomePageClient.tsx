"use client";

import { useEffect, useState } from "react";
import type { SiteMetrics } from "@/app/_lib/siteMetrics.types";
import { AgenticMarketplaceSection } from "@/app/components/agentic-marketplace/AgenticMarketplaceSection";
import type { LiveFeedSnapshot } from "@/modules/live-feed/contracts";
import type { AgenticMarketplaceSnapshot } from "@/modules/agentic-marketplace/contracts";
import { WaitlistModal } from "@/app/components/WaitlistModal";
import { LiveFeedSection } from "@/app/components/live-feed/LiveFeedSection";

const numberFormatter = new Intl.NumberFormat("en-US");
const metricsRefreshIntervalMs = 15_000;

const infraPillars = [
  {
    number: "01",
    title: "Payment rails for agents",
    desc: "Protocol-level primitives that let any AI agent hold funds, authorize payments, and settle in real time — no human in the loop.",
  },
  {
    number: "02",
    title: "Identity & trust layer",
    desc: "Verifiable agent identities anchored to wallets and on-chain credentials, so counterparties know who they're transacting with.",
  },
  {
    number: "03",
    title: "Settlement engine",
    desc: "Multi-chain settlement that abstracts away bridging, gas, and finality. Agents pay in one call; Barter handles the rest.",
  },
  {
    number: "04",
    title: "Commerce graph",
    desc: "A live index of what agents buy, from whom, and at what price — the data layer powering discovery, pricing, and trust scores.",
  },
];

export function HomePageClient({
  initialLiveFeed,
  initialMarketplace,
}: {
  initialLiveFeed: LiveFeedSnapshot;
  initialMarketplace: AgenticMarketplaceSnapshot;
}) {
  const [isWaitlistOpen, setIsWaitlistOpen] = useState(false);
  const [metrics, setMetrics] = useState<SiteMetrics | null>(null);

  useEffect(() => {
    let active = true;
    const visitState = window as Window & {
      __barterInitialVisitTracked?: boolean;
    };

    async function loadMetrics(methodOverride?: "GET" | "POST") {
      try {
        const method = methodOverride || (visitState.__barterInitialVisitTracked ? "GET" : "POST");
        const response = await fetch("/api/metrics", {
          method,
          cache: "no-store",
          credentials: "same-origin",
        });

        if (!response.ok) return;

        const data = (await response.json()) as { metrics?: SiteMetrics };
        if (!active || !data.metrics) return;

        if (method === "POST") {
          visitState.__barterInitialVisitTracked = true;
        }

        setMetrics(data.metrics);
      } catch {
        // no-op
      }
    }

    void loadMetrics();

    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        void loadMetrics("GET");
      }
    }, metricsRefreshIntervalMs);

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void loadMetrics("GET");
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      active = false;
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  const metricCards = [
    {
      value: metrics ? numberFormatter.format(metrics.totalVisits) : "—",
      label: "page visits",
    },
    {
      value: metrics ? numberFormatter.format(metrics.uniqueVisitors) : "—",
      label: "unique visitors",
    },
    {
      value: metrics ? numberFormatter.format(metrics.waitlistCount) : "—",
      label: "waitlist signups",
    },
    {
      value: metrics ? numberFormatter.format(metrics.connectedXCount) : "—",
      label: "connected x accounts",
    },
    {
      value: metrics ? numberFormatter.format(metrics.solanaWalletUsersCount) : "—",
      label: "solana wallets",
    },
  ];

  return (
    <main className="min-h-screen bg-[#111] text-white">
      {/* Nav */}
      <nav className="sticky top-0 z-40 border-b border-white/[0.06] bg-[#111]/90 backdrop-blur-md">
        <div className="flex items-center justify-between px-6 py-3 lg:px-10">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-white text-[11px] font-black text-black">
              B
            </div>
            <span className="text-sm font-semibold tracking-tight text-white/90">Barter</span>
          </div>

          <button
            onClick={() => setIsWaitlistOpen(true)}
            className="rounded-full border border-white/15 bg-white/5 px-5 py-2 text-[13px] font-medium text-white/80 transition-all hover:bg-white/10 hover:text-white"
          >
            Join waitlist
          </button>
        </div>
      </nav>

      {/* Hero: Horizontal layout */}
      <div className="flex h-[calc(100vh-49px)]">
        {/* Left: Messaging */}
        <div className="flex w-[420px] shrink-0 flex-col justify-center border-r border-white/[0.06] px-10">
          <div className="space-y-8">
            <div>
              <p className="mb-6 text-[11px] uppercase tracking-[0.25em] text-white/25">
                AI Payments Infrastructure
              </p>
              <h1 className="text-[32px] font-bold leading-[1.15] tracking-tight text-white/90">
                Human&apos;s first system was barter.
              </h1>
              <h1 className="mt-2 text-[32px] font-bold leading-[1.15] tracking-tight text-white/40">
                It makes sense that agent&apos;s first one should be too.
              </h1>
            </div>

            <p className="text-[14px] leading-7 text-white/30">
              Agents are already buying tools, data, and compute. Barter puts the live tape, the
              searchable storefront, and the payment rails in one place.
            </p>

            <div className="flex flex-col gap-3">
              <button
                onClick={() => setIsWaitlistOpen(true)}
                className="w-fit rounded-full bg-white/90 px-6 py-2.5 text-[13px] font-semibold text-black transition-all hover:bg-white"
              >
                Join the waitlist
              </button>
              <div className="flex flex-wrap gap-2 text-[11px] uppercase tracking-[0.18em] text-white/32">
                <span className="rounded-full border border-white/10 px-3 py-1.5">
                  Live agent purchases
                </span>
                <span className="rounded-full border border-white/10 px-3 py-1.5">
                  Search x402 services
                </span>
                <span className="rounded-full border border-white/10 px-3 py-1.5">
                  Zero-friction discovery
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Twitch-style stream */}
        <div className="flex-1 overflow-hidden">
          <LiveFeedSection
            initialSnapshot={initialLiveFeed}
            onJoinWaitlist={() => setIsWaitlistOpen(true)}
          />
        </div>
      </div>

      {/* Below the fold */}
      <div className="mx-auto max-w-6xl px-5 sm:px-6">
        {/* Hackathon badge */}
        <div className="pb-6 pt-20 text-[10px] uppercase tracking-[0.25em] text-white/20">
          Top 15 at India&apos;s first OpenCode hackathon
        </div>

        {/* Infrastructure Vision */}
        <section className="relative pb-28">
          <div className="relative">
            <div className="mb-4 inline-flex items-center gap-2.5 rounded-full border border-amber-400/15 bg-amber-400/[0.06] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-amber-200/80">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.5)]" />
              What&apos;s next
            </div>

            <h2 className="mb-4 max-w-3xl font-[var(--font-display)] text-4xl font-black leading-[1.05] tracking-[-0.04em] text-white sm:text-5xl">
              The underlying infrastructure
              <br />
              <span className="bg-gradient-to-r from-amber-200 via-white to-violet-300 bg-clip-text text-transparent">
                for AI Payments.
              </span>
            </h2>

            <p className="mb-14 max-w-2xl text-[15px] leading-8 text-white/45">
              The live stream proves agents are already buying things. Now we&apos;re building the
              payment rails they deserve — native settlement, verifiable identities, and a commerce
              graph that makes agent-to-agent trade programmable from day one.
            </p>

            <div className="grid gap-4 sm:grid-cols-2">
              {infraPillars.map((pillar) => (
                <div
                  key={pillar.number}
                  className="group relative overflow-hidden rounded-[24px] border border-white/[0.07] bg-white/[0.02] p-6 transition-all duration-300 hover:border-white/[0.12] hover:bg-white/[0.035]"
                >
                  <div className="absolute -right-6 -top-6 text-[72px] font-black leading-none text-white/[0.03] transition-all duration-300 group-hover:text-white/[0.05]">
                    {pillar.number}
                  </div>
                  <div className="relative">
                    <div className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.2em] text-white/25">
                      {pillar.number}
                    </div>
                    <h3 className="mb-3 text-lg font-semibold tracking-tight text-white/90">
                      {pillar.title}
                    </h3>
                    <p className="text-[13px] leading-7 text-white/40">{pillar.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Divider */}
        <div className="mx-auto mb-24 h-px max-w-lg bg-gradient-to-r from-transparent via-white/10 to-transparent" />

        <AgenticMarketplaceSection initialSnapshot={initialMarketplace} />

        <div className="mx-auto mb-24 h-px max-w-lg bg-gradient-to-r from-transparent via-white/10 to-transparent" />

        {/* Live Product Metrics */}
        <section className="pb-24">
          <div className="mb-6 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
            <div className="max-w-[52ch]">
              <h2 className="mb-2 text-sm font-semibold uppercase tracking-[0.18em] text-white/55">
                Live product metrics
              </h2>
              <p className="text-[13px] leading-7 text-white/30">
                Real-time counters from the running product — visits, signups, connected accounts,
                and provisioned wallets.
              </p>
            </div>
            <p className="whitespace-nowrap pt-1 text-[11px] leading-none text-white/18 sm:text-right">
              {metrics
                ? `Updated ${new Date(metrics.updatedAt).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}`
                : "Loading live counters\u2026"}
            </p>
          </div>

          <div className="grid items-stretch gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {metricCards.map((metric) => (
              <div
                key={metric.label}
                className="group flex min-h-[180px] flex-col justify-between rounded-[26px] border border-white/[0.06] bg-white/[0.015] p-6 transition-all duration-300 hover:border-white/[0.1] hover:bg-white/[0.025]"
              >
                <div className="text-4xl font-black leading-none tracking-tight text-white transition-transform duration-300 group-hover:translate-x-0.5">
                  {metric.value}
                </div>
                <div className="max-w-[12ch] text-[10px] uppercase tracking-[0.18em] text-white/28">
                  {metric.label}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Footer */}
      <footer className="border-t border-white/[0.05]">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 py-8 sm:flex-row">
          <div className="flex items-center gap-2.5">
            <div className="flex h-5 w-5 items-center justify-center rounded-md bg-white text-[9px] font-black text-black">
              B
            </div>
            <span className="text-[12px] text-white/25">Barter Payments &copy; {new Date().getFullYear()}</span>
          </div>
          <div className="text-[12px] text-white/18">
            AI Payments Infrastructure
          </div>
        </div>
      </footer>

      {isWaitlistOpen ? (
        <WaitlistModal
          onClose={() => setIsWaitlistOpen(false)}
          onMetricsChange={setMetrics}
        />
      ) : null}
    </main>
  );
}
