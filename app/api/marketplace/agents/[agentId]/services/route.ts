import { NextResponse } from 'next/server';
import { getMarketplaceApiBaseUrl, toJsonResponse } from '../../../_lib';

export async function POST(req: Request, context: { params: Promise<{ agentId: string }> }) {
  const { agentId } = await context.params;
  const body = await req.json().catch(() => null);
  const apiKey = body?.apiKey;

  if (!apiKey || typeof apiKey !== 'string') {
    return NextResponse.json(
      {
        error: {
          message: 'API key is required'
        }
      },
      { status: 400 }
    );
  }

  const { apiKey: _apiKey, ...payload } = body;
  const upstream = await fetch(`${getMarketplaceApiBaseUrl()}/marketplace/agents/${encodeURIComponent(agentId)}/services`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': apiKey
    },
    body: JSON.stringify(payload)
  });

  return toJsonResponse(upstream);
}
