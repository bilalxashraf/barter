'use client';

import type { CSSProperties, FormEvent } from 'react';
import { useEffect, useState } from 'react';
import {
  closeVirtualCard,
  createCardProfile,
  createFundingSession,
  createVirtualCard,
  getCardsConfig,
  getCardsOverview,
  setupCardsPaymentMethod,
  syncFundingSession,
  type CardFunding,
  type CardOverviewResponse,
  type CardProfile,
  type CardsConfig,
  type VirtualCard
} from '../_lib/agentApi';

type Props = {
  agentId: string;
  apiKey: string;
  username?: string;
};

export default function CardsSection({ agentId, apiKey, username }: Props) {
  const [config, setConfig] = useState<CardsConfig | null>(null);
  const [overview, setOverview] = useState<CardOverviewResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [profileForm, setProfileForm] = useState({
    firstName: username ? username.charAt(0).toUpperCase() + username.slice(1) : '',
    lastName: 'User',
    email: '',
    phoneNumber: '',
    dateOfBirth: '',
    line1: '',
    line2: '',
    city: '',
    state: '',
    postalCode: '',
    country: 'US',
    termsAccepted: false
  });

  const [topUpAmount, setTopUpAmount] = useState('50.00');
  const [cardForm, setCardForm] = useState({
    amountUsd: '25.00',
    purpose: 'Agent purchase budget',
    merchantName: '',
    expiresInDays: '7'
  });

  useEffect(() => {
    void refresh();
  }, []);

  async function refresh() {
    setLoading(true);
    setError(null);

    try {
      const [configResponse, overviewResponse] = await Promise.all([
        getCardsConfig(),
        getCardsOverview(agentId, apiKey)
      ]);
      setConfig(configResponse.cards);
      setOverview(overviewResponse);
    } catch (err: any) {
      setError(err.message || 'Failed to load cards');
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateProfile(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setStatus(null);
    setError(null);

    try {
      await createCardProfile({
        agentId,
        firstName: profileForm.firstName,
        lastName: profileForm.lastName,
        email: profileForm.email,
        phoneNumber: profileForm.phoneNumber || undefined,
        dateOfBirth: profileForm.dateOfBirth,
        termsAccepted: profileForm.termsAccepted,
        billingAddress: {
          line1: profileForm.line1,
          line2: profileForm.line2 || undefined,
          city: profileForm.city,
          state: profileForm.state || undefined,
          postalCode: profileForm.postalCode,
          country: profileForm.country
        }
      }, apiKey);

      setStatus('Card profile saved.');
      await refresh();
    } catch (err: any) {
      setError(err.message || 'Failed to save card profile');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSetupPaymentMethod() {
    setSubmitting(true);
    setStatus(null);
    setError(null);

    try {
      const response = await setupCardsPaymentMethod(agentId, apiKey, {
        successUrl: window.location.href,
        cancelUrl: window.location.href
      });
      window.open(response.url, '_blank', 'noopener,noreferrer');
      setStatus('Opened Stripe payment-method setup in a new tab.');
    } catch (err: any) {
      setError(err.message || 'Failed to open payment-method setup');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleTopUp(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setStatus(null);
    setError(null);

    try {
      const response = await createFundingSession({
        agentId,
        amountUsd: topUpAmount,
        successUrl: window.location.href,
        cancelUrl: window.location.href
      }, apiKey);
      window.open(response.funding.checkoutUrl, '_blank', 'noopener,noreferrer');
      setStatus('Opened Stripe top-up checkout in a new tab. Sync the transaction after payment.');
      await refresh();
    } catch (err: any) {
      setError(err.message || 'Failed to start top-up');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSyncFunding(fundingId: string) {
    setSubmitting(true);
    setStatus(null);
    setError(null);

    try {
      const response = await syncFundingSession(agentId, fundingId, apiKey);
      setStatus(
        response.funding.status === 'completed'
          ? 'Top-up completed and balance credited.'
          : 'Funding session is still pending.'
      );
      await refresh();
    } catch (err: any) {
      setError(err.message || 'Failed to sync funding');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCreateCard(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setStatus(null);
    setError(null);

    try {
      await createVirtualCard({
        agentId,
        amountUsd: cardForm.amountUsd,
        purpose: cardForm.purpose,
        merchantName: cardForm.merchantName || undefined,
        expiresInDays: Number(cardForm.expiresInDays) || undefined
      }, apiKey);
      setStatus('Virtual card created.');
      await refresh();
    } catch (err: any) {
      setError(err.message || 'Failed to create virtual card');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCloseCard(cardId: string) {
    if (!window.confirm('Close this card and release remaining allocated balance?')) return;

    setSubmitting(true);
    setStatus(null);
    setError(null);

    try {
      await closeVirtualCard(cardId, agentId, apiKey);
      setStatus('Virtual card closed.');
      await refresh();
    } catch (err: any) {
      setError(err.message || 'Failed to close virtual card');
    } finally {
      setSubmitting(false);
    }
  }

  const profile = overview?.profile || null;
  const paymentMethodsReady = Boolean(overview?.paymentMethodStatus?.hasPaymentMethod);
  const fundings = overview?.fundingTransactions || [];
  const cards = overview?.cards || [];
  const cardsEnabled = Boolean(config?.enabled);

  return (
    <div className="card" style={{ marginTop: 24 }}>
      <div className="wallet-header">
        <div>
          <h4>Barter Cards</h4>
          <p className="muted">
            Create card profiles, save a payment method, prefund a balance, and issue task-scoped virtual cards.
          </p>
        </div>
        <button className="button secondary" type="button" onClick={() => void refresh()} disabled={loading || submitting}>
          Refresh
        </button>
      </div>

      {!cardsEnabled && !loading ? (
        <div style={noticeStyle}>
          <strong>Cards are disabled.</strong> Configure Stripe in `agent-api` to enable card profiles, top-ups, and card issuance.
        </div>
      ) : null}

      {error ? (
        <div style={{ ...noticeStyle, background: 'rgba(255,0,0,0.08)', borderColor: 'rgba(255,0,0,0.24)' }}>
          <strong style={{ color: '#ff6b6b' }}>Error:</strong> {error}
        </div>
      ) : null}

      {status ? (
        <div style={{ ...noticeStyle, background: 'rgba(40,199,111,0.08)', borderColor: 'rgba(40,199,111,0.22)' }}>
          <strong style={{ color: '#3ddc84' }}>Status:</strong> {status}
        </div>
      ) : null}

      {loading ? <p className="muted" style={{ marginTop: 16 }}>Loading cards...</p> : null}

      {cardsEnabled && !profile ? (
        <form onSubmit={handleCreateProfile} style={{ display: 'grid', gap: 16, marginTop: 16 }}>
          <div className="marketplace-field-grid two">
            <label className="marketplace-field">
              <span>First Name</span>
              <input value={profileForm.firstName} onChange={(e) => setProfileForm((v) => ({ ...v, firstName: e.target.value }))} required />
            </label>
            <label className="marketplace-field">
              <span>Last Name</span>
              <input value={profileForm.lastName} onChange={(e) => setProfileForm((v) => ({ ...v, lastName: e.target.value }))} required />
            </label>
          </div>

          <div className="marketplace-field-grid two">
            <label className="marketplace-field">
              <span>Email</span>
              <input type="email" value={profileForm.email} onChange={(e) => setProfileForm((v) => ({ ...v, email: e.target.value }))} required />
            </label>
            <label className="marketplace-field">
              <span>Phone Number</span>
              <input value={profileForm.phoneNumber} onChange={(e) => setProfileForm((v) => ({ ...v, phoneNumber: e.target.value }))} />
            </label>
          </div>

          <div className="marketplace-field-grid two">
            <label className="marketplace-field">
              <span>Date of Birth</span>
              <input type="date" value={profileForm.dateOfBirth} onChange={(e) => setProfileForm((v) => ({ ...v, dateOfBirth: e.target.value }))} required />
            </label>
            <label className="marketplace-field">
              <span>Country</span>
              <input value={profileForm.country} onChange={(e) => setProfileForm((v) => ({ ...v, country: e.target.value.toUpperCase() }))} required />
            </label>
          </div>

          <label className="marketplace-field">
            <span>Address Line 1</span>
            <input value={profileForm.line1} onChange={(e) => setProfileForm((v) => ({ ...v, line1: e.target.value }))} required />
          </label>

          <label className="marketplace-field">
            <span>Address Line 2</span>
            <input value={profileForm.line2} onChange={(e) => setProfileForm((v) => ({ ...v, line2: e.target.value }))} />
          </label>

          <div className="marketplace-field-grid three">
            <label className="marketplace-field">
              <span>City</span>
              <input value={profileForm.city} onChange={(e) => setProfileForm((v) => ({ ...v, city: e.target.value }))} required />
            </label>
            <label className="marketplace-field">
              <span>State</span>
              <input value={profileForm.state} onChange={(e) => setProfileForm((v) => ({ ...v, state: e.target.value }))} />
            </label>
            <label className="marketplace-field">
              <span>Postal Code</span>
              <input value={profileForm.postalCode} onChange={(e) => setProfileForm((v) => ({ ...v, postalCode: e.target.value }))} required />
            </label>
          </div>

          <label style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <input
              type="checkbox"
              checked={profileForm.termsAccepted}
              onChange={(e) => setProfileForm((v) => ({ ...v, termsAccepted: e.target.checked }))}
            />
            <span>I accept the Barter Cards terms for creating and funding virtual cards.</span>
          </label>

          <button className="button primary" type="submit" disabled={submitting || !profileForm.termsAccepted}>
            {submitting ? 'Saving...' : 'Create Card Profile'}
          </button>
        </form>
      ) : null}

      {cardsEnabled && profile ? (
        <div style={{ display: 'grid', gap: 18, marginTop: 16 }}>
          <section style={panelStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
              <div>
                <h4 style={{ marginBottom: 6 }}>Profile</h4>
                <p className="muted">{profile.firstName} {profile.lastName} · {profile.email}</p>
                <p className="muted">Status: {profile.status}</p>
              </div>
              <div>
                <div style={metricPillStyle('#66e0ff')}>Balance ${overview?.balanceUsd || '0.00'}</div>
                <p className="muted" style={{ marginTop: 8 }}>
                  Payment methods: {overview?.paymentMethodStatus?.count || 0}
                </p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
              <button className="button secondary" type="button" onClick={() => void handleSetupPaymentMethod()} disabled={submitting}>
                {paymentMethodsReady ? 'Update Payment Method' : 'Attach Payment Method'}
              </button>
            </div>
          </section>

          <section style={panelStyle}>
            <div style={{ marginBottom: 12 }}>
              <h4 style={{ marginBottom: 6 }}>Top Up Balance</h4>
              <p className="muted">Fund your Barter Cards balance through hosted Stripe checkout.</p>
            </div>

            <form onSubmit={handleTopUp} style={{ display: 'flex', gap: 10, alignItems: 'end', flexWrap: 'wrap' }}>
              <label className="marketplace-field" style={{ minWidth: 220 }}>
                <span>Top-up Amount (USD)</span>
                <input value={topUpAmount} onChange={(e) => setTopUpAmount(e.target.value)} required />
              </label>
              <button className="button primary" type="submit" disabled={submitting || !paymentMethodsReady}>
                {submitting ? 'Opening...' : 'Top Up'}
              </button>
            </form>

            <div style={{ display: 'grid', gap: 10, marginTop: 16 }}>
              {fundings.length === 0 ? (
                <p className="muted">No funding activity yet.</p>
              ) : (
                fundings.slice(0, 5).map((funding) => (
                  <FundingRow key={funding.fundingId} funding={funding} onSync={() => void handleSyncFunding(funding.fundingId)} disabled={submitting} />
                ))
              )}
            </div>
          </section>

          <section style={panelStyle}>
            <div style={{ marginBottom: 12 }}>
              <h4 style={{ marginBottom: 6 }}>Issue Virtual Card</h4>
              <p className="muted">
                Create a task-scoped card from your funded balance. {config?.issuingEnabled ? 'Stripe Issuing is enabled.' : 'Stripe Issuing must be enabled to create live cards.'}
              </p>
            </div>

            <form onSubmit={handleCreateCard} style={{ display: 'grid', gap: 16 }}>
              <div className="marketplace-field-grid three">
                <label className="marketplace-field">
                  <span>Amount (USD)</span>
                  <input value={cardForm.amountUsd} onChange={(e) => setCardForm((v) => ({ ...v, amountUsd: e.target.value }))} required />
                </label>
                <label className="marketplace-field">
                  <span>Merchant</span>
                  <input value={cardForm.merchantName} onChange={(e) => setCardForm((v) => ({ ...v, merchantName: e.target.value }))} placeholder="OpenAI, Vercel, Notion..." />
                </label>
                <label className="marketplace-field">
                  <span>Expiry (days)</span>
                  <input type="number" min={1} max={30} value={cardForm.expiresInDays} onChange={(e) => setCardForm((v) => ({ ...v, expiresInDays: e.target.value }))} />
                </label>
              </div>

              <label className="marketplace-field">
                <span>Purpose</span>
                <textarea value={cardForm.purpose} onChange={(e) => setCardForm((v) => ({ ...v, purpose: e.target.value }))} rows={3} required />
              </label>

              <button className="button primary" type="submit" disabled={submitting || !config?.issuingEnabled}>
                {submitting ? 'Creating...' : 'Create Virtual Card'}
              </button>
            </form>
          </section>

          <section style={panelStyle}>
            <div style={{ marginBottom: 12 }}>
              <h4 style={{ marginBottom: 6 }}>Cards</h4>
              <p className="muted">Current and historical task-scoped virtual cards.</p>
            </div>

            {cards.length === 0 ? (
              <p className="muted">No cards issued yet.</p>
            ) : (
              <div style={{ display: 'grid', gap: 12 }}>
                {cards.map((card) => (
                  <CardRow key={card.cardId} card={card} onClose={() => void handleCloseCard(card.cardId)} disabled={submitting} />
                ))}
              </div>
            )}
          </section>
        </div>
      ) : null}
    </div>
  );
}

function FundingRow({ funding, onSync, disabled }: { funding: CardFunding; onSync: () => void; disabled: boolean }) {
  return (
    <div style={rowStyle}>
      <div>
        <strong>${funding.amountUsd}</strong>
        <p className="muted">Status: {funding.status} · {formatDate(funding.createdAt)}</p>
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {funding.status === 'pending' ? (
          <>
            {funding.checkoutUrl ? (
              <a className="button secondary" href={funding.checkoutUrl} target="_blank" rel="noreferrer">
                Open Checkout
              </a>
            ) : null}
            <button className="button secondary" type="button" onClick={onSync} disabled={disabled}>
              Sync
            </button>
          </>
        ) : null}
      </div>
    </div>
  );
}

function CardRow({ card, onClose, disabled }: { card: VirtualCard; onClose: () => void; disabled: boolean }) {
  return (
    <div style={rowStyle}>
      <div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <strong>${card.amountUsd}</strong>
          <span style={metricPillStyle(card.status === 'active' ? '#66e0ff' : '#999')}>{card.status}</span>
        </div>
        <p style={{ marginTop: 6 }}>{card.purpose}</p>
        <p className="muted" style={{ marginTop: 6 }}>
          {card.merchantName ? `${card.merchantName} · ` : ''}
          {card.last4 ? `•••• ${card.last4} · ` : ''}
          {card.expMonth && card.expYear ? `${card.expMonth}/${card.expYear} · ` : ''}
          Expires {formatDate(card.expiresAt)}
        </p>
      </div>
      {card.status === 'active' ? (
        <button className="button secondary" type="button" onClick={onClose} disabled={disabled}>
          Close
        </button>
      ) : null}
    </div>
  );
}

function formatDate(value: number): string {
  return new Date(value).toLocaleString();
}

const panelStyle: CSSProperties = {
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 16,
  padding: 18,
  background: 'rgba(255,255,255,0.02)'
};

const rowStyle: CSSProperties = {
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 14,
  padding: 16,
  background: 'rgba(255,255,255,0.02)',
  display: 'flex',
  justifyContent: 'space-between',
  gap: 12,
  alignItems: 'flex-start',
  flexWrap: 'wrap'
};

const noticeStyle: CSSProperties = {
  padding: 12,
  borderRadius: 10,
  marginTop: 16,
  border: '1px solid rgba(255,255,255,0.12)',
  background: 'rgba(255,255,255,0.04)'
};

function metricPillStyle(color: string): CSSProperties {
  return {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '4px 10px',
    borderRadius: 999,
    border: `1px solid ${color}33`,
    background: `${color}14`,
    color
  };
}
