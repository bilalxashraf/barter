'use client';

import { useState } from 'react';

type SolanaWalletBalanceProps = {
  agentId: string;
  walletNo: number;
  address: string;
};

type TokenHolding = {
  symbol: string;
  mint: string;
  balance: string;
  decimals: number;
  uiAmount: number;
  priceUsd: string | null;
  valueUsd: string | null;
  logo: string | null;
};

type SolanaBalanceData = {
  address: string;
  totalUsd: string;
  holdings: TokenHolding[];
};

export default function SolanaWalletBalance({ agentId, walletNo, address }: SolanaWalletBalanceProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [balanceData, setBalanceData] = useState<SolanaBalanceData | null>(null);
  const [showBalance, setShowBalance] = useState(false);

  const fetchBalance = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/wallet/solana/balance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          agentId,
          walletNo
        })
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to fetch Solana token balances');
      }

      const data: SolanaBalanceData = await res.json();
      setBalanceData(data);
      setShowBalance(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch Solana token balances');
      setShowBalance(false);
    } finally {
      setLoading(false);
    }
  };

  const formatBalance = (balance: string) => {
    const num = parseFloat(balance);
    if (num === 0) return '0';
    if (num < 0.000001) return '<0.000001';
    if (num < 1) return num.toFixed(6);
    if (num < 1000) return num.toFixed(4);
    return num.toLocaleString('en-US', { maximumFractionDigits: 2 });
  };

  const formatUsd = (value: string | null) => {
    if (!value) return '-';
    const num = parseFloat(value);
    if (num < 0.01) return '<$0.01';
    return `$${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <div className="wallet-balance-section">
      <button
        className="button ghost"
        onClick={fetchBalance}
        disabled={loading}
        style={{ marginTop: '12px' }}
      >
        {loading ? 'Loading...' : showBalance ? 'Refresh Balances' : 'Show Token Balances'}
      </button>

      {error && (
        <div className="balance-error" style={{ marginTop: '12px', color: '#ff4444', fontSize: '14px' }}>
          {error}
        </div>
      )}

      {showBalance && balanceData && (
        <div className="balance-results" style={{ marginTop: '16px' }}>
          <div className="balance-header" style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '12px',
            paddingBottom: '8px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
          }}>
            <h5 style={{ margin: 0, fontSize: '14px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Token Holdings
            </h5>
            <span style={{ fontSize: '14px', fontWeight: 600, color: '#9b7fff' }}>
              Total: {formatUsd(balanceData.totalUsd)}
            </span>
          </div>

          {balanceData.holdings.length === 0 ? (
            <p className="muted" style={{ fontSize: '14px', margin: 0 }}>
              No tokens with value found in this wallet
            </p>
          ) : (
            <div className="balance-list">
              {balanceData.holdings.map((holding) => (
                <div
                  key={holding.mint}
                  className="balance-item"
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '10px 12px',
                    background: 'rgba(255, 255, 255, 0.03)',
                    borderRadius: '8px',
                    marginBottom: '8px',
                    border: '1px solid rgba(255, 255, 255, 0.08)'
                  }}
                >
                  <div className="token-info" style={{ flex: 1 }}>
                    <div style={{
                      fontSize: '15px',
                      fontWeight: 600,
                      marginBottom: '2px'
                    }}>
                      {holding.symbol}
                    </div>
                    <div style={{
                      fontSize: '13px',
                      color: 'rgba(255, 255, 255, 0.5)',
                      fontFamily: 'monospace'
                    }}>
                      {formatBalance(holding.balance)}
                    </div>
                  </div>
                  <div className="token-value" style={{ textAlign: 'right' }}>
                    <div style={{
                      fontSize: '15px',
                      fontWeight: 600,
                      color: '#9b7fff',
                      marginBottom: '2px'
                    }}>
                      {formatUsd(holding.valueUsd)}
                    </div>
                    {holding.priceUsd && (
                      <div style={{
                        fontSize: '12px',
                        color: 'rgba(255, 255, 255, 0.4)'
                      }}>
                        @ {formatUsd(holding.priceUsd)}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
