import BackButton from '../components/BackButton';
import ProductCard from '../components/ProductCard';

const products = [
  {
    title: 'X-Listener Bot',
    text: 'Monitor and respond to X (Twitter) mentions autonomously. Execute onchain actions directly from social interactions.',
    live: true,
    howItWorks: [
      'Polls X API every 5 minutes for @barterpayments mentions',
      'Verifies user is registered at dashboard with API key',
      'Auto-detects chain (Solana or EVM) from user prompt',
      'Validates user has appropriate wallet with funds',
      'Filters spam - only processes actionable requests',
      'Executes transaction via Agent API',
      'Replies with transaction hash or helpful error message'
    ]
  },
  {
    title: 'Agent API Endpoints',
    text: 'Complete suite of endpoints for autonomous onchain execution. Swaps, transfers, wallet management - all via natural language.',
    live: true,
    howItWorks: [
      'Create agent wallet via /agent/wallets/create (CDP wallets)',
      'Fund wallet with ETH/tokens on supported chains',
      'Send natural language prompt: "swap 0.1 ETH to USDC"',
      'API parses intent using OpenAI',
      'Resolves tokens and gets best quote from aggregators',
      'Executes transaction server-side with agent wallet',
      'Returns transaction hash + execution details'
    ]
  },
  {
    title: 'Stripe Crypto Payment SDK',
    text: 'Accept crypto payments with Stripe-like simplicity. SDKs for seamless integration into your applications.',
    live: true,
    howItWorks: [
      'Create payment link via API with amount, token, and chain',
      'Get shareable URL + QR code instantly',
      'Customer scans QR or visits URL',
      'Pays directly to your wallet (non-custodial)',
      'Real-time payment verification on-chain',
      'Receive webhook notification when payment confirmed',
      'Automatic email alerts for paid/expired links'
    ]
  },
  {
    title: 'LLM Payment Gateway',
    text: 'Pay-per-use access to premium LLMs. Crypto-native payment infrastructure for AI model consumption.',
    live: true,
    howItWorks: [
      'Agent purchases credits with USDC/ETH from wallet',
      'Make LLM API call (GPT-4, Claude, etc.)',
      'Usage tracked: tokens consumed + cost calculated',
      'Auto-deducts from credit balance',
      'When balance low, auto-recharge from agent wallet',
      'Zero downtime - agent operates autonomously',
      'Full usage analytics and spending controls'
    ]
  }
];

const features = [
  {
    title: 'Agent Infrastructure',
    items: [
      'Per‑agent API keys',
      'Multi‑wallet orchestration',
      'NLP → onchain execution',
      'Audit‑friendly responses'
    ]
  },
  {
    title: 'Execution Layer',
    items: [
      'Swap + transfer automation',
      'ERC‑20 approvals handled',
      'Chain‑aware token resolution',
      'Quote + tx assembly'
    ]
  },
  {
    title: 'Observability',
    items: [
      'Request IDs everywhere',
      'Deterministic JSON outputs',
      'Production‑grade error format',
      'Signed tx broadcast endpoints'
    ]
  }
];

const docs = [
  {
    title: 'Quickstart',
    detail: 'Spin up the API and execute your first swap in minutes.'
  },
  {
    title: 'Agent Keys',
    detail: 'One API key per agent. Scoped access across all agent wallets.'
  },
  {
    title: 'Endpoints',
    detail: 'Quotes, balances, transfers, swaps, and limit orders.'
  }
];

export const metadata = {
  title: 'Barter Payments — Agentic Onchain Infrastructure',
  alternates: {
    canonical: 'https://www.barterpayments.xyz/'
  }
};

export default function HomePage() {
  return (
    <main>
      <section>
        <div className="container">
          <header className="nav">
            <div className="nav-left">
              <BackButton />
              <a className="nav-logo" href="/">
                <img src="/BarterPaymentLogo.png" alt="Barter Payments logo" width={36} height={36} />
                <span>Barter Payments</span>
              </a>
            </div>
            <nav className="nav-links">
              <a href="/use-via-barter">Use via Barter Payments</a>
              <a href="/dashboard">Terminal</a>
              <a href="/agent-commerce">Agent Commerce</a>
              <a href="/docs">Docs</a>
              <a href="/token">Token</a>
            </nav>
            <div className="nav-actions">
              <a className="nav-social" href="https://x.com/barterpayments" target="_blank" rel="noreferrer" aria-label="Barter Payments on X">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.507 11.24H16.32l-5.11-6.675-5.84 6.675H2.06l7.73-8.84L1.61 2.25h6.676l4.62 6.11 5.338-6.11Zm-1.162 17.52h1.833L6.68 4.126H4.72l12.362 15.645Z" />
                </svg>
                <span>@barterpayments</span>
              </a>
              <a className="button secondary" href="/docs">Get started</a>
            </div>
          </header>
          <div className="hero">
            <div>
              {/* <span className="pill">Barter Payments • Agent API</span> */}
              <h1><span className="accent-text">Barter Payments</span> - autonomous infrastructure for AI agents to discover, pay, and execute.</h1>
              <p>
                Execute onchain actions with natural language and route agents into real paid services with MPP. Barter Payments is evolving from payment rails into the growth layer for machine commerce.
              </p>
              <div className="hero-actions">
                <a className="button primary" href="/dashboard">Launch Terminal</a>
                <a className="button secondary" href="/use-via-barter">Explore MPP network</a>
              </div>
            </div>
            <div className="hero-card">
              <div className="hero-card-inner">
                <img src="/BarterPaymentLogo.png" alt="Barter Payments logo" width={72} height={72} />
                <h3>Built for Autonomous Agents</h3>
                <p>
                  Simple API. Natural language commands. Instant onchain execution.
                </p>
                <div className="stats">
                  <div className="stat">
                    <h3>4</h3>
                    <p>Live products ready to use</p>
                  </div>
                  <div className="stat">
                    <h3>5+</h3>
                    <p>Chains supported</p>
                  </div>
                  <div className="stat">
                    <h3>24/7</h3>
                    <p>Autonomous execution</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section>
        <div className="container">
          <div className="section-title">
            <h2>Use via Barter Payments</h2>
            <p>
              A new public surface for MPP adoption: curated services, polished live demos, merchant onboarding, and the content system needed to turn protocol support into demand.
            </p>
          </div>
          <div className="mpp-home-banner">
            <div>
              <span className="mpp-card-label">New launch surface</span>
              <p>
                Browse the first service registry, see the weather/search/browser/email/model demo stack, and use the merchant kit to bring more services into the Barter Payments network.
              </p>
            </div>
            <a className="button primary" href="/use-via-barter">Open the MPP page</a>
          </div>
        </div>
      </section>

      <section id="products">
        <div className="container">
          <div className="section-title">
            <h2>What we’ve built</h2>
            <p>Production-ready tools for autonomous AI agents. Each product is live and ready to use.</p>
          </div>
          <div className="card-grid">
            {products.map((product) => (
              <ProductCard key={product.title} product={product} />
            ))}
          </div>
        </div>
      </section>

      <section>
        <div className="container">
          <div className="section-title">
            <h2>Agent infrastructure</h2>
            <p>Purpose‑built for high‑frequency agent execution with deterministic routing and policy‑ready architecture.</p>
          </div>
          <div className="card-grid">
            {features.map((feature) => (
              <div className="card" key={feature.title}>
                <h4>{feature.title}</h4>
                <ul>
                  {feature.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="docs">
        <div className="container">
          <div className="section-title">
            <h2>Docs in one view</h2>
            <p>Structured, professional documentation that maps every endpoint and execution mode.</p>
          </div>
          <div className="docs-list">
            {docs.map((item) => (
              <div className="docs-item" key={item.title}>
                <strong>{item.title}</strong>
                <p>{item.detail}</p>
              </div>
            ))}
          </div>
          <div className="hero-actions" style={{ marginTop: 22 }}>
            <a className="button primary" href="/docs">Open full docs</a>
            <a className="button secondary" href="/docs#agent-execute">/agent/execute</a>
          </div>
          <div className="card" style={{ marginTop: 28 }}>
            <h4>Example: /agent/execute</h4>
            <div className="code-block">
              curl -s https://api.barterpayments.xyz/agent/execute \\
              <br />&nbsp;&nbsp;-H "Content-Type: application/json" \\
              <br />&nbsp;&nbsp;-H "X-API-Key: <span>ak_...</span>" \\
              <br />&nbsp;&nbsp;-d &#123;"agentId":"agent-001","walletNo":1,"prompt":"Swap 50% of my ETH to USDC on Base","chain":"base"&#125;
            </div>
          </div>
        </div>
      </section>

      <section>
        <div className="container">
          <div className="section-title">
            <h2>Built for production</h2>
            <p>Barter Payments ships with the foundations teams need to deploy autonomous onchain agents responsibly.</p>
          </div>
          <div className="card-grid">
            <div className="card">
              <h4>Policy‑ready</h4>
              <p>Budget limits, allowlists, and deterministic wallet selection can be layered directly on the API.</p>
            </div>
            <div className="card">
              <h4>Observability</h4>
              <p>Every response returns a request ID and structured error payloads for tracing and monitoring.</p>
            </div>
            <div className="card">
              <h4>Composable execution</h4>
              <p>Swap, transfer, and analysis endpoints can be composed into multi‑step agent workflows.</p>
            </div>
          </div>
        </div>
      </section>

      <footer className="footer">
        <div className="container footer-inner">
          <strong>Barter Payments</strong>
          <nav className="footer-links">
            <a href="/use-via-barter">Use via Barter Payments</a>
            <a href="/agent-commerce">Agent Commerce</a>
            <a href="/docs">Docs</a>
            <a href="/about">About</a>
            <a href="/contact">Contact</a>
            <a href="/legal/privacy">Privacy</a>
            <a href="/legal/terms">Terms</a>
          </nav>
        </div>
      </footer>
    </main>
  );
}
