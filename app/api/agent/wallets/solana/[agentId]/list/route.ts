import { NextResponse } from 'next/server';

export async function GET(
  req: Request,
  context: { params: Promise<{ agentId: string }> }
) {
  const { agentId } = await context.params;
  const apiKey = req.headers.get('X-API-Key');

  if (!apiKey) {
    return NextResponse.json(
      {
        error: {
          message: 'API key is required'
        }
      },
      { status: 401 }
    );
  }

  const apiBaseUrl = process.env.AGENT_API_BASE_URL ||
    (process.env.NODE_ENV !== 'production' ? 'http://localhost:4010' : 'https://api.barterpayments.xyz');

  try {
    const upstream = await fetch(
      `${apiBaseUrl}/agent/wallets/solana/${encodeURIComponent(agentId)}/list`,
      {
        headers: {
          'X-API-Key': apiKey
        }
      }
    );

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
  } catch (err: any) {
    return NextResponse.json(
      {
        error: {
          message: err.message || 'Failed to fetch wallets'
        }
      },
      { status: 502 }
    );
  }
}
