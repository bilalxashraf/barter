import { createChainRegistry } from "@barter/chains";
import Link from "next/link";
import { redirect } from "next/navigation";

import { ensureWebBootstrap } from "@/lib/bootstrap";
import { getCurrentSession } from "@/lib/session";
import { getWebRuntime } from "@/lib/server";
import { hydrateWalletBalances } from "@/lib/wallet-balances";

import { createPayoutDestinationAction, createWalletAction } from "./actions";

const chainRegistry = createChainRegistry();
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  await ensureWebBootstrap();
  const runtime = getWebRuntime();
  const session = await getCurrentSession();

  if (!session) {
    redirect("/");
  }

  const workspace = await runtime.repository.getAccountWorkspace(session.accountId);

  if (!workspace) {
    redirect("/");
  }

  const chainOptions = chainRegistry.list();
  const walletBalances = await hydrateWalletBalances({
    wallets: workspace.wallets,
    allowlist: workspace.allowlist,
    config: runtime.config
  });
  const balanceByWalletId = new Map(walletBalances.map((entry) => [entry.walletId, entry]));
  const previewCommand = `@${runtime.config.NEXT_PUBLIC_BARTER_HANDLE} pay 5 USDC to @alice on base`;
  const manualEventExample = JSON.stringify(
    {
      source: "manual",
      events: [
        {
          id: "tweet-demo-001",
          text: previewCommand,
          authorHandle: workspace.account.primaryHandle ?? "@localbuilder",
          conversationId: "conversation-demo-001"
        }
      ]
    },
    null,
    2
  );

  return (
    <main className="shell">
      <div className="dashboard">
        <header>
          <div>
            <p className="eyebrow">Barter Console</p>
            <h1>{workspace.account.displayName}</h1>
            <p className="muted">
              {workspace.account.primaryHandle ?? session.handle ?? "@unknown"} is connected. Fund the
              default wallet, configure payout destinations, and use @
              {runtime.config.NEXT_PUBLIC_BARTER_HANDLE} mentions to trigger payments.
            </p>
          </div>
          <div className="actions">
            <span className="badge">{workspace.account.onboardingStatus}</span>
            <form action="/api/auth/logout" method="post">
              <button className="secondary" type="submit">
                Sign out
              </button>
            </form>
          </div>
        </header>

        <section className="dashboard-grid">
          <article className="panel">
            <h2>Channels</h2>
            <ul className="list">
              {workspace.channelAccounts.map((channel) => (
                <li key={channel.id}>
                  <strong>{channel.handle}</strong>
                  <div className="muted">External user ID: {channel.externalUserId}</div>
                </li>
              ))}
            </ul>
          </article>

          <article className="panel">
            <h2>Wallets</h2>
            <ul className="list">
              {workspace.wallets.length ? (
                workspace.wallets.map((wallet) => (
                  <li key={wallet.id}>
                    <strong>
                      {wallet.chainName} {wallet.isDefault ? "default" : "secondary"}
                    </strong>
                    <div className="muted">{wallet.address}</div>
                    <div className="muted">
                      {wallet.provider} via {wallet.custodyMode}
                    </div>
                    {balanceByWalletId.get(wallet.id)?.balances.length ? (
                      <div className="muted">
                        {balanceByWalletId
                          .get(wallet.id)
                          ?.balances.map((balance) => `${balance.amountFormatted} ${balance.symbol}`)
                          .join(" · ")}
                      </div>
                    ) : null}
                    {balanceByWalletId.get(wallet.id)?.error ? (
                      <div className="muted">{balanceByWalletId.get(wallet.id)?.error}</div>
                    ) : null}
                  </li>
                ))
              ) : (
                <li>No wallets provisioned yet.</li>
              )}
            </ul>
          </article>

          <article className="panel">
            <h2>Payout destinations</h2>
            <ul className="list">
              {workspace.payoutDestinations.length ? (
                workspace.payoutDestinations.map((destination) => (
                  <li key={destination.id}>
                    <strong>
                      {destination.chainName} {destination.isDefault ? "default" : "secondary"}
                    </strong>
                    <div className="muted">{destination.address}</div>
                    {destination.label ? <div className="muted">{destination.label}</div> : null}
                  </li>
                ))
              ) : (
                <li>No payout destinations configured yet.</li>
              )}
            </ul>
          </article>
        </section>

        <section className="dashboard-grid" style={{ marginTop: 20 }}>
          <article className="panel">
            <h2>Provision wallet</h2>
            <form className="form" action={createWalletAction}>
              <label>
                Chain
                <select name="chainName" defaultValue="base">
                  {chainOptions.map((chain) => (
                    <option key={chain.name} value={chain.name}>
                      {chain.name} ({chain.family})
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Attach address (optional)
                <input name="address" placeholder="Leave blank for custody-created wallet" />
              </label>
              <label className="checkbox">
                <input name="makeDefault" type="checkbox" defaultChecked />
                Mark as default wallet for this chain
              </label>
              <button type="submit">Save wallet</button>
            </form>
          </article>

          <article className="panel">
            <h2>Set payout destination</h2>
            <form className="form" action={createPayoutDestinationAction}>
              <label>
                Chain
                <select name="chainName" defaultValue="base">
                  {chainOptions.map((chain) => (
                    <option key={chain.name} value={chain.name}>
                      {chain.name} ({chain.family})
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Recipient address
                <input name="address" placeholder="0x..." required />
              </label>
              <label>
                Label
                <input name="label" placeholder="Treasury" />
              </label>
              <label className="checkbox">
                <input name="makeDefault" type="checkbox" defaultChecked />
                Mark as default payout destination
              </label>
              <button type="submit">Save payout destination</button>
            </form>
          </article>

          <article className="panel">
            <h2>Allowlist snapshot</h2>
            <ul className="list">
              {workspace.allowlist.map((entry) => (
                <li key={entry.id}>
                  <strong>
                    {entry.chainName} / {entry.symbol}
                  </strong>
                  <div className="muted">
                    {entry.tokenAddress ?? "Native asset"} · decimals {entry.decimals ?? "n/a"}
                  </div>
                </li>
              ))}
            </ul>
          </article>
        </section>

        <section className="dashboard-grid" style={{ marginTop: 20 }}>
          <article className="panel">
            <h2>Preview request</h2>
            <div className="code-block">
              <pre>{previewCommand}</pre>
            </div>
            <p className="muted">
              Preview this via <code>{`${runtime.config.NEXT_PUBLIC_API_BASE_URL}/api/payment-intents/preview`}</code>.
            </p>
          </article>

          <article className="panel">
            <h2>Manual event ingress</h2>
            <div className="code-block">
              <pre>{manualEventExample}</pre>
            </div>
            <p className="muted">
              POST this payload to <code>{`${runtime.config.NEXT_PUBLIC_API_BASE_URL}/api/x/events`}</code> to
              simulate a mention while the real X webhook is not wired.
            </p>
          </article>
        </section>

        <section className="panel" style={{ marginTop: 20 }}>
          <h2>Runtime notes</h2>
          <div className="callout">
            The web app stores user OAuth credentials and wallet settings. The API receives events and
            preview requests. The worker polls @
            {runtime.config.NEXT_PUBLIC_BARTER_HANDLE}, executes allowed payments, and posts the reply.
          </div>
          <div className="actions" style={{ marginTop: 16 }}>
            <Link href={runtime.config.NEXT_PUBLIC_API_BASE_URL} className="button secondary">
              Open API
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
