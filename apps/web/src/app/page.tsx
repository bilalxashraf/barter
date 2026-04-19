import Link from "next/link";
import { redirect } from "next/navigation";

import { getCurrentSession } from "@/lib/session";
import { getWebRuntime } from "@/lib/server";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const session = await getCurrentSession();

  if (session) {
    redirect("/dashboard");
  }

  const runtime = getWebRuntime();

  return (
    <main className="shell">
      <div className="hero">
        <section className="hero-card">
          <p className="eyebrow">BarterPayments</p>
          <h1 className="title">Crypto payments that start from an X mention.</h1>
          <p className="subtitle">
            Connect with X, provision a real wallet, fund it, and let <strong>@barterpayments</strong>{" "}
            parse payment commands, execute onchain transfers, and reply back with status.
          </p>
          <div className="actions">
            <Link href="/api/auth/x/start" className="button">
              Connect X
            </Link>
            <a href={runtime.config.NEXT_PUBLIC_API_BASE_URL} className="button secondary">
              API Base
            </a>
          </div>
        </section>

        <section className="hero-grid">
          <article className="stat hero-card">
            <strong>X listener</strong>
            <span className="muted">
              The worker polls mentions for @barterpayments, normalizes tweets into intents, and keeps
              duplicate delivery idempotent.
            </span>
          </article>
          <article className="stat hero-card">
            <strong>Real wallets</strong>
            <span className="muted">
              Each onboarded account gets its own chain-specific wallet and sees live balances on the
              dashboard.
            </span>
          </article>
          <article className="stat hero-card">
            <strong>Execution + reply</strong>
            <span className="muted">
              Payments are evaluated asynchronously, sent with the configured custody path, and replied
              to on X from the Barter handle.
            </span>
          </article>
        </section>
      </div>
    </main>
  );
}
