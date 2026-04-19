"use client";

import { useEffect, useState } from "react";
import XTimelineEmbed from "./components/XTimelineEmbed";
import type { SiteMetrics } from "./_lib/siteMetrics.types";

const numberFormatter = new Intl.NumberFormat("en-US");

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

    async function loadMetrics() {
      try {
        const hasTrackedVisit = sessionStorage.getItem("barter:visit-tracked") === "1";
        const res = await fetch("/api/metrics", {
          method: hasTrackedVisit ? "GET" : "POST",
          cache: "no-store",
          credentials: "same-origin",
        });

        if (!res.ok) return;

        const data = (await res.json()) as { metrics?: SiteMetrics };
        if (!active || !data.metrics) return;

        if (!hasTrackedVisit) {
          sessionStorage.setItem("barter:visit-tracked", "1");
        }

        setMetrics(data.metrics);
      } catch {
        // no-op
      }
    }

    loadMetrics();

    return () => {
      active = false;
    };
  }, []);

  const metricCards = [
    {
      value: metrics ? numberFormatter.format(metrics.totalVisits) : "—",
      label: "real page visits",
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
      label: "users with solana wallets",
    },
  ];

  return (
    <main className="min-h-screen bg-black text-white overflow-x-hidden">

      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-5 max-w-5xl mx-auto border-b border-white/[0.06]">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-white flex items-center justify-center text-[10px] font-black text-black">
            B
          </div>
          <span className="font-semibold text-sm tracking-tight">Barter</span>
        </div>
        <div className="flex items-center gap-2">
          <a
            href="/home"
            className="rounded-full border border-white/10 px-4 py-1.5 text-xs text-white/50 hover:text-white hover:border-white/25 transition-all"
          >
            Explore
          </a>
          <button
            onClick={() => setModalOpen(true)}
            className="rounded-full bg-white text-black px-4 py-1.5 text-xs font-semibold hover:bg-white/90 transition-all"
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
            <a
              href="/home"
              className="w-full sm:w-auto rounded-2xl border border-white/10 px-8 py-3.5 text-sm text-white/50 hover:border-white/20 hover:text-white/80 transition-all text-center"
            >
              Explore →
            </a>
          </div>

          <p className="mt-6 text-white/20 text-xs">
            Trusted by engineers at OpenAI, Stripe, Razorpay &amp; more
          </p>
        </section>

        <section className="pb-12">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-5">
            <div>
              <h2 className="text-sm font-semibold tracking-[0.18em] uppercase text-white/65">Live metrics</h2>
              <p className="text-white/30 text-sm mt-2">
                Real counters from actual visits and waitlist signups.
              </p>
            </div>
            <p className="text-white/20 text-xs">
              {metrics ? `Updated ${new Date(metrics.updatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : "Loading live counters…"}
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {metricCards.map((metric) => (
              <div key={metric.label} className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-6">
                <div className="text-3xl font-black text-white">{metric.value}</div>
                <div className="text-white/30 text-xs mt-2 uppercase tracking-[0.16em]">{metric.label}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Stats */}
        <section className="pb-20">
          <div className="grid grid-cols-3 divide-x divide-white/[0.06] border border-white/[0.06] rounded-2xl overflow-hidden">
            {[
              { value: "40ms", label: "avg settlement" },
              { value: "180+", label: "currencies" },
              { value: "99.99%", label: "uptime SLA" },
            ].map((s) => (
              <div key={s.label} className="py-8 text-center">
                <div className="text-2xl font-black text-white">{s.value}</div>
                <div className="text-white/30 text-xs mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Features */}
        <section className="pb-24">
          <h2 className="text-xl font-semibold mb-2">Built for the agentic era</h2>
          <p className="text-white/30 text-sm mb-8">
            AI agents need a payment layer that matches their speed and autonomy.
          </p>
          <div className="grid sm:grid-cols-3 gap-3">
            {[
              { icon: "⚡", title: "Instant settlement", desc: "Sub-100ms rails so your agent never waits." },
              { icon: "🤝", title: "Agent-to-agent", desc: "Programmatic negotiation between AI systems." },
              { icon: "🔒", title: "Spending limits", desc: "Cap per transaction, category, or time window." },
              { icon: "🌍", title: "Multi-currency", desc: "180+ currencies, FX at best market rates." },
              { icon: "🔗", title: "Any LLM", desc: "GPT-4o, Claude, Gemini — framework agnostic." },
              { icon: "📊", title: "Full audit trail", desc: "Every action logged, explainable, reversible." },
            ].map((f) => (
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
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
            <div>
              <h2 className="text-xl font-semibold mb-2">Live on X</h2>
              <p className="text-white/30 text-sm">
                Public posts from @barterpayments, straight from the official X timeline.
              </p>
            </div>
            <a
              href="https://x.com/barterpayments"
              target="_blank"
              rel="noreferrer"
              className="text-sm text-white/45 hover:text-white transition-colors"
            >
              Open @barterpayments →
            </a>
          </div>
          <div className="rounded-[28px] border border-white/[0.07] bg-white/[0.02] p-3 sm:p-4">
            <XTimelineEmbed />
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
          <span className="text-white/30 text-xs">Barter © 2025</span>
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
