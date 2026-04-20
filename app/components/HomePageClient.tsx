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

const capabilityCards = [
  {
    icon: "◉",
    title: "Live agent commerce stream",
    desc: "Barter now surfaces a typed stream of real agent purchases without dropping the rest of the public beta funnel.",
  },
  {
    icon: "✳",
    title: "Waitlist-first rollout",
    desc: "The public site still captures demand while access to the deeper product remains controlled.",
  },
  {
    icon: "𝕏",
    title: "X-linked onboarding",
    desc: "Private beta accounts stay tied to an X handle so early users are anchored to a recognizable identity.",
  },
  {
    icon: "◎",
    title: "Wallet provisioning",
    desc: "Beta users can provision a Solana wallet and get ready for payment testing without exposing the full app publicly.",
  },
  {
    icon: "↗",
    title: "Payment links",
    desc: "Inbound payment-link flows remain part of the private beta for users testing how agents receive funds.",
  },
  {
    icon: "◌",
    title: "Real product signals",
    desc: "The counters stay wired to actual visits, waitlist signups, connected X accounts, and wallets.",
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
      label: "solana wallets created",
    },
  ];

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#05070b] text-white">
      <div className="absolute inset-x-0 top-0 -z-10 h-[640px] bg-[radial-gradient(circle_at_top_left,_rgba(251,191,36,0.18),_transparent_32%),radial-gradient(circle_at_75%_10%,_rgba(56,189,248,0.12),_transparent_30%)]" />

      <nav className="mx-auto flex max-w-6xl items-center justify-between gap-4 border-b border-white/[0.06] px-4 py-4 sm:px-6 sm:py-5">
        <div className="flex items-center gap-3">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white text-[11px] font-black text-black">
            B
          </div>
          <div>
            <div className="text-sm font-semibold tracking-tight">Barter</div>
            <div className="text-xs uppercase tracking-[0.18em] text-white/32">Agentic payments</div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <a
            href={X_PROFILE_URL}
            target="_blank"
            rel="noreferrer"
            className="hidden rounded-full border border-white/10 px-4 py-2 text-sm text-white/72 transition-all hover:border-white/20 hover:bg-white/[0.05] sm:inline-flex"
          >
            Follow on X ↗
          </a>
          <button
            onClick={() => setIsWaitlistOpen(true)}
            className="inline-flex items-center justify-center rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-black transition-all hover:bg-white/90"
          >
            Join waitlist
          </button>
        </div>
      </nav>

      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <LiveFeedSection
          initialSnapshot={initialLiveFeed}
          onJoinWaitlist={() => setIsWaitlistOpen(true)}
        />

        <div className="pb-8 text-xs uppercase tracking-[0.2em] text-white/28">
          Top 15 at India&apos;s first OpenCode hackathon
        </div>

        <section className="pb-20">
          <div className="mb-5 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
            <div className="max-w-[52ch]">
              <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-white/72">
                Live product metrics
              </h2>
              <p className="mt-2 text-sm text-white/34">
                The original Barter counters stay live: visits, waitlist signups, connected X
                accounts, and Solana wallets.
              </p>
            </div>
            <p className="whitespace-nowrap pt-1 text-xs leading-none text-white/22 sm:text-right">
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
                className="flex min-h-[196px] flex-col justify-between rounded-[30px] border border-white/[0.07] bg-white/[0.02] p-6"
              >
                <div className="text-4xl font-black leading-none text-white">{metric.value}</div>
                <div className="max-w-[12ch] text-xs uppercase tracking-[0.16em] text-white/32">
                  {metric.label}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="pb-24">
          <h2 className="mb-2 text-xl font-semibold">What the public Barter surface now does</h2>
          <p className="mb-8 text-sm text-white/34">
            The landing page now works as both a demand-capture funnel and a live proof point for
            agent commerce.
          </p>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {capabilityCards.map((card) => (
              <div
                key={card.title}
                className="rounded-[28px] border border-white/[0.07] p-5 transition-all hover:border-white/15"
              >
                <div className="mb-3 text-lg grayscale">{card.icon}</div>
                <h3 className="mb-2 text-sm font-semibold text-white/92">{card.title}</h3>
                <p className="text-xs leading-relaxed text-white/40">{card.desc}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="pb-24">
          <div className="mx-auto max-w-[980px]">
            <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div className="max-w-[560px]">
                <h2 className="mb-2 text-xl font-semibold">Posts and mentions on X</h2>
                <p className="text-sm text-white/34">
                  The rest of Barter&apos;s public signal stays here too: latest posts from
                  @barterpayments and a live public mention search.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs uppercase tracking-[0.16em] text-white/35 sm:justify-end">
                <a
                  href={X_PROFILE_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="whitespace-nowrap transition-colors hover:text-white"
                >
                  Profile →
                </a>
                <a
                  href={X_MENTIONS_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="whitespace-nowrap transition-colors hover:text-white"
                >
                  Mentions →
                </a>
              </div>
            </div>

            <div className="grid items-start gap-4 lg:grid-cols-2">
              <XPostsFeed />
              <XMentionsFeed />
            </div>
          </div>
        </section>

        <section className="pb-32 text-center">
          <div className="rounded-[34px] border border-white/[0.07] px-6 py-14 sm:px-12">
            <h2 className="mb-3 text-2xl font-black tracking-tight sm:text-3xl">
              The first live stream of agents buying stuff.
            </h2>
            <p className="mx-auto mb-8 max-w-xl text-sm leading-relaxed text-white/36">
              Real agents. Real spend. The waitlist is open while the stream runs in public.
            </p>
            <button
              onClick={() => setIsWaitlistOpen(true)}
              className="rounded-full bg-white px-8 py-3.5 text-sm font-semibold text-black transition-all hover:bg-white/90"
            >
              Join the waitlist →
            </button>
          </div>
        </section>
      </div>

      <footer className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 border-t border-white/[0.06] px-6 py-6 sm:flex-row">
        <div className="flex items-center gap-2">
          <div className="flex h-5 w-5 items-center justify-center rounded-md bg-white text-[9px] font-black text-black">
            B
          </div>
          <span className="text-xs text-white/30">Barter © {new Date().getFullYear()}</span>
        </div>
        <div className="flex gap-5 text-xs text-white/20">
          <a
            href={X_PROFILE_URL}
            target="_blank"
            rel="noreferrer"
            className="transition-colors hover:text-white/55"
          >
            𝕏 Twitter
          </a>
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
