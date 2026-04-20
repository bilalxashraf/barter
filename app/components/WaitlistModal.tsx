"use client";

import { useState, type FormEvent } from "react";
import type { SiteMetrics } from "@/app/_lib/siteMetrics.types";

export function WaitlistModal({
  onClose,
  onMetricsChange,
}: {
  onClose: () => void;
  onMetricsChange: (metrics: SiteMetrics) => void;
}) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!email.trim()) return;

    setStatus("loading");
    setErrorMsg("");

    try {
      const response = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });

      const data = (await response.json()) as {
        error?: string;
        metrics?: SiteMetrics;
      };

      if (!response.ok) {
        setErrorMsg(data.error || "Something went wrong.");
        setStatus("error");
        return;
      }

      if (data.metrics) {
        onMetricsChange(data.metrics);
      }

      setStatus("success");
    } catch {
      setErrorMsg("Network error. Please try again.");
      setStatus("error");
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={(event) => event.target === event.currentTarget && onClose()}
    >
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
      <div className="relative w-full max-w-md animate-slide-up">
        <div className="relative rounded-[28px] border border-white/10 bg-[#090b10] p-8 shadow-2xl">
          <button
            onClick={onClose}
            className="absolute right-4 top-4 text-2xl leading-none text-white/30 transition-colors hover:text-white/70"
          >
            ×
          </button>

          {status === "success" ? (
            <div className="animate-fade-in py-4 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-emerald-400/30 bg-emerald-400/10 text-xl text-emerald-200">
                ✓
              </div>
              <h3 className="mb-2 text-xl font-semibold">You&apos;re in.</h3>
              <p className="text-sm text-white/45">
                We&apos;ll reach out when early access opens.
              </p>
            </div>
          ) : (
            <>
              <div className="mb-6">
                <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 px-3 py-1 text-xs font-medium text-white/50">
                  <span className="h-1.5 w-1.5 animate-pulse-slow rounded-full bg-emerald-300" />
                  Limited early access
                </div>
                <h2 className="mb-2 text-xl font-semibold">Join the Barter waitlist</h2>
                <p className="text-sm leading-relaxed text-white/45">
                  We&apos;re onboarding teams building agent-native payment flows first.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-3">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@company.com"
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition-all placeholder:text-white/20 focus:border-white/30"
                />
                {status === "error" ? (
                  <p className="text-xs text-red-400">{errorMsg}</p>
                ) : null}
                <button
                  type="submit"
                  disabled={status === "loading"}
                  className="w-full rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-black transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {status === "loading" ? "Joining..." : "Request early access →"}
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
