"use client";

import { useState } from "react";

const SOCIAL_POSTS = [
  {
    handle: "@prakash_vc",
    avatar: "P",
    color: "from-violet-500 to-purple-600",
    text: "Just told my AI agent to pay the invoice. It negotiated a 12% discount, split across 3 currencies, and settled in 40ms. Barter is insane.",
    time: "2m ago",
    likes: 841,
    platform: "𝕏",
  },
  {
    handle: "@nila.builds",
    avatar: "N",
    color: "from-pink-500 to-rose-600",
    text: "Agentic payments are the missing layer of the internet. Your AI doesn't just browse — it transacts. @BarterHQ is building exactly this.",
    time: "7m ago",
    likes: 1203,
    platform: "𝕏",
  },
  {
    handle: "@devrel_arjun",
    avatar: "D",
    color: "from-blue-500 to-cyan-500",
    text: "Deployed a Barter webhook in 10 mins. My agent now handles vendor payments end-to-end — no human approval needed. The future is already here.",
    time: "14m ago",
    likes: 592,
    platform: "𝕏",
  },
  {
    handle: "@meera.fintech",
    avatar: "M",
    color: "from-emerald-500 to-teal-600",
    text: "Barter isn't crypto, it isn't traditional fintech. It's AI-native payments infrastructure. First mover advantage is MASSIVE right now.",
    time: "22m ago",
    likes: 2187,
    platform: "𝕏",
  },
  {
    handle: "@karan.io",
    avatar: "K",
    color: "from-orange-500 to-amber-500",
    text: "My personal finance agent paid rent, rebalanced my portfolio, and sent 3 invoices while I was in a meeting. Barter waitlist >>> everything else.",
    time: "31m ago",
    likes: 977,
    platform: "𝕏",
  },
];

function WaitlistModal({ onClose }: { onClose: () => void }) {
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
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div className="relative w-full max-w-md animate-slide-up">
        <div className="relative rounded-2xl border border-white/10 bg-[#0d0d14] p-8 shadow-2xl">
          <button
            onClick={onClose}
            className="absolute right-4 top-4 text-white/40 hover:text-white/80 transition-colors text-2xl leading-none"
          >
            ×
          </button>

          {status === "success" ? (
            <div className="text-center py-4 animate-fade-in">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center mx-auto mb-4 text-2xl">
                ✓
              </div>
              <h3 className="text-2xl font-bold mb-2">You&apos;re in!</h3>
              <p className="text-white/50 text-sm">
                We&apos;ll reach out as soon as early access opens.
              </p>
            </div>
          ) : (
            <>
              <div className="mb-6">
                <div className="inline-flex items-center gap-2 rounded-full bg-violet-500/10 border border-violet-500/20 px-3 py-1 text-violet-400 text-xs font-medium mb-4">
                  <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse-slow" />
                  Limited early access
                </div>
                <h2 className="text-2xl font-bold mb-2">Join the waitlist</h2>
                <p className="text-white/50 text-sm leading-relaxed">
                  Be among the first to build with Barter — the agentic payments layer.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-3">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-white/30 outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/30 transition-all"
                />
                {status === "error" && (
                  <p className="text-red-400 text-xs">{errorMsg}</p>
                )}
                <button
                  type="submit"
                  disabled={status === "loading"}
                  className="w-full rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 py-3 text-sm font-semibold text-white transition-all hover:from-violet-500 hover:to-purple-500 hover:shadow-lg hover:shadow-violet-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {status === "loading" ? "Joining…" : "Request early access →"}
                </button>
              </form>

              <p className="mt-4 text-center text-xs text-white/25">
                No spam. Unsubscribe anytime.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function SocialCard({ post, delay }: { post: (typeof SOCIAL_POSTS)[0]; delay: number }) {
  return (
    <div
      className="group rounded-2xl border border-white/[0.06] bg-white/[0.03] p-5 transition-all duration-300 hover:border-violet-500/20 hover:bg-white/[0.05] hover:shadow-lg hover:shadow-violet-500/5"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-start gap-3 mb-3">
        <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${post.color} flex items-center justify-center text-sm font-bold flex-shrink-0`}>
          {post.avatar}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-white">{post.handle}</span>
            <span className="text-white/25 text-xs">{post.platform}</span>
          </div>
          <span className="text-white/25 text-xs">{post.time}</span>
        </div>
      </div>
      <p className="text-white/70 text-sm leading-relaxed">{post.text}</p>
      <div className="mt-3 flex items-center gap-1 text-white/25 text-xs">
        <span>♥</span>
        <span>{post.likes.toLocaleString()}</span>
      </div>
    </div>
  );
}

export default function Home() {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <main className="min-h-screen bg-[#020205] text-white overflow-x-hidden">
      {/* Background glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-violet-600/10 rounded-full blur-[120px]" />
        <div className="absolute top-1/2 -left-40 w-[400px] h-[400px] bg-purple-600/8 rounded-full blur-[100px]" />
        <div className="absolute top-1/2 -right-40 w-[400px] h-[400px] bg-blue-600/8 rounded-full blur-[100px]" />
      </div>

      <div className="relative z-10">
        {/* Nav */}
        <nav className="flex items-center justify-between px-6 py-5 max-w-6xl mx-auto">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-xs font-bold">
              B
            </div>
            <span className="font-semibold text-white">Barter</span>
          </div>
          <button
            onClick={() => setModalOpen(true)}
            className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/80 hover:border-violet-500/40 hover:text-white transition-all"
          >
            Join waitlist
          </button>
        </nav>

        {/* Hero */}
        <section className="px-6 pt-16 pb-20 max-w-4xl mx-auto text-center animate-fade-in">
          <div className="inline-flex items-center gap-2 rounded-full border border-violet-500/20 bg-violet-500/10 px-4 py-1.5 text-violet-400 text-xs font-medium mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse-slow" />
            Agentic payments · Private beta
          </div>

          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black leading-[1.05] tracking-tight mb-6">
            Payments that
            <br />
            <span className="bg-gradient-to-r from-violet-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              think for themselves
            </span>
          </h1>

          <p className="text-lg sm:text-xl text-white/50 max-w-2xl mx-auto mb-10 leading-relaxed">
            Barter is the infrastructure layer that lets AI agents transact autonomously — negotiate, pay, and settle across any network, in real time.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={() => setModalOpen(true)}
              className="group relative w-full sm:w-auto rounded-2xl bg-gradient-to-r from-violet-600 to-purple-600 px-8 py-4 text-base font-semibold text-white shadow-lg shadow-violet-500/25 transition-all hover:shadow-violet-500/40 hover:scale-[1.02] active:scale-[0.99]"
            >
              <span className="relative z-10">Get early access →</span>
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-violet-500 to-purple-500 opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
            <button className="w-full sm:w-auto rounded-2xl border border-white/10 bg-white/5 px-8 py-4 text-base font-medium text-white/70 hover:border-white/20 hover:text-white transition-all">
              Read the docs
            </button>
          </div>

          <p className="mt-5 text-white/25 text-sm">
            Trusted by engineers at OpenAI, Stripe, Razorpay &amp; more
          </p>
        </section>

        {/* Stats */}
        <section className="px-6 pb-20 max-w-4xl mx-auto">
          <div className="grid grid-cols-3 gap-px rounded-2xl overflow-hidden border border-white/[0.06] bg-white/[0.06]">
            {[
              { value: "40ms", label: "avg settlement" },
              { value: "180+", label: "currencies" },
              { value: "99.99%", label: "uptime SLA" },
            ].map((s) => (
              <div key={s.label} className="bg-[#020205] py-8 text-center">
                <div className="text-3xl font-black bg-gradient-to-r from-violet-400 to-purple-400 bg-clip-text text-transparent">
                  {s.value}
                </div>
                <div className="text-white/40 text-xs mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Features */}
        <section className="px-6 pb-24 max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-3">Built for the agentic era</h2>
            <p className="text-white/40 text-sm max-w-lg mx-auto">
              Modern AI agents need a payment layer that matches their speed and autonomy.
            </p>
          </div>
          <div className="grid sm:grid-cols-3 gap-4">
            {[
              {
                icon: "⚡",
                title: "Instant settlement",
                desc: "Sub-100ms payment rails so your agent never waits for confirmation.",
              },
              {
                icon: "🤝",
                title: "Agent-to-agent",
                desc: "Programmatic negotiation and settlement between AI systems.",
              },
              {
                icon: "🔒",
                title: "Spending limits",
                desc: "Granular policies — cap per transaction, category, or time window.",
              },
              {
                icon: "🌍",
                title: "Multi-currency",
                desc: "180+ currencies. FX handled automatically at best market rates.",
              },
              {
                icon: "🔗",
                title: "Any LLM",
                desc: "Works with GPT-4o, Claude, Gemini, Llama — framework agnostic.",
              },
              {
                icon: "📊",
                title: "Full audit trail",
                desc: "Every agent action is logged, explainable, and reversible.",
              },
            ].map((f) => (
              <div
                key={f.title}
                className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 hover:border-violet-500/20 hover:bg-white/[0.04] transition-all"
              >
                <div className="text-2xl mb-3">{f.icon}</div>
                <h3 className="font-semibold text-sm mb-1">{f.title}</h3>
                <p className="text-white/40 text-xs leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Social proof */}
        <section className="px-6 pb-24 max-w-4xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-2xl font-bold mb-2">People are talking</h2>
            <p className="text-white/40 text-sm">From developers and founders across the internet</p>
          </div>
          <div className="columns-1 sm:columns-2 lg:columns-3 gap-4 space-y-4">
            {SOCIAL_POSTS.map((post, i) => (
              <div key={post.handle} className="break-inside-avoid">
                <SocialCard post={post} delay={i * 80} />
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="px-6 pb-32 max-w-2xl mx-auto text-center">
          <div className="rounded-3xl border border-violet-500/20 bg-gradient-to-b from-violet-500/10 to-purple-500/5 p-12">
            <h2 className="text-3xl sm:text-4xl font-black mb-4">
              The agentic economy
              <br />
              <span className="bg-gradient-to-r from-violet-400 to-pink-400 bg-clip-text text-transparent">
                starts here
              </span>
            </h2>
            <p className="text-white/50 mb-8 text-sm max-w-sm mx-auto leading-relaxed">
              Join thousands of developers building the next wave of autonomous financial applications.
            </p>
            <button
              onClick={() => setModalOpen(true)}
              className="rounded-2xl bg-gradient-to-r from-violet-600 to-purple-600 px-10 py-4 text-base font-semibold text-white shadow-lg shadow-violet-500/30 hover:shadow-violet-500/50 hover:scale-[1.02] transition-all active:scale-[0.99]"
            >
              Join the waitlist →
            </button>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-white/[0.06] px-6 py-8 max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-md bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-[10px] font-bold">
              B
            </div>
            <span className="text-white/40 text-sm">Barter © 2025</span>
          </div>
          <div className="flex gap-6 text-white/30 text-xs">
            <span className="hover:text-white/60 cursor-pointer transition-colors">Privacy</span>
            <span className="hover:text-white/60 cursor-pointer transition-colors">Terms</span>
            <span className="hover:text-white/60 cursor-pointer transition-colors">𝕏 Twitter</span>
          </div>
        </footer>
      </div>

      {modalOpen && <WaitlistModal onClose={() => setModalOpen(false)} />}
    </main>
  );
}
