'use client';

import { useState } from 'react';
import { createPaymentLink, listPaymentLinks, cancelPaymentLink, type CreatePaymentLinkParams, type PaymentLink } from '../_lib/agentApi';
import CopyButton from './CopyButton';

type Props = {
  agentId: string;
  apiKey: string;
  wallets: Array<{ agentId: string; walletNo: number; address: string; networkId: string }>;
  solanaWallets?: Array<{ agentId: string; walletNo: number; address: string; networkId: string }>;
};

export default function PaymentLinksSection({ agentId, apiKey, wallets, solanaWallets = [] }: Props) {
  const allWallets = [...wallets, ...solanaWallets];
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [links, setLinks] = useState<PaymentLink[]>([]);
  const [showLinks, setShowLinks] = useState(false);
  const [createdLink, setCreatedLink] = useState<{ url: string; qrCode: string; linkId: string } | null>(null);

  const [formData, setFormData] = useState<CreatePaymentLinkParams>({
    agentId,
    chain: 'base',
    token: 'USDC',
    amount: '10',
    description: '',
    expiresIn: 3600
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);
    setCreatedLink(null);

    try {
      const result = await createPaymentLink(formData, apiKey);
      setSuccess('Payment link created successfully!');
      setCreatedLink({ url: result.url, qrCode: result.qrCode, linkId: result.linkId });
      setShowForm(false);
      // Reset form
      setFormData({
        agentId,
        chain: 'base',
        token: 'USDC',
        amount: '10',
        description: '',
        expiresIn: 3600
      });
    } catch (err: any) {
      setError(err.message || 'Failed to create payment link');
    } finally {
      setLoading(false);
    }
  };

  const handleLoadLinks = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await listPaymentLinks(agentId, apiKey);
      setLinks(result.links);
      setShowLinks(true);
    } catch (err: any) {
      setError(err.message || 'Failed to load payment links');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelLink = async (linkId: string) => {
    if (!confirm('Cancel this payment link?')) return;

    try {
      await cancelPaymentLink(linkId, agentId, apiKey);
      setSuccess('Payment link cancelled');
      // Refresh list
      const result = await listPaymentLinks(agentId, apiKey);
      setLinks(result.links);
    } catch (err: any) {
      setError(err.message || 'Failed to cancel payment link');
    }
  };

  return (
    <div className="card" style={{ marginTop: 24 }}>
      <div className="wallet-header">
        <div>
          <h4>Payment Links</h4>
          <p className="muted">Create payment links to receive crypto payments</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            className="button secondary"
            onClick={handleLoadLinks}
            disabled={loading}
          >
            {showLinks ? 'Refresh' : 'View Links'}
          </button>
          <button
            className="button primary"
            onClick={() => setShowForm(!showForm)}
            disabled={allWallets.length === 0}
          >
            {showForm ? 'Cancel' : 'Create Link'}
          </button>
        </div>
      </div>

      {allWallets.length === 0 && (
        <p className="muted">Create a wallet first to enable payment links.</p>
      )}

      {error && (
        <div style={{ padding: 12, background: 'rgba(255, 0, 0, 0.1)', borderRadius: 6, marginTop: 12 }}>
          <strong style={{ color: '#ff4444' }}>Error:</strong> {error}
        </div>
      )}

      {success && (
        <div style={{ padding: 12, background: 'rgba(0, 255, 0, 0.1)', borderRadius: 6, marginTop: 12 }}>
          <strong style={{ color: '#44ff44' }}>Success:</strong> {success}
        </div>
      )}

      {createdLink && (
        <div className="card" style={{ marginTop: 16, background: 'rgba(100, 200, 255, 0.05)' }}>
          <h4>Payment Link Created!</h4>
          <div style={{ marginTop: 12 }}>
            <p className="muted" style={{ marginBottom: 8 }}>Share this link:</p>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input
                type="text"
                value={createdLink.url}
                readOnly
                style={{ flex: 1, padding: '8px 12px', borderRadius: 4, border: '1px solid rgba(255,255,255,0.2)' }}
              />
              <CopyButton value={createdLink.url} label="Copy" />
            </div>
          </div>
          <div style={{ marginTop: 12 }}>
            <p className="muted" style={{ marginBottom: 8 }}>QR Code:</p>
            <img
              src={createdLink.qrCode}
              alt="Payment QR Code"
              style={{ width: 200, height: 200, border: '1px solid rgba(255,255,255,0.2)', borderRadius: 8 }}
            />
          </div>
        </div>
      )}

      {showForm && (
        <form onSubmit={handleSubmit} style={{ marginTop: 16 }}>
          <div style={{ display: 'grid', gap: 16 }}>
            <div>
              <label style={{ display: 'block', marginBottom: 4, fontSize: '0.9rem' }}>
                Chain
              </label>
              <select
                value={formData.chain}
                onChange={(e) => setFormData({ ...formData, chain: e.target.value })}
                style={{ width: '100%', padding: '8px 12px', borderRadius: 4, border: '1px solid rgba(255,255,255,0.2)' }}
                required
              >
                <option value="base">Base</option>
                <option value="ethereum">Ethereum</option>
                <option value="optimism">Optimism</option>
                <option value="arbitrum">Arbitrum</option>
                <option value="bsc">BSC</option>
                <option value="solana">Solana</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: 4, fontSize: '0.9rem' }}>
                Token
              </label>
              <input
                type="text"
                value={formData.token}
                onChange={(e) => setFormData({ ...formData, token: e.target.value })}
                placeholder="USDC"
                style={{ width: '100%', padding: '8px 12px', borderRadius: 4, border: '1px solid rgba(255,255,255,0.2)' }}
                required
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: 4, fontSize: '0.9rem' }}>
                Amount
              </label>
              <input
                type="text"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                placeholder="10"
                style={{ width: '100%', padding: '8px 12px', borderRadius: 4, border: '1px solid rgba(255,255,255,0.2)' }}
                required
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: 4, fontSize: '0.9rem' }}>
                Description (optional)
              </label>
              <input
                type="text"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Payment for services"
                style={{ width: '100%', padding: '8px 12px', borderRadius: 4, border: '1px solid rgba(255,255,255,0.2)' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: 4, fontSize: '0.9rem' }}>
                Expires In (seconds)
              </label>
              <select
                value={formData.expiresIn}
                onChange={(e) => setFormData({ ...formData, expiresIn: parseInt(e.target.value) })}
                style={{ width: '100%', padding: '8px 12px', borderRadius: 4, border: '1px solid rgba(255,255,255,0.2)' }}
              >
                <option value={3600}>1 hour</option>
                <option value={86400}>24 hours</option>
                <option value={604800}>7 days</option>
                <option value={2592000}>30 days</option>
              </select>
            </div>

            {allWallets.length > 1 && (
              <div>
                <label style={{ display: 'block', marginBottom: 4, fontSize: '0.9rem' }}>
                  Recipient Wallet
                </label>
                <select
                  value={formData.recipientWalletNo || ''}
                  onChange={(e) => setFormData({ ...formData, recipientWalletNo: e.target.value ? parseInt(e.target.value) : undefined })}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 4, border: '1px solid rgba(255,255,255,0.2)' }}
                >
                  <option value="">Default Wallet</option>
                  {allWallets.map(w => (
                    <option key={`${w.networkId}-${w.walletNo}`} value={w.walletNo}>
                      Wallet #{w.walletNo} ({w.networkId.toUpperCase()}) - {w.address.slice(0, 6)}...{w.address.slice(-4)}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <button
              type="submit"
              className="button primary"
              disabled={loading}
              style={{ marginTop: 8 }}
            >
              {loading ? 'Creating...' : 'Create Payment Link'}
            </button>
          </div>
        </form>
      )}

      {showLinks && (
        <div style={{ marginTop: 16 }}>
          <h4>Your Payment Links</h4>
          {links.length === 0 ? (
            <p className="muted">No payment links created yet.</p>
          ) : (
            <div style={{ display: 'grid', gap: 12, marginTop: 12 }}>
              {links.map(link => (
                <div
                  key={link.linkId}
                  className="card"
                  style={{ padding: 12, background: 'rgba(255,255,255,0.02)' }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 }}>
                        <strong>{link.amount} {link.token}</strong>
                        <span
                          style={{
                            fontSize: '0.75rem',
                            padding: '2px 8px',
                            borderRadius: 4,
                            background: link.status === 'active' ? 'rgba(0,255,0,0.2)' :
                              link.status === 'paid' ? 'rgba(100,100,255,0.2)' :
                              'rgba(255,0,0,0.2)',
                            color: link.status === 'active' ? '#44ff44' :
                              link.status === 'paid' ? '#8888ff' :
                              '#ff4444'
                          }}
                        >
                          {link.status}
                        </span>
                      </div>
                      <p className="muted" style={{ fontSize: '0.85rem', marginBottom: 4 }}>
                        {link.description || 'No description'}
                      </p>
                      <p className="muted" style={{ fontSize: '0.75rem' }}>
                        Chain: {link.chain.toUpperCase()} • Created: {new Date(link.createdAt).toLocaleDateString()}
                      </p>
                      {link.expiresAt && (
                        <p className="muted" style={{ fontSize: '0.75rem' }}>
                          Expires: {new Date(link.expiresAt).toLocaleString()}
                        </p>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      {link.status === 'active' && (
                        <button
                          className="button secondary"
                          style={{ fontSize: '0.85rem', padding: '4px 12px' }}
                          onClick={() => handleCancelLink(link.linkId)}
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </div>
                  {link.paidAt && link.txHash && (
                    <div style={{ marginTop: 8, padding: 8, background: 'rgba(0,255,0,0.05)', borderRadius: 4 }}>
                      <p className="muted" style={{ fontSize: '0.75rem' }}>
                        Paid: {new Date(link.paidAt).toLocaleString()}
                      </p>
                      <p className="muted" style={{ fontSize: '0.75rem' }}>
                        Tx: {link.txHash.slice(0, 10)}...{link.txHash.slice(-8)}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
