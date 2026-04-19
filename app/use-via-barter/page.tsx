import BackButton from '../components/BackButton';

const services = [
  {
    title: 'Weather & Data',
    description: 'OpenWeather via Locus turns weather lookups into paid machine-to-machine API calls.',
    services: ['OpenWeather', 'AviationStack', 'Google Maps'],
    bestFor: 'Planning, logistics, and real-world agent context.',
    outcome: 'Agents pay only when they need fresh external data.'
  },
  {
    title: 'Search & Research',
    description: 'Search, retrieval, and structured extraction without prepaid vendor accounts.',
    services: ['Parallel', 'Brave Search', 'Exa', 'Firecrawl'],
    bestFor: 'Research agents, lead gen, and web intelligence.',
    outcome: 'One spend rail across search, browsing, and extraction.'
  },
  {
    title: 'Browsing & Execution',
    description: 'Use paid browsing and execution tools when the task requires real web state.',
    services: ['Browserbase', 'Oxylabs', 'Build With Locus'],
    bestFor: 'Web automation, browser tasks, and ephemeral infra.',
    outcome: 'Agents buy capability only at the moment of execution.'
  },
  {
    title: 'Messaging & Outreach',
    description: 'Email and communication services that an agent can trigger without manual billing setup.',
    services: ['AgentMail', 'StableEmail', 'StablePhone'],
    bestFor: 'Outbound workflows, inboxes, replies, and notifications.',
    outcome: 'A sales or support agent can run as a business process, not a demo.'
  },
  {
    title: 'Models & Media',
    description: 'Switch between model providers and media endpoints while keeping one payment control plane.',
    services: ['OpenAI', 'Anthropic', 'OpenRouter', 'Groq', 'fal.ai'],
    bestFor: 'Inference routing, media generation, and fallback strategies.',
    outcome: 'Barter Payments becomes the router between agents and paid intelligence.'
  }
];

const demos = [
  {
    title: 'Weather Ops',
    eyebrow: 'Live demo 01',
    summary: 'Agent geocodes a city, pays OpenWeather over MPP, and returns live conditions.',
    service: 'OpenWeather via Locus',
    outcome: 'Shows the end-to-end `402 -> pay -> retry` flow on a real external service.'
  },
  {
    title: 'Research Sprint',
    eyebrow: 'Live demo 02',
    summary: 'Agent buys search + extraction in sequence to answer a time-sensitive research task.',
    service: 'Parallel / Brave / Firecrawl',
    outcome: 'Shows that MPP is not a single endpoint trick, but a multi-service workflow.'
  },
  {
    title: 'Browser Task',
    eyebrow: 'Live demo 03',
    summary: 'Agent opens a paid browser session only when a task needs real interaction.',
    service: 'Browserbase',
    outcome: 'Demonstrates execution-grade tooling instead of simple data retrieval.'
  },
  {
    title: 'Email Action',
    eyebrow: 'Live demo 04',
    summary: 'Agent creates or uses an inbox, drafts a reply, and sends a message with machine payment.',
    service: 'AgentMail / StableEmail',
    outcome: 'Turns MPP into a business workflow rather than an API benchmark.'
  },
  {
    title: 'Model Router',
    eyebrow: 'Live demo 05',
    summary: 'Agent selects the right paid model endpoint for a task and settles the request through Barter Payments.',
    service: 'OpenAI / Anthropic / OpenRouter',
    outcome: 'Makes the case that Barter Payments is the spend and routing layer for agent intelligence.'
  }
];

const merchantSteps = [
  {
    title: 'Publish',
    text: 'Create a merchant profile with pricing, endpoint metadata, supported assets, and one canonical “use via Barter Payments” listing.'
  },
  {
    title: 'Integrate',
    text: 'Drop in a payment-aware wrapper or use the Barter Payments API surface so your endpoint accepts MPP requests without a custom billing layer.'
  },
  {
    title: 'Grow',
    text: 'Get distribution through the public registry, demo pages, and agent-ready snippets that make your service easier to adopt.'
  }
];

const dashboardMetrics = [
  { label: 'Merchant revenue', value: '$2,840', delta: '+18% WoW' },
  { label: 'Paid requests', value: '14,218', delta: '+31% WoW' },
  { label: 'Top endpoint', value: '/openweather/current-weather', delta: '21% of volume' },
  { label: 'Agent retention', value: '67%', delta: '7-day repeat usage' }
];

const comparison = [
  {
    title: 'Without Barter Payments',
    points: [
      'Developers hunt through docs, links, and payment setup for each vendor.',
      'Agents need vendor-specific accounts, credits, and fragmented billing.',
      'Merchants get protocol support but not distribution, packaging, or demos.'
    ]
  },
  {
    title: 'With Barter Payments',
    points: [
      'Agents discover live MPP services in one curated surface.',
      'Paid requests route through one execution layer with wallet, limits, and receipts.',
      'Merchants get onboarding, demos, operator docs, and a repeatable demand channel.'
    ]
  }
];

const storyboard = [
  {
    title: 'Clip 01',
    text: 'Open with the old world: API keys, dashboards, credits, and vendor sprawl.'
  },
  {
    title: 'Clip 02',
    text: 'Cut to an Barter Payments agent hitting a paid endpoint, receiving a `402`, settling on Tempo, and completing automatically.'
  },
  {
    title: 'Clip 03',
    text: 'End on the registry and merchant dashboard: discovery on one side, revenue on the other.'
  }
];

const nodeSnippet = `import { fetchWithAgentMpp } from '@/app/_lib/agentApi';

const result = await fetchWithAgentMpp(agentId, apiKey, {
  url: 'https://openweather.mpp.paywithlocus.com/openweather/current-weather',
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: {
    lat: 12.9716,
    lon: 77.5946,
    units: 'metric',
    lang: 'en'
  }
});

console.log(result.response.bodyJson);`;

const curlSnippet = `curl -X POST "$AGENT_API_BASE/agent/mpp/fetch" \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: $API_KEY" \\
  -d "{
    \\"agentId\\": \\"$AGENT_ID\\",
    \\"url\\": \\"https://openweather.mpp.paywithlocus.com/openweather/current-weather\\",
    \\"method\\": \\"POST\\",
    \\"headers\\": {
      \\"Content-Type\\": \\"application/json\\"
    },
    \\"body\\": {
      \\"lat\\": 12.9716,
      \\"lon\\": 77.5946,
      \\"units\\": \\"metric\\",
      \\"lang\\": \\"en\\"
    }
  }"`;

export const metadata = {
  title: 'Use via Barter Payments — MPP Services, Demos, and Merchant Onboarding',
  description: 'Discover top MPP services, watch the Barter Payments live demo stack, and onboard merchants into a payment-aware registry for AI agents.',
  alternates: {
    canonical: 'https://www.barterpayments.xyz/use-via-barter'
  }
};

export default function UseViaBarterPage() {
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
              <a href="/dashboard">Terminal</a>
              <a href="/agent-commerce">Agent Commerce</a>
              <a href="/docs">Docs</a>
              <a href="/use-via-barter">Use via Barter Payments</a>
            </nav>
            <div className="nav-actions">
              <a className="button secondary" href="#merchant-kit">Onboard merchant</a>
            </div>
          </header>

          <div className="hero mpp-hero">
            <div>
              <span className="pill">New • Use via Barter Payments</span>
              <h1>Turn MPP support into distribution, demos, and merchant revenue.</h1>
              <p>
                Barter Payments should not just settle machine payments. It should be the public surface where agents discover
                services, operators watch live demos, and merchants get onboarded with copy-paste integration paths.
              </p>
              <div className="hero-actions">
                <a className="button primary" href="#registry">Browse top services</a>
                <a className="button secondary" href="#demos">View live demo stack</a>
              </div>
              <div className="mpp-inline-points">
                <span>Discovery-first</span>
                <span>Demo-ready</span>
                <span>Merchant growth loop</span>
              </div>
            </div>

            <div className="hero-card mpp-hero-card">
              <div className="hero-card-inner">
                <span className="mpp-card-label">What ships first</span>
                <h3>The public growth layer for MPP</h3>
                <div className="mpp-launch-grid">
                  <div className="mpp-launch-item">
                    <strong>Registry</strong>
                    <p>Curated top services with agent-ready routes.</p>
                  </div>
                  <div className="mpp-launch-item">
                    <strong>Live demos</strong>
                    <p>Weather, search, browsing, email, and models.</p>
                  </div>
                  <div className="mpp-launch-item">
                    <strong>Merchant kit</strong>
                    <p>Copy-paste onboarding and integration snippets.</p>
                  </div>
                  <div className="mpp-launch-item">
                    <strong>Revenue view</strong>
                    <p>Mock dashboard to sell the merchant upside.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="registry">
        <div className="container">
          <div className="mpp-section-shell">
            <div className="section-title">
              <h2>Top services to route through Barter Payments</h2>
              <p>
                Start with the categories agents need every day. Each listing should tell an operator what it does, what
                outcome it enables, and why it belongs in the default Barter Payments workflow.
              </p>
            </div>
            <div className="mpp-service-grid">
              {services.map((service, index) => (
                <article className="mpp-service-card" key={service.title}>
                  <div className="mpp-service-header">
                    <div>
                      <div className="mpp-service-topline">
                        <span className="mpp-service-index">{String(index + 1).padStart(2, '0')}</span>
                        <span className="mpp-card-label">{service.title}</span>
                      </div>
                      <h3>{service.description}</h3>
                    </div>
                    <span className="mpp-chip">Agent-ready</span>
                  </div>
                  <div className="mpp-tag-row">
                    {service.services.map((item) => (
                      <span className="mpp-tag" key={item}>
                        {item}
                      </span>
                    ))}
                  </div>
                  <div className="mpp-service-details">
                    <div className="mpp-detail-block">
                      <span>Best for</span>
                      <p>{service.bestFor}</p>
                    </div>
                    <div className="mpp-detail-block">
                      <span>Why it matters</span>
                      <p>{service.outcome}</p>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="demos">
        <div className="container">
          <div className="mpp-section-shell mpp-section-shell-dark">
            <div className="section-title">
              <h2>Polished demo stack</h2>
              <p>
                These are the first five demos to productize. Together they prove that Barter Payments is not just compatible
                with MPP, but useful as the operator layer around it.
              </p>
            </div>
            <div className="mpp-demo-grid">
              {demos.map((demo, index) => (
                <article className="card mpp-demo-card" key={demo.title}>
                  <div className="mpp-demo-header">
                    <div>
                      <span className="mpp-card-label">{demo.eyebrow}</span>
                      <h4>{demo.title}</h4>
                    </div>
                    <span className="mpp-demo-index">{String(index + 1).padStart(2, '0')}</span>
                  </div>
                  <p>{demo.summary}</p>
                  <div className="mpp-demo-meta">
                    <span className="mpp-chip">{demo.service}</span>
                  </div>
                  <div className="mpp-flow">
                    <span>request</span>
                    <span>402</span>
                    <span>pay</span>
                    <span>retry</span>
                    <span>result</span>
                  </div>
                  <div className="mpp-demo-footer">
                    <p className="mpp-demo-outcome">{demo.outcome}</p>
                  </div>
                </article>
              ))}
            </div>
            <div className="split mpp-compare-grid">
              {comparison.map((side) => (
                <div className="split-card mpp-compare-card" key={side.title}>
                  <h3>{side.title}</h3>
                  <ul>
                    {side.points.map((point) => (
                      <li key={point}>{point}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="merchant-kit">
        <div className="container">
          <div className="mpp-section-shell">
            <div className="section-title">
              <h2>Merchant onboarding kit</h2>
              <p>
                Keep the first merchant surface brutally simple: explain the flow, show the integration code, and give a
                revenue-oriented reason to onboard now instead of waiting for the ecosystem to mature on its own.
              </p>
            </div>
            <div className="split mpp-merchant-grid">
              <div className="card mpp-merchant-card">
                <h4>Merchant journey</h4>
                <div className="mpp-step-list">
                  {merchantSteps.map((step, index) => (
                    <div className="mpp-step" key={step.title}>
                      <span>{String(index + 1).padStart(2, '0')}</span>
                      <div>
                        <strong>{step.title}</strong>
                        <p>{step.text}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="card mpp-merchant-highlight">
                <span className="mpp-card-label">Why merchants say yes</span>
                <h4>Distribution is the product</h4>
                <ul>
                  <li>One public listing instead of fragmented docs and scattered examples.</li>
                  <li>Agent-ready snippets that shorten time-to-first-paid-request.</li>
                  <li>Distribution through demos, social content, and curated workflows.</li>
                  <li>Receipts, pricing visibility, and spend-aware routing for buyers.</li>
                </ul>
              </div>
            </div>

            <div className="mpp-sdk-grid">
              <div className="card mpp-code-card">
                <div className="mpp-code-header">
                  <span className="mpp-card-label">SDK</span>
                  <h4>Use via Barter Payments SDK</h4>
                </div>
                <div className="code-block">{nodeSnippet}</div>
              </div>
              <div className="card mpp-code-card">
                <div className="mpp-code-header">
                  <span className="mpp-card-label">cURL</span>
                  <h4>Use via Barter Payments cURL</h4>
                </div>
                <div className="code-block">{curlSnippet}</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="revenue-dashboard">
        <div className="container">
          <div className="mpp-section-shell">
            <div className="section-title">
              <h2>Merchant revenue dashboard preview</h2>
              <p>
                The pitch to merchants gets stronger when they can see monetization as a product surface, not just as a
                protocol capability.
              </p>
            </div>
            <div className="mpp-metric-grid">
              {dashboardMetrics.map((metric) => (
                <div className="mpp-metric-card" key={metric.label}>
                  <span>{metric.label}</span>
                  <strong>{metric.value}</strong>
                  <p>{metric.delta}</p>
                </div>
              ))}
            </div>
            <div className="card mpp-table-card">
              <div className="card-header">
                <h4>Top monetized endpoints</h4>
                <span className="mpp-chip">Preview</span>
              </div>
              <div className="mpp-table">
                <div className="mpp-table-row mpp-table-head">
                  <span>Endpoint</span>
                  <span>Requests</span>
                  <span>Revenue</span>
                  <span>Repeat agents</span>
                </div>
                <div className="mpp-table-row">
                  <span>/openweather/current-weather</span>
                  <span>4,982</span>
                  <span>$428</span>
                  <span>61%</span>
                </div>
                <div className="mpp-table-row">
                  <span>/search/query</span>
                  <span>3,441</span>
                  <span>$392</span>
                  <span>54%</span>
                </div>
                <div className="mpp-table-row">
                  <span>/browser/session</span>
                  <span>1,124</span>
                  <span>$611</span>
                  <span>48%</span>
                </div>
                <div className="mpp-table-row">
                  <span>/messages/send</span>
                  <span>2,607</span>
                  <span>$173</span>
                  <span>72%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="social">
        <div className="container">
          <div className="mpp-section-shell mpp-section-shell-soft">
            <div className="section-title">
              <h2>Social content system</h2>
              <p>
                To make this mainstream, ship the distribution loop with the product. Each clip should make the before
                and after obvious in under thirty seconds.
              </p>
            </div>
            <div className="mpp-story-grid">
              {storyboard.map((item) => (
                <div className="card mpp-story-card" key={item.title}>
                  <span className="mpp-card-label">{item.title}</span>
                  <p>{item.text}</p>
                </div>
              ))}
            </div>
            <div className="mpp-social-banner">
              <div>
                <span className="mpp-card-label">One-line framing</span>
                <h3>Without Barter Payments, agents find services manually. With Barter Payments, they discover, pay, and execute in one flow.</h3>
              </div>
              <a className="button primary" href="https://x.com/barterpayments" target="_blank" rel="noreferrer">
                Publish the story
              </a>
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
          </nav>
        </div>
      </footer>
    </main>
  );
}
