import { NextResponse } from 'next/server';
import { getMarketplaceApiBaseUrl, toJsonResponse } from '../../_lib';

export async function GET(req: Request, context: { params: Promise<{ agentId: string }> }) {
  const { agentId } = await context.params;

  try {
    const upstream = await fetch(
      `${getMarketplaceApiBaseUrl()}/marketplace/agents/${encodeURIComponent(agentId)}`
    );

    return toJsonResponse(upstream);
  } catch (err: any) {
    return NextResponse.json(
      {
        error: {
          message: err.message || 'Failed to fetch agent profile'
        }
      },
      { status: 502 }
    );
  }
}
