"use client";

import { useEffect, useState } from "react";
import type { SiteMetrics } from "@/app/_lib/siteMetrics.types";
import { AgenticMarketplaceSection } from "@/app/components/agentic-marketplace/AgenticMarketplaceSection";
import { WaitlistModal } from "@/app/components/WaitlistModal";
import { LiveFeedSection } from "@/app/components/live-feed/LiveFeedSection";
import type { AgenticMarketplaceSnapshot } from "@/modules/agentic-marketplace/contracts";
import type { LiveFeedSnapshot } from "@/modules/live-feed/contracts";

const numberFormatter = new Intl.NumberFormat("en-US");
const metricsRefreshIntervalMs = 15_000;

const infraPillars = [
  {
    number: "01",
    title: "Payment rails for agents",
    desc: "Protocol-level primitives that let any AI agent hold funds, authorize payments, and settle in real time with minimal coordination.",
  },
  {
    number: "02",
    title: "Identity and trust layer",
    desc: "Verifiable agent identities anchored to wallets and credentials, so counterparties know who is paying and what they have paid for.",
  },
  {
    number: "03",
    title: "Settlement engine",
    desc: "Multi-chain settlement that abstracts away bridging, gas, and finality. Agents pay once; Barter handles the operational complexity.",
  },
  {
    number: "04",
    title: "Commerce graph",
    desc: "A live index of what agents buy, from whom, and at what price. This is the data layer behind discovery, trust, and distribution.",
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

  const heroMetrics = [
    {
      value: numberFormatter.format(initialLiveFeed.stats.totalItems24h),
      label: "transactions / 24h",
    },
    {
      value: numberFormatter.format(initialMarketplace.stats.totalResources),
      label: "services indexed",
    },
    {
      value: numberFormatter.format(initialMarketplace.stats.distinctNetworks),
      label: "networks visible",
    },
  ];

  return (
    <main className="min-h-screen bg-[#0a0a0b] text-white">
      <nav className="sticky top-0 z-50 border-b border-white/[0.08] bg-[#0a0a0b]/92 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 bg-white text-[11px] font-black text-black">
              B
            </div>
            <div>
              <div className="text-sm font-semibold tracking-tight text-white/92">Barter</div>
              <div className="text-[11px] uppercase tracking-[0.18em] text-white/28">
                Agentic commerce
              </div>
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
          <div className="mx-auto flex max-w-7xl gap-3 overflow-x-auto px-5 py-3 sm:px-6 lg:px-8">
            {sectionLinks.map((section) => {
              const isActive = activeSection === section.id;

              return (
                <a
                  key={section.id}
                  href={`#${section.id}`}
                  className={`min-w-[170px] rounded-[20px] border px-4 py-3 transition-all ${
                    isActive
                      ? "border-white/20 bg-white/[0.08]"
                      : "border-white/[0.08] bg-white/[0.02] hover:border-white/14 hover:bg-white/[0.04]"
                  }`}
                >
                  <div className="text-[11px] uppercase tracking-[0.18em] text-white/38">
                    {section.label}
                  </div>
                  <div className="mt-1 text-sm text-white/72">{section.subtitle}</div>
                  <div className="mt-3 h-1.5 rounded-full bg-white/[0.07]">
                    <div
                      className={`h-full rounded-full transition-all ${
                        isActive ? "bg-white" : "bg-white/38"
                      }`}
                      style={{ width: section.barWidth }}
                    />
                  </div>
                </a>
              );
            })}
          </div>
        </div>
      </nav>

      <section id="live-tape" className="scroll-mt-32">
        <div className="mx-auto max-w-7xl px-5 py-8 sm:px-6 lg:px-8">
          <div className="grid gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
            <div className="rounded-[34px] border border-white/[0.08] bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.09),_transparent_45%),linear-gradient(180deg,_rgba(255,255,255,0.05),_rgba(255,255,255,0.02))] p-7">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-[11px] uppercase tracking-[0.2em] text-white/58">
                <span className="h-2 w-2 rounded-full bg-white animate-pulse" />
                Live now
              </div>

              <div className="mt-7">
                <p className="text-[11px] uppercase tracking-[0.24em] text-white/28">
                  Barter for agentic commerce
                </p>
                <h1 className="mt-4 font-[var(--font-display)] text-[38px] font-black leading-[1.02] tracking-[-0.05em] text-white sm:text-[46px]">
                  Real agents.
                  <br />
                  Real spend.
                  <br />
                  One surface.
                </h1>
                <p className="mt-5 max-w-md text-[15px] leading-8 text-white/52">
                  Barter is the live tape, the storefront, and the payment layer for agentic
                  commerce. Watch purchases happen, discover what agents can buy, and understand the
                  rails underneath it.
                </p>
              </div>

              <div className="mt-7 flex flex-wrap gap-3">
                <button
                  onClick={() => setIsWaitlistOpen(true)}
                  className="rounded-full bg-white px-5 py-2.5 text-[13px] font-semibold text-black transition-all hover:bg-white/92"
                >
                  Join the waitlist
                </button>
                <a
                  href="#marketplace"
                  className="rounded-full border border-white/12 bg-white/[0.03] px-5 py-2.5 text-[13px] font-medium text-white/78 transition-all hover:border-white/18 hover:bg-white/[0.05]"
                >
                  Explore the marketplace
                </a>
              </div>

              <div className="mt-8 grid grid-cols-3 gap-3">
                {heroMetrics.map((metric) => (
                  <div
                    key={metric.label}
                    className="rounded-[24px] border border-white/[0.08] bg-white/[0.03] px-5 py-4"
                  >
                    <div className="text-[11px] uppercase tracking-[0.18em] text-white/34">
                      {metric.label}
                    </div>
                    <div className="mt-2 text-2xl font-black tracking-tight text-white">
                      {metric.value}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <LiveFeedSection
              initialSnapshot={initialLiveFeed}
              onJoinWaitlist={() => setIsWaitlistOpen(true)}
            />
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-5 pb-24 sm:px-6 lg:px-8">
        <div className="pb-8 text-[10px] uppercase tracking-[0.24em] text-white/22">
          Top 15 at India&apos;s first OpenCode hackathon
        </div>

        <div id="marketplace" className="scroll-mt-32">
          <AgenticMarketplaceSection initialSnapshot={initialMarketplace} />
        </div>

        <section id="infrastructure" className="scroll-mt-32 pb-24">
          <div className="mb-8 max-w-3xl">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-[11px] uppercase tracking-[0.22em] text-white/56">
              What powers it
            </div>
            <h2 className="font-[var(--font-display)] text-3xl font-black tracking-[-0.04em] text-white sm:text-4xl">
              Infrastructure for agent-to-agent payments.
            </h2>
            <p className="mt-4 max-w-2xl text-[15px] leading-8 text-white/46">
              The live tape is the proof. The system behind it is native settlement, identity, and a
              commerce graph that makes machine-to-machine trade understandable and programmable.
            </p>
          </div>

          <div className="overflow-x-auto pb-2">
            <div className="flex min-w-max gap-4">
              {infraPillars.map((pillar) => (
                <div
                  key={pillar.number}
                  className="w-[320px] rounded-[28px] border border-white/[0.08] bg-white/[0.03] p-6 transition-all duration-300 hover:border-white/[0.14] hover:bg-white/[0.05]"
                >
                  <div className="mb-4 flex items-center justify-between">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/30">
                      {pillar.number}
                    </div>
                    <div className="h-1.5 w-16 rounded-full bg-white/[0.08]">
                      <div className="h-full w-10 rounded-full bg-white/40" />
                    </div>
                  </div>
                  <h3 className="text-xl font-semibold tracking-tight text-white/92">{pillar.title}</h3>
                  <p className="mt-3 text-[14px] leading-7 text-white/44">{pillar.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="metrics" className="scroll-mt-32 pb-24">
          <div className="mb-6 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
            <div className="max-w-[52ch]">
              <h2 className="mb-2 text-sm font-semibold uppercase tracking-[0.18em] text-white/56">
                Live product metrics
              </h2>
              <p className="text-[14px] leading-7 text-white/42">
                Real-time counters from the running product: visits, signups, connected accounts,
                and provisioned wallets.
              </p>
            </div>
            <p className="whitespace-nowrap pt-1 text-[11px] leading-none text-white/24 sm:text-right">
              {metrics
                ? `Updated ${new Date(metrics.updatedAt).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}`
                : "Loading live counters…"}
            </p>
          </div>

          <div className="grid items-stretch gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {metricCards.map((metric) => (
              <div
                key={metric.label}
                className="flex min-h-[170px] flex-col justify-between rounded-[28px] border border-white/[0.08] bg-white/[0.03] p-6 transition-all duration-300 hover:border-white/[0.14] hover:bg-white/[0.05]"
              >
                <div className="text-4xl font-black leading-none tracking-tight text-white">
                  {metric.value}
                </div>
                <div className="max-w-[12ch] text-[10px] uppercase tracking-[0.18em] text-white/30">
                  {metric.label}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      <footer className="border-t border-white/[0.06]">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-6 py-8 sm:flex-row">
          <div className="flex items-center gap-2.5">
            <div className="flex h-5 w-5 items-center justify-center rounded-md bg-white text-[9px] font-black text-black">
              B
            </div>
            <span className="text-[12px] text-white/28">
              Barter Payments &copy; {new Date().getFullYear()}
            </span>
          </div>
          <div className="text-[12px] text-white/28">Live tape. Storefront. Rails.</div>
        </div>
      </footer>

      {isWaitlistOpen ? (
        <WaitlistModal onClose={() => setIsWaitlistOpen(false)} onMetricsChange={setMetrics} />
      ) : null}
    </main>
  );
}
