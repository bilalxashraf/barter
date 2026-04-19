import { NextResponse } from 'next/server';

export function getMarketplaceApiBaseUrl() {
  if (process.env.AGENT_API_BASE_URL) {
    return process.env.AGENT_API_BASE_URL.replace(/\/$/, '');
  }

  if (process.env.NODE_ENV !== 'production') {
    return 'http://localhost:4010';
  }

  return 'https://api.ignotusai.xyz';
}

export async function toJsonResponse(upstream: Response) {
  const text = await upstream.text();

  let payload: any = {};
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = {
        error: {
          message: text
        }
      };
    }
  }

  return NextResponse.json(payload, { status: upstream.status });
}
