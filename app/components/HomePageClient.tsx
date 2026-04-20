"use client";

import { useEffect, useState } from "react";
import type { SiteMetrics } from "@/app/_lib/siteMetrics.types";
import type { LiveFeedSnapshot } from "@/modules/live-feed/contracts";
import { WaitlistModal } from "@/app/components/WaitlistModal";
import { LiveFeedSection } from "@/app/components/live-feed/LiveFeedSection";
import XMentionsFeed from "@/app/components/XMentionsFeed";
import XPostsFeed from "@/app/components/XPostsFeed";

const numberFormatter = new Intl.NumberFormat("en-US");
const metricsRefreshIntervalMs = 15_000;
const X_PROFILE_URL = "https://x.com/barterpayments";
const X_MENTIONS_URL = "https://x.com/search?q=%40barterpayments&src=typed_query&f=live";

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

const capabilityCards = [
  {
    title: "Live commerce stream",
    desc: "A typed feed of real agent purchases streaming in the open — proof that autonomous commerce is already happening.",
  },
  {
    title: "Waitlist-first rollout",
    desc: "The public site captures demand while deeper product access stays controlled and intentional.",
  },
  {
    title: "X-linked onboarding",
    desc: "Beta accounts anchored to X handles give early users a recognizable, portable identity.",
  },
  {
    title: "Wallet provisioning",
    desc: "Provision a Solana wallet and prepare for payment testing without exposing the full platform.",
  },
  {
    title: "Payment links",
    desc: "Inbound payment-link flows for testing how agents receive and route funds.",
  },
  {
    title: "Real product signals",
    desc: "Counters wired to actual visits, signups, connected accounts, and wallets — not vanity metrics.",
  },
];

export function HomePageClient({
  initialLiveFeed,
}: {
  initialLiveFeed: LiveFeedSnapshot;
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
    <main className="min-h-screen overflow-x-hidden bg-[#030308] text-white">
      {/* Background layers */}
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_10%_-20%,_rgba(139,92,246,0.12),_transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_90%_10%,_rgba(56,189,248,0.08),_transparent_45%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_40%_at_50%_100%,_rgba(251,191,36,0.06),_transparent_50%)]" />
        <div className="absolute inset-0 opacity-[0.03] bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMSIgY3k9IjEiIHI9IjEiIGZpbGw9IndoaXRlIi8+PC9zdmc+')]" />
      </div>

      {/* Nav */}
      <nav className="sticky top-0 z-40 border-b border-white/[0.06] bg-[#030308]/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="relative flex h-8 w-8 items-center justify-center rounded-lg bg-white text-[12px] font-black text-black">
              B
              <div className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full border border-[#030308] bg-emerald-400" />
            </div>
            <div>
              <div className="text-sm font-semibold tracking-tight">Barter</div>
              <div className="text-[10px] uppercase tracking-[0.22em] text-white/28">AI payments infrastructure</div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <a
              href={X_PROFILE_URL}
              target="_blank"
              rel="noreferrer"
              className="hidden items-center gap-2 rounded-full border border-white/8 px-4 py-2 text-[13px] text-white/55 transition-all hover:border-white/15 hover:text-white/80 sm:inline-flex"
            >
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
              Follow
            </a>
            <button
              onClick={() => setIsWaitlistOpen(true)}
              className="group relative inline-flex items-center justify-center overflow-hidden rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-black transition-all hover:shadow-[0_0_24px_rgba(255,255,255,0.15)]"
            >
              Join waitlist
            </button>
          </div>
        </div>
      </nav>

      <div className="mx-auto max-w-6xl px-5 sm:px-6">
        {/* Live Feed Section */}
        <LiveFeedSection
          initialSnapshot={initialLiveFeed}
          onJoinWaitlist={() => setIsWaitlistOpen(true)}
        />

        {/* Hackathon badge */}
        <div className="pb-6 text-[10px] uppercase tracking-[0.25em] text-white/20">
          Top 15 at India&apos;s first OpenCode hackathon
        </div>

        {/* ── INFRASTRUCTURE VISION ── */}
        <section className="relative pb-28">
          <div className="absolute -left-[20%] top-1/3 h-[500px] w-[500px] rounded-full bg-violet-500/[0.04] blur-[120px]" />
          <div className="absolute -right-[15%] top-1/2 h-[400px] w-[400px] rounded-full bg-amber-500/[0.04] blur-[100px]" />

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

        {/* ── DIVIDER ── */}
        <div className="mx-auto mb-24 h-px max-w-lg bg-gradient-to-r from-transparent via-white/10 to-transparent" />

        {/* ── LIVE PRODUCT METRICS ── */}
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

        {/* ── WHAT THE SURFACE DOES ── */}
        <section className="pb-28">
          <h2 className="mb-2 text-lg font-semibold tracking-tight">What the public surface does today</h2>
          <p className="mb-8 max-w-xl text-[13px] leading-7 text-white/30">
            While we build the infrastructure layer, the public site works as both a demand-capture
            funnel and a live proof point for agent commerce.
          </p>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {capabilityCards.map((card) => (
              <div
                key={card.title}
                className="group rounded-[22px] border border-white/[0.06] bg-white/[0.015] p-5 transition-all duration-300 hover:border-white/[0.1] hover:bg-white/[0.025]"
              >
                <h3 className="mb-2 text-[14px] font-semibold text-white/85 transition-colors duration-300 group-hover:text-white">
                  {card.title}
                </h3>
                <p className="text-[12px] leading-[1.7] text-white/35">{card.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── DIVIDER ── */}
        <div className="mx-auto mb-24 h-px max-w-lg bg-gradient-to-r from-transparent via-white/10 to-transparent" />

        {/* ── X POSTS / MENTIONS ── */}
        <section className="pb-28">
          <div className="mx-auto max-w-[980px]">
            <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div className="max-w-[560px]">
                <h2 className="mb-2 text-lg font-semibold tracking-tight">Posts and mentions on X</h2>
                <p className="text-[13px] leading-7 text-white/30">
                  Latest public updates from @barterpayments and live mentions from the community.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[11px] uppercase tracking-[0.16em] text-white/30 sm:justify-end">
                <a
                  href={X_PROFILE_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="whitespace-nowrap transition-colors hover:text-white/70"
                >
                  Profile
                </a>
                <a
                  href={X_MENTIONS_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="whitespace-nowrap transition-colors hover:text-white/70"
                >
                  Mentions
                </a>
              </div>
            </div>

            <div className="grid items-start gap-4 lg:grid-cols-2">
              <XPostsFeed />
              <XMentionsFeed />
            </div>
          </div>
        </section>

        {/* ── CTA ── */}
        <section className="pb-32">
          <div className="relative overflow-hidden rounded-[32px] border border-white/[0.07] bg-white/[0.02] px-6 py-16 text-center sm:px-12">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_120%,_rgba(139,92,246,0.08),_transparent_60%)]" />
            <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-violet-400/20 to-transparent" />
            <div className="relative">
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/8 bg-white/[0.03] px-4 py-1.5 text-[11px] font-medium uppercase tracking-[0.2em] text-white/40">
                <span className="h-1.5 w-1.5 animate-pulse-slow rounded-full bg-emerald-400" />
                Waitlist open
              </div>
              <h2 className="mb-4 text-3xl font-black tracking-tight sm:text-4xl">
                The infrastructure for
                <br />
                <span className="bg-gradient-to-r from-amber-200 via-white to-violet-300 bg-clip-text text-transparent">
                  AI Payments
                </span>
                {" "}starts here.
              </h2>
              <p className="mx-auto mb-8 max-w-xl text-[14px] leading-8 text-white/32">
                Real agents. Real spend. The live stream runs in public while we build the payment
                rails underneath. Join the waitlist to get early access.
              </p>
              <button
                onClick={() => setIsWaitlistOpen(true)}
                className="rounded-full bg-white px-8 py-3.5 text-sm font-semibold text-black transition-all hover:shadow-[0_0_32px_rgba(255,255,255,0.12)]"
              >
                Join the waitlist
              </button>
            </div>
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
            <span className="text-[12px] text-white/25">Barter Payments © {new Date().getFullYear()}</span>
          </div>
          <div className="flex items-center gap-6 text-[12px] text-white/18">
            <a
              href={X_PROFILE_URL}
              target="_blank"
              rel="noreferrer"
              className="transition-colors hover:text-white/50"
            >
              X / Twitter
            </a>
            <span className="text-white/8">|</span>
            <span>AI Payments Infrastructure</span>
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
