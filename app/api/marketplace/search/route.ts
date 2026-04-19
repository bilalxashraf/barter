import { getMarketplaceApiBaseUrl, toJsonResponse } from '../_lib';

export async function GET(req: Request) {
  const inboundUrl = new URL(req.url);
  const upstreamUrl = new URL(`${getMarketplaceApiBaseUrl()}/marketplace/search`);

  for (const [key, value] of inboundUrl.searchParams.entries()) {
    upstreamUrl.searchParams.set(key, value);
  }

  const upstream = await fetch(upstreamUrl.toString(), {
    cache: 'no-store'
  });

  return toJsonResponse(upstream);
}
