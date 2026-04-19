"use client";

import { useEffect, useState } from "react";
import XMentionsFeed from "./components/XMentionsFeed";
import XPostsFeed from "./components/XPostsFeed";
import type { SiteMetrics } from "./_lib/siteMetrics.types";

const numberFormatter = new Intl.NumberFormat("en-US");
const METRICS_REFRESH_INTERVAL_MS = 15000;
const X_PROFILE_URL = "https://x.com/barterpayments";
const X_MENTIONS_URL = "https://x.com/search?q=%40barterpayments&src=typed_query&f=live";

function WaitlistModal({
  onClose,
  onMetricsChange,
}: {
  onClose: () => void;
  onMetricsChange: (metrics: SiteMetrics) => void;
}) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setStatus("loading");
    setErrorMsg("");
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || "Something went wrong.");
        setStatus("error");
      } else {
        if (data.metrics) {
          onMetricsChange(data.metrics as SiteMetrics);
        }
        setStatus("success");
      }
    } catch {
      setErrorMsg("Network error. Please try again.");
      setStatus("error");
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
      <div className="relative w-full max-w-md animate-slide-up">
        <div className="relative rounded-2xl border border-white/10 bg-[#0a0a0a] p-8 shadow-2xl">
          <button
            onClick={onClose}
            className="absolute right-4 top-4 text-white/30 hover:text-white/70 transition-colors text-2xl leading-none"
          >
            ×
          </button>

          {status === "success" ? (
            <div className="text-center py-4 animate-fade-in">
              <div className="w-14 h-14 rounded-full border border-white/20 flex items-center justify-center mx-auto mb-4 text-xl text-white">
                ✓
              </div>
              <h3 className="text-xl font-semibold mb-2">You&apos;re in.</h3>
              <p className="text-white/40 text-sm">
                We&apos;ll reach out when early access opens.
              </p>
            </div>
          ) : (
            <>
              <div className="mb-6">
                <div className="inline-flex items-center gap-2 rounded-full border border-white/10 px-3 py-1 text-white/50 text-xs font-medium mb-4">
                  <span className="w-1.5 h-1.5 rounded-full bg-white/50 animate-pulse-slow" />
                  Limited early access
                </div>
                <h2 className="text-xl font-semibold mb-2">Join the waitlist</h2>
                <p className="text-white/40 text-sm leading-relaxed">
                  Be among the first to build with Barter.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-3">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-white/20 outline-none focus:border-white/30 transition-all"
                />
                {status === "error" && (
                  <p className="text-red-400 text-xs">{errorMsg}</p>
                )}
                <button
                  type="submit"
                  disabled={status === "loading"}
                  className="w-full rounded-xl bg-white text-black py-3 text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {status === "loading" ? "Joining…" : "Request early access →"}
                </button>
              </form>

              <p className="mt-4 text-center text-xs text-white/20">
                No spam. Unsubscribe anytime.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  const [modalOpen, setModalOpen] = useState(false);
  const [metrics, setMetrics] = useState<SiteMetrics | null>(null);

  useEffect(() => {
    let active = true;
    const visitState = window as Window & {
      __barterInitialVisitTracked?: boolean;
    };

    async function loadMetrics(methodOverride?: "GET" | "POST") {
      try {
        const method = methodOverride || (visitState.__barterInitialVisitTracked ? "GET" : "POST");
        const res = await fetch("/api/metrics", {
          method,
          cache: "no-store",
          credentials: "same-origin",
        });

        if (!res.ok) return;

        const data = (await res.json()) as { metrics?: SiteMetrics };
        if (!active || !data.metrics) return;

        if (method === "POST") {
          visitState.__barterInitialVisitTracked = true;
        }

        setMetrics(data.metrics);
      } catch {
        // no-op
      }
    }

    loadMetrics();

    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        void loadMetrics("GET");
      }
    }, METRICS_REFRESH_INTERVAL_MS);

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
      label: "x accounts connected",
    },
    {
      value: metrics ? numberFormatter.format(metrics.solanaWalletUsersCount) : "—",
      label: "solana wallets created",
    },
  ];

  const capabilityCards = [
    {
      icon: "✳",
      title: "Waitlist-first rollout",
      desc: "The public site is focused on signup capture and real demand signals while access stays controlled.",
    },
    {
      icon: "𝕏",
      title: "X-linked onboarding",
      desc: "Private beta accounts are tied to an X handle so early users can be onboarded with a recognizable identity.",
    },
    {
      icon: "◎",
      title: "Wallet provisioning",
      desc: "Beta users can provision a Solana wallet and get set up for payment testing without exposing the full app publicly.",
    },
    {
      icon: "↗",
      title: "Payment links",
      desc: "Inbound payment link flows are part of the private beta so early users can test receiving crypto payments.",
    },
    {
      icon: "◌",
      title: "Real product signals",
      desc: "The landing page counters are tied to actual visits, waitlist signups, connected accounts, and wallets.",
    },
    {
      icon: "◼",
      title: "Controlled access",
      desc: "The public deployment stays focused on the waitlist while the product stack evolves behind the scenes.",
    },
  ];

  return (
    <main className="min-h-screen bg-black text-white overflow-x-hidden">

      {/* Nav */}
      <nav className="flex items-center justify-between px-4 sm:px-6 py-4 sm:py-5 max-w-5xl mx-auto border-b border-white/[0.06] gap-4">
        <div className="flex items-center gap-3 shrink-0">
          <div className="w-6 h-6 rounded-md bg-white flex items-center justify-center text-[10px] font-black text-black">
            B
          </div>
          <span className="font-semibold text-sm tracking-tight">Barter</span>
        </div>
        <div className="flex items-center justify-end flex-1">
          <button
            onClick={() => setModalOpen(true)}
            className="inline-flex items-center justify-center whitespace-nowrap rounded-full bg-white text-black px-5 sm:px-6 py-2.5 text-sm font-semibold hover:bg-white/90 transition-all"
          >
            Join waitlist
          </button>
        </div>
      </nav>

      <div className="relative z-10 max-w-5xl mx-auto px-6">

        {/* Hero */}
        <section className="pt-24 pb-20 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 px-3 py-1 text-white/40 text-xs mb-10">
            <span className="w-1.5 h-1.5 rounded-full bg-white/40 animate-pulse-slow" />
            Agentic payments · Private beta
          </div>

          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black leading-[1.05] tracking-tight mb-6">
            Payments that
            <br />
            <span className="text-white/30">think for themselves</span>
          </h1>

          <p className="text-base sm:text-lg text-white/40 max-w-xl mx-auto mb-10 leading-relaxed">
            Barter lets AI agents transact autonomously — negotiate, pay, and settle across any network, in real time.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={() => setModalOpen(true)}
              className="w-full sm:w-auto rounded-2xl bg-white text-black px-8 py-3.5 text-sm font-semibold hover:bg-white/90 transition-all"
            >
              Get early access →
            </button>
          </div>

          <p className="mt-6 text-white/30 text-xs tracking-[0.08em] uppercase">
            Top 15 at India&apos;s first OpenCode hackathon
          </p>
        </section>

        <section className="pb-20">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-5">
            <div>
              <h2 className="text-sm font-semibold tracking-[0.18em] uppercase text-white/65">Live metrics</h2>
              <p className="text-white/30 text-sm mt-2">
                Live counters for traffic, waitlist demand, connected X accounts, and wallets created during the beta.
              </p>
            </div>
            <p className="text-white/20 text-xs sm:text-right">
              {metrics ? `Updated ${new Date(metrics.updatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : "Loading live counters…"}
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-3 items-stretch">
            {metricCards.map((metric) => (
              <div
                key={metric.label}
                className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-6 min-h-[188px] flex flex-col justify-between"
              >
                <div className="text-4xl font-black text-white leading-none">{metric.value}</div>
                <div className="text-white/30 text-xs uppercase tracking-[0.16em] leading-relaxed max-w-[10ch]">
                  {metric.label}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Features */}
        <section className="pb-24">
          <h2 className="text-xl font-semibold mb-2">What the private beta includes</h2>
          <p className="text-white/30 text-sm mb-8">
            Barter is currently focused on early onboarding, wallet setup, and payment primitives for a controlled beta rollout.
          </p>
          <div className="grid sm:grid-cols-3 gap-3">
            {capabilityCards.map((f) => (
              <div
                key={f.title}
                className="rounded-2xl border border-white/[0.07] p-5 hover:border-white/15 transition-all"
              >
                <div className="text-lg mb-2 grayscale">{f.icon}</div>
                <h3 className="text-sm font-semibold mb-1 text-white/90">{f.title}</h3>
                <p className="text-white/35 text-xs leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Social proof */}
        <section className="pb-24">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between mb-8">
            <div>
              <h2 className="text-xl font-semibold mb-2">Posts and mentions on X</h2>
              <p className="text-white/30 text-sm">
                Latest posts from @barterpayments, plus a live X search for public mentions of the account.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm sm:justify-end sm:max-w-[320px]">
              <a
                href={X_PROFILE_URL}
                target="_blank"
                rel="noreferrer"
                className="text-white/45 hover:text-white transition-colors whitespace-nowrap"
              >
                Open @barterpayments →
              </a>
              <a
                href={X_MENTIONS_URL}
                target="_blank"
                rel="noreferrer"
                className="text-white/45 hover:text-white transition-colors whitespace-nowrap"
              >
                Open live mentions →
              </a>
            </div>
          </div>
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] items-stretch">
            <XPostsFeed />
            <XMentionsFeed />
          </div>
        </section>

        {/* CTA */}
        <section className="pb-32 text-center">
          <div className="rounded-2xl border border-white/[0.07] p-12">
            <h2 className="text-2xl sm:text-3xl font-black mb-3 tracking-tight">
              The agentic economy
              <br />
              <span className="text-white/30">starts here.</span>
            </h2>
            <p className="text-white/35 mb-8 text-sm max-w-xs mx-auto leading-relaxed">
              Join developers building the next wave of autonomous financial applications.
            </p>
            <button
              onClick={() => setModalOpen(true)}
              className="rounded-2xl bg-white text-black px-8 py-3.5 text-sm font-semibold hover:bg-white/90 transition-all"
            >
              Join the waitlist →
            </button>
          </div>
        </section>
      </div>

      {/* Footer */}
      <footer className="border-t border-white/[0.06] px-6 py-6 max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-md bg-white flex items-center justify-center text-[9px] font-black text-black">B</div>
          <span className="text-white/30 text-xs">Barter © {new Date().getFullYear()}</span>
        </div>
        <div className="flex gap-5 text-white/20 text-xs">
          <a href="https://x.com/barterpayments" target="_blank" rel="noreferrer" className="hover:text-white/50 transition-colors">𝕏 Twitter</a>
        </div>
      </footer>

      {modalOpen && (
        <WaitlistModal
          onClose={() => setModalOpen(false)}
          onMetricsChange={setMetrics}
        />
      )}
    </main>
  );
}
