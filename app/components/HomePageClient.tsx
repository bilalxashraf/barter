"use client";

import { useCallback, useEffect, useState } from "react";
import type { SiteMetrics } from "@/app/_lib/siteMetrics.types";
import { AgenticMarketplaceSection } from "@/app/components/agentic-marketplace/AgenticMarketplaceSection";
import { WaitlistModal } from "@/app/components/WaitlistModal";
import { LiveFeedSection, type LiveFeedLiveStats } from "@/app/components/live-feed/LiveFeedSection";
import type { AgenticMarketplaceSnapshot } from "@/modules/agentic-marketplace/contracts";
import type { LiveFeedSnapshot } from "@/modules/live-feed/contracts";

const numberFormatter = new Intl.NumberFormat("en-US");
const metricsRefreshIntervalMs = 15_000;

const infraPillars = [
  {
    title: "Pay with a tweet",
    desc: "An agent types a reply, sends a DM, or posts a comment — and the payment settles instantly. No checkout pages, no card forms. The conversation is the transaction.",
  },
  {
    title: "Every agent gets a wallet",
    desc: "Any AI agent can hold funds, authorize payments, and prove its identity on-chain. No human in the loop. No bank account needed. Just code that can spend.",
  },
  {
    title: "One network, every chain",
    desc: "Agents pay on Base, Solana, or any supported chain. Barter handles bridging, gas, and finality behind the scenes. The agent never thinks about infrastructure.",
  },
];

const sectionLinks = [
  {
    id: "live-tape",
    label: "Live tape",
    subtitle: "Real purchases in motion",
    barWidth: "100%",
  },
  {
    id: "marketplace",
    label: "Marketplace",
    subtitle: "Search x402 services",
    barWidth: "84%",
  },
  {
    id: "infrastructure",
    label: "Infrastructure",
    subtitle: "What powers it",
    barWidth: "68%",
  },
  {
    id: "metrics",
    label: "Metrics",
    subtitle: "Product proof",
    barWidth: "54%",
  },
] as const;

export function HomePageClient({
  initialLiveFeed,
  initialMarketplace,
}: {
  initialLiveFeed: LiveFeedSnapshot;
  initialMarketplace: AgenticMarketplaceSnapshot;
}) {
  const [isWaitlistOpen, setIsWaitlistOpen] = useState(false);
  const [metrics, setMetrics] = useState<SiteMetrics | null>(null);
  const [activeSection, setActiveSection] = useState<(typeof sectionLinks)[number]["id"]>("live-tape");
  const [liveStats, setLiveStats] = useState<LiveFeedLiveStats | null>(null);
  const handleLiveStatsChange = useCallback((stats: LiveFeedLiveStats) => setLiveStats(stats), []);

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

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((left, right) => right.intersectionRatio - left.intersectionRatio)[0];

        if (visible?.target.id) {
          setActiveSection(visible.target.id as (typeof sectionLinks)[number]["id"]);
        }
      },
      {
        rootMargin: "-18% 0px -58% 0px",
        threshold: [0.15, 0.3, 0.5],
      }
    );

    for (const section of sectionLinks) {
      const element = document.getElementById(section.id);
      if (element) observer.observe(element);
    }

    return () => {
      observer.disconnect();
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
    <main className="min-h-screen bg-[#0a0a0b] text-white">
      <div className="border-b border-white/[0.06] bg-white/[0.02] py-1.5 text-center text-[10px] uppercase tracking-[0.24em] text-white/45">
        Top 15 at India&apos;s first OpenCode hackathon
      </div>
      <nav className="sticky top-0 z-50 border-b border-white/[0.08] bg-[#0a0a0b]/92 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-3 sm:px-6 lg:px-8">
          <div>
            <div className="text-sm font-semibold tracking-tight text-white/92">Barter</div>
            <div className="text-[11px] uppercase tracking-[0.18em] text-white/50">
              Agentic commerce
            </div>
          </div>

          <button
            onClick={() => setIsWaitlistOpen(true)}
            className="rounded-full border border-white/12 bg-white px-5 py-2 text-[13px] font-semibold text-black transition-all hover:bg-white/92"
          >
            Join waitlist
          </button>
        </div>

        <div className="border-t border-white/[0.05]">
          <div className="mx-auto flex max-w-7xl gap-1.5 overflow-x-auto px-5 py-2 sm:px-6 lg:px-8">
            {sectionLinks.map((section) => {
              const isActive = activeSection === section.id;

              return (
                <a
                  key={section.id}
                  href={`#${section.id}`}
                  className={`flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-[12px] transition-all ${
                    isActive
                      ? "border-white/20 bg-white/[0.08] text-white"
                      : "border-white/[0.06] text-white/50 hover:border-white/14 hover:text-white/72"
                  }`}
                >
                  <span className="text-[10px] font-semibold uppercase tracking-[0.14em]">
                    {section.label}
                  </span>
                </a>
              );
            })}
          </div>
        </div>
      </nav>

      <section id="live-tape" className="scroll-mt-24">
        <div className="mx-auto max-w-7xl px-5 py-4 sm:px-6 lg:px-8">
          <div className="mb-3 flex items-center gap-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[11px] uppercase tracking-[0.2em] text-white/58">
              <span className="h-2 w-2 rounded-full bg-white animate-pulse" />
              Live now
            </div>
            <h1 className="font-[var(--font-display)] text-lg font-bold tracking-tight text-white sm:text-xl">
              Real agents. Real spend. One surface.
            </h1>
            {liveStats ? (
              <div className="ml-auto flex items-center gap-3 text-xs tabular-nums text-white/45">
                <span><span className="font-bold text-white">{numberFormatter.format(liveStats.totalItems24h)}</span> txns/24h</span>
                <span className="text-white/20">·</span>
                <span><span className="font-bold text-white">${liveStats.accumulatedVolume > 0 ? liveStats.accumulatedVolume.toFixed(liveStats.accumulatedVolume < 1 ? 4 : 2) : "0"}</span> vol</span>
                <span className="text-white/20">·</span>
                <span className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
                  <span className="font-bold text-white">{numberFormatter.format(liveStats.viewerCount)}</span> watching
                </span>
              </div>
            ) : null}
          </div>

          <LiveFeedSection initialSnapshot={initialLiveFeed} onStatsChange={handleLiveStatsChange} />
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
        <div id="marketplace" className="scroll-mt-24">
          <AgenticMarketplaceSection initialSnapshot={initialMarketplace} />
        </div>

        <section id="infrastructure" className="scroll-mt-24 pt-8 pb-12">
          <div className="mb-5">
            <h2 className="font-[var(--font-display)] text-xl font-bold tracking-tight text-white sm:text-2xl">
              How it works
            </h2>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            {infraPillars.map((pillar) => (
              <div
                key={pillar.title}
                className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-4"
              >
                <h3 className="text-sm font-bold text-white">{pillar.title}</h3>
                <p className="mt-1.5 text-xs leading-5 text-white/50">{pillar.desc}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="metrics" className="scroll-mt-24 pt-8 pb-12">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-white/56">
              Live product metrics
            </h2>
            <p className="text-[11px] text-white/45">
              {metrics
                ? `Updated ${new Date(metrics.updatedAt).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}`
                : "Loading…"}
            </p>
          </div>

          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
            {metricCards.map((metric) => (
              <div
                key={metric.label}
                className="flex items-center justify-between rounded-2xl border border-white/[0.08] bg-white/[0.03] px-4 py-3 transition-all hover:border-white/[0.14]"
              >
                <div className="text-[10px] uppercase tracking-[0.16em] text-white/48">
                  {metric.label}
                </div>
                <div className="text-xl font-bold tracking-tight text-white">
                  {metric.value}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      <footer className="border-t border-white/[0.06]">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-6 py-5 sm:flex-row">
          <div className="flex items-center gap-2.5">
            <span className="text-[12px] font-semibold text-white/45">Barter</span>
            <span className="text-[12px] text-white/45">
              Barter Payments &copy; {new Date().getFullYear()}
            </span>
          </div>
          <div className="text-[12px] text-white/45">Live tape. Storefront. Rails.</div>
        </div>
      </footer>

      {isWaitlistOpen ? (
        <WaitlistModal onClose={() => setIsWaitlistOpen(false)} onMetricsChange={setMetrics} />
      ) : null}
    </main>
  );
}
