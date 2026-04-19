import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getSessionCookie } from '../../../../_lib/session';
import { getUserByXId } from '../../../../_lib/xUserStore';
import { getSolanaTokenBalances } from '../../../../_lib/agentApi';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { agentId, walletNo } = body;

    if (!agentId) {
      return NextResponse.json(
        { error: 'Missing required field: agentId' },
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

    // Call the agent API's Solana token balances endpoint
    const data = await getSolanaTokenBalances(agentId, user.apiKey, walletNo);

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching Solana token balances:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
