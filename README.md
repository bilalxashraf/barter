# BarterPayments Bootstrap

BarterPayments is a `pnpm` monorepo that separates:

- `apps/web`: X onboarding and account settings
- `apps/api`: webhook, preview, and authenticated user APIs
- `apps/worker`: async mention processing and reply orchestration
- `packages/*`: reusable contracts, domain logic, db schema, social adapters, chain drivers, custody providers, and observability helpers

## Local development

1. Create a Supabase project and copy its Postgres connection string.
2. Copy environment config: `cp .env.example .env`
3. Put the Supabase connection string into `DATABASE_URL` or `SUPABASE_DATABASE_URL`.
4. Install dependencies: `pnpm install`
5. Generate and apply schema changes: `pnpm db:generate` then `pnpm db:push`
6. Run the apps: `pnpm dev`

## Workspace scripts

- `pnpm dev`
- `pnpm build`
- `pnpm typecheck`
- `pnpm test`
- `pnpm db:push`

## Architecture notes

- Supabase Postgres is the system of record.
- `pg-boss` is used for durable jobs and retries.
- The X adapter is webhook-first with polling fallback.
- Multi-chain support is modeled through `chain_family`, but only EVM has a live driver in the bootstrap.
- Custody is abstracted behind a provider interface; the default bootstrap implementation is a mock custodial provider.
- Supabase is treated as managed infrastructure, not as the application architecture. Domain rules, X auth/session flow, and execution orchestration remain in the app and shared packages.
