import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getSessionCookie } from '../../../_lib/session';
import { getUserByXId } from '../../../_lib/xUserStore';

export type TokenHolding = {
  symbol: string;
  address: string;
  balance: string;
  priceUsd: string | null;
  valueUsd: string | null;
};

export type WalletBalanceResponse = {
  address: string;
  holdings: TokenHolding[];
  totalUsd: string;
};

function getBaseUrl() {
  return process.env.AGENT_API_BASE_URL || 'https://api.barterpayments.xyz';
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { chain, address, minUsd = 0.01 } = body;

    if (!chain || !address) {
      return NextResponse.json(
        { error: 'Missing required fields: chain and address' },
        { status: 400 }
      );
    }

    const cookieStore = await cookies();
    const session = getSessionCookie(cookieStore);
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const user = await getUserByXId(session.xUserId);
    if (!user?.apiKey) {
      return NextResponse.json({ error: 'Missing agent API key' }, { status: 401 });
    }

    // Call the agent API's /wallet/analyze endpoint
    const res = await fetch(`${getBaseUrl()}/wallet/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': user.apiKey
      },
      body: JSON.stringify({
        chain,
        address,
        minUsd,
        includeUnknown: false
      })
    });

    if (!res.ok) {
      const errorBody = await res.json().catch(() => ({}));
      return NextResponse.json(
        { error: errorBody?.error || 'Failed to fetch wallet balance' },
        { status: res.status }
      );
    }

    const data: WalletBalanceResponse = await res.json();

    // Filter out tokens with no value for cleaner display
    const filteredHoldings = data.holdings.filter(
      (holding) => holding.valueUsd && parseFloat(holding.valueUsd) > minUsd
    );

    return NextResponse.json({
      ...data,
      holdings: filteredHoldings
    });
  } catch (error) {
    console.error('Error fetching wallet balance:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
