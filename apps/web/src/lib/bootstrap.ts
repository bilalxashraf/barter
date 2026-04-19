import { getWebRuntime } from "./server";

let bootstrapPromise: Promise<void> | null = null;

export function ensureWebBootstrap(): Promise<void> {
  if (!bootstrapPromise) {
    bootstrapPromise = (async () => {
      const runtime = getWebRuntime();
      const agent = await runtime.repository.ensureBootstrapAgent({
        slug: runtime.config.NEXT_PUBLIC_BARTER_HANDLE
      });
      await runtime.repository.seedDefaultTokenAllowlist(agent.id);
    })();
  }

  return bootstrapPromise;
}
