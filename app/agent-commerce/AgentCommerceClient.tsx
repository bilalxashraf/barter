'use client';

import { FormEvent, useState, useEffect } from 'react';

type SetupState = 'loading' | 'needs-setup' | 'needs-registration' | 'ready';

interface AgentProfile {
  agentId: string;
  displayName: string;
  settlementAddress: string;
  supportedChains: string[];
  acceptedTokens: string[];
  public: boolean;
  active: boolean;
}

interface Service {
  serviceId: string;
  title: string;
  summary: string;
  pricing: {
    model: string;
    amount: string;
    token: string;
    chain: string;
  };
  supportedChains: string[];
  active: boolean;
  createdAt: number;
}

interface SearchResult {
  score: number;
  agent: {
    agentId: string;
    displayName: string;
    headline?: string;
    supportedChains: string[];
    capabilityTags: string[];
    reputation: {
      score: number;
      completionRate: number;
      jobsCompleted: number;
    };
  };
  service: {
    serviceId: string;
    title: string;
    summary: string;
    taskTypes: string[];
    pricing: {
      model: string;
      amount: string;
      token: string;
      chain: string;
    };
    sla: {
      responseTimeMinutes: number;
    };
  };
}

export default function AgentCommerceClient(props: {
  defaultAgentId?: string;
  defaultApiKey?: string;
  username?: string;
}) {
  // Tab state
  const [activeTab, setActiveTab] = useState<'my-services' | 'discover'>('my-services');

  const [setupState, setSetupState] = useState<SetupState>('loading');
  const [agentId, setAgentId] = useState(props.defaultAgentId || '');
  const [apiKey, setApiKey] = useState(props.defaultApiKey || '');
  const [agentProfile, setAgentProfile] = useState<AgentProfile | null>(null);
  const [services, setServices] = useState<Service[]>([]);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedChain, setSelectedChain] = useState<string>('all');
  const [selectedPricingModel, setSelectedPricingModel] = useState<string>('all');

  // Form states
  const [displayName, setDisplayName] = useState('');
  const [serviceTitle, setServiceTitle] = useState('');
  const [serviceSummary, setServiceSummary] = useState('');
  const [price, setPrice] = useState('15');
  const [pricingModel, setPricingModel] = useState<'fixed' | 'quote' | 'subscription' | 'usage'>('fixed');
  const [responseTime, setResponseTime] = useState(30);
  const [serviceCategory, setServiceCategory] = useState('research');
  const [executionMode, setExecutionMode] = useState<'manual' | 'api' | 'webhook'>('manual');
  const [apiEndpoint, setApiEndpoint] = useState('');
  const [apiTimeout, setApiTimeout] = useState(30);
  const [webhookUrl, setWebhookUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [showNewServiceForm, setShowNewServiceForm] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Wallet selection
  const [availableWallets, setAvailableWallets] = useState<Array<{
    walletNo: number;
    address: string;
    networkId: string;
  }>>([]);
  const [selectedWalletNo, setSelectedWalletNo] = useState<number | null>(null);

  // Initialize and check setup state
  useEffect(() => {
    async function checkSetup() {
      if (!props.defaultAgentId || !props.defaultApiKey) {
        setSetupState('needs-setup');
        return;
      }

      try {
        // Check if agent is registered in marketplace
        const response = await fetch(`/api/marketplace/agents/${props.defaultAgentId}`);

        if (response.ok) {
          const data = await response.json();
          setAgentProfile(data.profile);
          // Services are returned together with profile
          setServices(data.services || []);
          setSetupState('ready');
        } else if (response.status === 404) {
          // Not registered, fetch available wallets for selection
          await loadAvailableWallets();
          setSetupState('needs-registration');
        } else {
          await loadAvailableWallets();
          setSetupState('needs-registration');
        }
      } catch (error) {
        console.error('Failed to check agent registration:', error);
        await loadAvailableWallets();
        setSetupState('needs-registration');
      }
    }

    async function loadAvailableWallets() {
      if (!props.defaultAgentId || !props.defaultApiKey) return;

      try {
        // Fetch Solana wallets
        const response = await fetch(`/api/agent/wallets/solana/${props.defaultAgentId}/list`, {
          headers: {
            'X-API-Key': props.defaultApiKey
          }
        });

        if (response.ok) {
          const data = await response.json();
          setAvailableWallets(data.wallets || []);
          if (data.wallets && data.wallets.length > 0) {
            setSelectedWalletNo(data.wallets[0].walletNo);
          }
        }
      } catch (error) {
        console.error('Failed to load wallets:', error);
      }
    }

    checkSetup();
  }, [props.defaultAgentId, props.defaultApiKey]);

  const handleSearch = async () => {
    setSearching(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.append('q', searchQuery);
      if (selectedCategory !== 'all') params.append('taskType', selectedCategory);
      if (selectedChain !== 'all') params.append('chain', selectedChain);
      if (selectedPricingModel !== 'all') params.append('pricingModel', selectedPricingModel);
      params.append('limit', '50');

      const response = await fetch(`/api/marketplace/search?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setSearchResults(data.results || []);
      } else {
        setSearchResults([]);
      }
    } catch (error) {
      console.error('Search failed:', error);
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  // Auto-search on filter change
  useEffect(() => {
    if (activeTab === 'discover') {
      handleSearch();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCategory, selectedChain, selectedPricingModel, activeTab]);

  async function handleRegisterAgent(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setStatus(null);

    if (!selectedWalletNo) {
      setStatus('Please select a settlement wallet');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/marketplace/agents/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          apiKey,
          agentId,
          displayName,
          chain: 'solana',
          walletNo: selectedWalletNo,
          headline: 'AI agent for marketplace services',
          bio: 'Providing automated services to other agents',
          supportedChains: ['solana', 'base'],
          acceptedTokens: ['USDC', 'SOL'],
          capabilityTags: ['research', 'analysis'],
          pricingModel: 'fixed',
          public: true,
          active: true
        })
      });

      const data = await response.json();
      if (!response.ok) {
        const errorMsg = data.error?.message || data.message || 'Failed to register agent';
        throw new Error(errorMsg);
      }

      setAgentProfile(data.profile);
      setStatus('Agent registered successfully!');
      setTimeout(() => {
        setSetupState('ready');
        setStatus(null);
      }, 1500);
    } catch (error: any) {
      console.error('Registration error:', error);
      setStatus(error.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateService(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setStatus(null);

    try {
      const response = await fetch(`/api/marketplace/agents/${agentId}/services`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          apiKey,
          title: serviceTitle,
          summary: serviceSummary,
          description: serviceSummary,
          taskTypes: [serviceCategory],
          capabilityTags: [serviceCategory],
          supportedChains: agentProfile?.supportedChains || ['solana', 'base'],
          acceptedTokens: agentProfile?.acceptedTokens || ['USDC', 'SOL'],
          pricing: {
            model: pricingModel,
            amount: pricingModel === 'quote' ? undefined : price,
            token: 'USDC',
            chain: 'solana',
            billingUnit: pricingModel === 'fixed' ? 'per request' : pricingModel === 'subscription' ? 'per month' : 'per unit'
          },
          sla: {
            responseTimeMinutes: responseTime,
            deliveryTimeMinutes: responseTime * 2,
            uptimePercent: 99.9
          },
          public: true,
          active: true,
          metadata: {
            executionMode,
            ...(executionMode === 'api' && {
              apiEndpoint,
              apiTimeout
            }),
            ...(executionMode === 'webhook' && {
              webhookUrl
            })
          }
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error?.message || 'Failed to create service');

      setServices([...services, data.service]);
      setServiceTitle('');
      setServiceSummary('');
      setPrice('15');
      setPricingModel('fixed');
      setResponseTime(30);
      setServiceCategory('research');
      setExecutionMode('manual');
      setApiEndpoint('');
      setApiTimeout(30);
      setWebhookUrl('');
      setShowAdvanced(false);
      setShowNewServiceForm(false);
      setStatus('Service published successfully!');
      setTimeout(() => setStatus(null), 3000);
    } catch (error: any) {
      setStatus(error.message);
    } finally {
      setLoading(false);
    }
  }

  // Loading state
  if (setupState === 'loading') {
    return (
      <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '80px 20px', textAlign: 'center' }}>
        <div style={{
          width: '60px',
          height: '60px',
          border: '4px solid #667eea',
          borderTopColor: 'transparent',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
          margin: '0 auto 24px'
        }} />
        <p style={{ color: '#999', fontSize: '16px' }}>Loading your marketplace setup...</p>
        <style dangerouslySetInnerHTML={{ __html: `
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}} />
      </div>
    );
  }

  // Needs dashboard setup first
  if (setupState === 'needs-setup') {
    return (
      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '80px 20px' }}>
        <div style={{
          background: 'linear-gradient(135deg, #1e1e2e 0%, #2a2a3e 100%)',
          borderRadius: '20px',
          padding: '60px',
          textAlign: 'center',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        }}>
          <div style={{
            width: '80px',
            height: '80px',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '40px',
            margin: '0 auto 32px'
          }}>
            🏪
          </div>
          <h2 style={{
            fontSize: '32px',
            marginBottom: '16px',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            fontWeight: '700'
          }}>
            Welcome to Agent Commerce
          </h2>
          <p style={{ color: '#ccc', fontSize: '18px', marginBottom: '12px', lineHeight: '1.6' }}>
            Build and monetize AI agent services on a global marketplace.
          </p>
          <p style={{ color: '#999', fontSize: '16px', marginBottom: '40px', lineHeight: '1.6' }}>
            To get started, you'll need an API key and Agent ID from your dashboard.
          </p>
          <a
            href="/dashboard"
            style={{
              display: 'inline-block',
              padding: '18px 40px',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              border: 'none',
              borderRadius: '12px',
              color: '#fff',
              fontSize: '16px',
              fontWeight: '600',
              textDecoration: 'none',
              transition: 'transform 0.2s ease',
              cursor: 'pointer'
            }}
            onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
          >
            Go to Dashboard →
          </a>
        </div>
      </div>
    );
  }

  // Needs agent registration
  if (setupState === 'needs-registration') {
    return (
      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '80px 20px' }}>
        <div style={{
          background: 'linear-gradient(135deg, #1e1e2e 0%, #2a2a3e 100%)',
          borderRadius: '20px',
          padding: '50px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        }}>
          <form onSubmit={handleRegisterAgent}>
            <div style={{ textAlign: 'center', marginBottom: '40px' }}>
              <div style={{
                width: '80px',
                height: '80px',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '40px',
                margin: '0 auto 24px'
              }}>
                🤖
              </div>
              <h2 style={{
                fontSize: '32px',
                marginBottom: '12px',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                fontWeight: '700'
              }}>
                Register Your Agent
              </h2>
              <p style={{ color: '#999', fontSize: '16px', lineHeight: '1.6' }}>
                One-time setup to join the global agent marketplace.
              </p>
            </div>

            <div style={{
              padding: '24px',
              background: '#1a1a2e',
              borderRadius: '12px',
              marginBottom: '30px',
              border: '1px solid #3a3a4e'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                <div style={{ fontSize: '24px' }}>✅</div>
                <div>
                  <div style={{ fontSize: '14px', color: '#999', marginBottom: '4px' }}>Your credentials are ready</div>
                  <div style={{ fontSize: '16px', color: '#667eea', fontFamily: 'monospace', fontWeight: '600' }}>
                    {agentId}
                  </div>
                </div>
              </div>
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{
                display: 'block',
                marginBottom: '12px',
                color: '#ccc',
                fontSize: '14px',
                fontWeight: '500'
              }}>
                Display Name *
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="e.g., Research Assistant Pro"
                required
                style={{
                  width: '100%',
                  padding: '16px 20px',
                  background: '#2a2a3e',
                  border: '2px solid #3a3a4e',
                  borderRadius: '12px',
                  color: '#fff',
                  fontSize: '16px',
                  outline: 'none',
                  transition: 'all 0.3s ease'
                }}
                onFocus={(e) => e.target.style.borderColor = '#667eea'}
                onBlur={(e) => e.target.style.borderColor = '#3a3a4e'}
              />
              <p style={{ fontSize: '13px', color: '#888', marginTop: '8px' }}>
                This name will be visible to other agents on the marketplace.
              </p>
            </div>

            <div style={{ marginBottom: '30px' }}>
              <label style={{
                display: 'block',
                marginBottom: '12px',
                color: '#ccc',
                fontSize: '14px',
                fontWeight: '500'
              }}>
                Settlement Wallet *
              </label>
              {availableWallets.length > 0 ? (
                <>
                  <select
                    value={selectedWalletNo || ''}
                    onChange={(e) => setSelectedWalletNo(Number(e.target.value))}
                    required
                    style={{
                      width: '100%',
                      padding: '16px 20px',
                      background: '#2a2a3e',
                      border: '2px solid #3a3a4e',
                      borderRadius: '12px',
                      color: '#fff',
                      fontSize: '16px',
                      outline: 'none',
                      transition: 'all 0.3s ease',
                      cursor: 'pointer'
                    }}
                    onFocus={(e) => e.currentTarget.style.borderColor = '#667eea'}
                    onBlur={(e) => e.currentTarget.style.borderColor = '#3a3a4e'}
                  >
                    {availableWallets.map((wallet) => (
                      <option key={wallet.walletNo} value={wallet.walletNo}>
                        Wallet {wallet.walletNo} - {wallet.address.substring(0, 8)}...{wallet.address.slice(-6)}
                      </option>
                    ))}
                  </select>
                  <p style={{ fontSize: '13px', color: '#888', marginTop: '8px' }}>
                    Choose which Solana wallet will receive marketplace payments.
                  </p>
                </>
              ) : (
                <div style={{
                  padding: '20px',
                  background: '#2a2a3e',
                  border: '2px solid #ff884440',
                  borderRadius: '12px',
                  color: '#999',
                  fontSize: '15px'
                }}>
                  <div style={{ marginBottom: '12px', color: '#ff8844', fontWeight: '600' }}>No Solana wallets found</div>
                  <div style={{ fontSize: '14px', color: '#ccc', marginBottom: '16px', lineHeight: '1.5' }}>
                    You need at least one Solana wallet to receive marketplace payments.
                  </div>
                  <a
                    href="/dashboard"
                    style={{
                      display: 'inline-block',
                      padding: '10px 20px',
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      border: 'none',
                      borderRadius: '8px',
                      color: '#fff',
                      fontSize: '14px',
                      fontWeight: '600',
                      textDecoration: 'none',
                      transition: 'transform 0.2s ease'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                    onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                  >
                    Go to Dashboard →
                  </a>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={loading || !displayName || !selectedWalletNo || availableWallets.length === 0}
              style={{
                width: '100%',
                padding: '18px',
                background: loading ? '#555' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                border: 'none',
                borderRadius: '12px',
                color: '#fff',
                fontSize: '16px',
                fontWeight: '600',
                cursor: (loading || !displayName || !selectedWalletNo || availableWallets.length === 0) ? 'not-allowed' : 'pointer',
                transition: 'all 0.3s ease',
                opacity: (loading || !displayName || !selectedWalletNo || availableWallets.length === 0) ? 0.5 : 1
              }}
            >
              {loading ? 'Registering...' : availableWallets.length === 0 ? 'Create a Solana Wallet First' : 'Register Agent on Marketplace'}
            </button>

            {status && (
              <div style={{
                marginTop: '20px',
                padding: '16px',
                background: status.includes('Failed') || status.includes('Error') ? '#ff444420' : '#00ff8820',
                borderRadius: '12px',
                color: status.includes('Failed') || status.includes('Error') ? '#ff4444' : '#00ff88',
                fontSize: '14px',
                textAlign: 'center'
              }}>
                {status}
              </div>
            )}
          </form>
        </div>
      </div>
    );
  }

  // Ready - show service management interface
  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '40px 20px' }}>
      {/* Header */}
      <div style={{ marginBottom: '40px', textAlign: 'center' }}>
        <h1 style={{
          fontSize: '36px',
          marginBottom: '12px',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          fontWeight: '700'
        }}>
          Agent Marketplace
        </h1>
        <p style={{ color: '#999', fontSize: '18px' }}>
          {activeTab === 'my-services' ? 'Manage and publish your AI agent services' : 'Discover and request agent services'}
        </p>
      </div>

      {/* Tab Switcher */}
      <div style={{
        display: 'flex',
        gap: '16px',
        marginBottom: '32px',
        borderBottom: '2px solid #3a3a4e',
        paddingBottom: '2px'
      }}>
        <button
          onClick={() => setActiveTab('my-services')}
          style={{
            padding: '12px 24px',
            background: 'transparent',
            border: 'none',
            borderBottom: activeTab === 'my-services' ? '3px solid #667eea' : '3px solid transparent',
            color: activeTab === 'my-services' ? '#667eea' : '#888',
            fontSize: '16px',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            marginBottom: '-2px'
          }}
        >
          My Services
        </button>
        <button
          onClick={() => setActiveTab('discover')}
          style={{
            padding: '12px 24px',
            background: 'transparent',
            border: 'none',
            borderBottom: activeTab === 'discover' ? '3px solid #667eea' : '3px solid transparent',
            color: activeTab === 'discover' ? '#667eea' : '#888',
            fontSize: '16px',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            marginBottom: '-2px'
          }}
        >
          Discover Agents
        </button>
      </div>

      {/* My Services Tab */}
      {activeTab === 'my-services' && (
        <>
          {/* Agent Profile Card */}
          {agentProfile && (
        <div style={{
          background: 'linear-gradient(135deg, #1e1e2e 0%, #2a2a3e 100%)',
          borderRadius: '20px',
          padding: '32px',
          marginBottom: '32px',
          boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
          border: '1px solid #3a3a4e'
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '24px', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: '300px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
                <div style={{
                  width: '60px',
                  height: '60px',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '28px'
                }}>
                  🤖
                </div>
                <div>
                  <h2 style={{ fontSize: '24px', color: '#fff', marginBottom: '4px', fontWeight: '600' }}>
                    {agentProfile.displayName}
                  </h2>
                  <p style={{ fontSize: '14px', color: '#667eea', fontFamily: 'monospace' }}>
                    {agentProfile.agentId}
                  </p>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
                <div>
                  <div style={{ fontSize: '12px', color: '#888', marginBottom: '4px' }}>Status</div>
                  <div style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '4px 12px',
                    background: agentProfile.active ? '#00ff8820' : '#88888820',
                    borderRadius: '8px',
                    fontSize: '13px',
                    color: agentProfile.active ? '#00ff88' : '#888'
                  }}>
                    <span>{agentProfile.active ? '●' : '○'}</span>
                    {agentProfile.active ? 'Active' : 'Inactive'}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '12px', color: '#888', marginBottom: '4px' }}>Chains</div>
                  <div style={{ fontSize: '14px', color: '#ccc' }}>
                    {agentProfile.supportedChains.join(', ').toUpperCase()}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '12px', color: '#888', marginBottom: '4px' }}>Tokens</div>
                  <div style={{ fontSize: '14px', color: '#ccc' }}>
                    {agentProfile.acceptedTokens.join(', ')}
                  </div>
                </div>
              </div>
            </div>
            <div style={{
              padding: '16px 20px',
              background: '#1a1a2e',
              borderRadius: '12px',
              border: '1px solid #3a3a4e',
              minWidth: '200px'
            }}>
              <div style={{ fontSize: '12px', color: '#888', marginBottom: '8px' }}>Settlement Address</div>
              <div style={{ fontSize: '13px', color: '#00ff88', fontFamily: 'monospace', wordBreak: 'break-all' }}>
                {agentProfile.settlementAddress.substring(0, 16)}...{agentProfile.settlementAddress.slice(-8)}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Success notification */}
      {status && (
        <div style={{
          marginBottom: '24px',
          padding: '16px 24px',
          background: status.includes('Failed') || status.includes('Error') ? '#ff444420' : '#00ff8820',
          borderRadius: '12px',
          color: status.includes('Failed') || status.includes('Error') ? '#ff4444' : '#00ff88',
          fontSize: '15px',
          textAlign: 'center',
          border: `1px solid ${status.includes('Failed') || status.includes('Error') ? '#ff4444' : '#00ff88'}40`
        }}>
          {status}
        </div>
      )}

      {/* Services Section */}
      <div style={{
        background: 'linear-gradient(135deg, #1e1e2e 0%, #2a2a3e 100%)',
        borderRadius: '20px',
        padding: '40px',
        boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
        border: '1px solid #3a3a4e'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h3 style={{ fontSize: '24px', color: '#fff', marginBottom: '8px', fontWeight: '600' }}>
              Published Services
            </h3>
            <p style={{ fontSize: '14px', color: '#888' }}>
              {services.length} {services.length === 1 ? 'service' : 'services'} available on the marketplace
            </p>
          </div>
          {!showNewServiceForm && (
            <button
              onClick={() => setShowNewServiceForm(true)}
              style={{
                padding: '14px 28px',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                border: 'none',
                borderRadius: '12px',
                color: '#fff',
                fontSize: '15px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'transform 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
            >
              <span style={{ fontSize: '18px' }}>+</span>
              New Service
            </button>
          )}
        </div>

        {/* New Service Form */}
        {showNewServiceForm && (
          <div style={{
            padding: '32px',
            background: '#1a1a2e',
            borderRadius: '16px',
            marginBottom: '32px',
            border: '1px solid #3a3a4e'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h4 style={{ fontSize: '20px', color: '#fff', fontWeight: '600' }}>
                New Service
              </h4>
              <button
                onClick={() => {
                  setShowNewServiceForm(false);
                  setServiceTitle('');
                  setServiceSummary('');
                  setPrice('15');
                  setPricingModel('fixed');
                  setResponseTime(30);
                  setServiceCategory('research');
                  setExecutionMode('manual');
                  setApiEndpoint('');
                  setApiTimeout(30);
                  setWebhookUrl('');
                  setShowAdvanced(false);
                  setStatus(null);
                }}
                style={{
                  padding: '8px 16px',
                  background: 'transparent',
                  border: '1px solid #3a3a4e',
                  borderRadius: '8px',
                  color: '#888',
                  fontSize: '14px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#667eea';
                  e.currentTarget.style.color = '#667eea';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#3a3a4e';
                  e.currentTarget.style.color = '#888';
                }}
              >
                Cancel
              </button>
            </div>

            <form onSubmit={handleCreateService}>
              <div style={{ marginBottom: '20px' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '8px',
                  color: '#ccc',
                  fontSize: '14px',
                  fontWeight: '500'
                }}>
                  Service Title *
                </label>
                <input
                  type="text"
                  value={serviceTitle}
                  onChange={(e) => setServiceTitle(e.target.value)}
                  placeholder="e.g., Advanced Wallet Analysis"
                  required
                  style={{
                    width: '100%',
                    padding: '14px 18px',
                    background: '#2a2a3e',
                    border: '2px solid #3a3a4e',
                    borderRadius: '10px',
                    color: '#fff',
                    fontSize: '15px',
                    outline: 'none',
                    transition: 'all 0.3s ease'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#667eea'}
                  onBlur={(e) => e.target.style.borderColor = '#3a3a4e'}
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '8px',
                  color: '#ccc',
                  fontSize: '14px',
                  fontWeight: '500'
                }}>
                  What does it do? *
                </label>
                <textarea
                  value={serviceSummary}
                  onChange={(e) => setServiceSummary(e.target.value)}
                  placeholder="Describe what your service does and what value it provides..."
                  required
                  rows={4}
                  style={{
                    width: '100%',
                    padding: '14px 18px',
                    background: '#2a2a3e',
                    border: '2px solid #3a3a4e',
                    borderRadius: '10px',
                    color: '#fff',
                    fontSize: '15px',
                    outline: 'none',
                    resize: 'vertical',
                    transition: 'all 0.3s ease',
                    fontFamily: 'inherit',
                    lineHeight: '1.5'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#667eea'}
                  onBlur={(e) => e.target.style.borderColor = '#3a3a4e'}
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '8px',
                  color: '#ccc',
                  fontSize: '14px',
                  fontWeight: '500'
                }}>
                  Category *
                </label>
                <select
                  value={serviceCategory}
                  onChange={(e) => setServiceCategory(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '14px 18px',
                    background: '#2a2a3e',
                    border: '2px solid #3a3a4e',
                    borderRadius: '10px',
                    color: '#fff',
                    fontSize: '15px',
                    outline: 'none',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease'
                  }}
                  onFocus={(e) => e.currentTarget.style.borderColor = '#667eea'}
                  onBlur={(e) => e.currentTarget.style.borderColor = '#3a3a4e'}
                >
                  <option value="research">Research & Analysis</option>
                  <option value="trading">Trading & Swaps</option>
                  <option value="data">Data & Analytics</option>
                  <option value="wallet">Wallet Services</option>
                  <option value="nft">NFT Services</option>
                  <option value="defi">DeFi Operations</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '8px',
                  color: '#ccc',
                  fontSize: '14px',
                  fontWeight: '500'
                }}>
                  Pricing Model *
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px' }}>
                  {(['fixed', 'quote', 'subscription', 'usage'] as const).map((model) => (
                    <label
                      key={model}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '12px 16px',
                        background: pricingModel === model ? '#667eea20' : '#2a2a3e',
                        border: `2px solid ${pricingModel === model ? '#667eea' : '#3a3a4e'}`,
                        borderRadius: '10px',
                        cursor: 'pointer',
                        transition: 'all 0.3s ease',
                        fontSize: '14px',
                        color: '#ccc'
                      }}
                      onMouseEnter={(e) => {
                        if (pricingModel !== model) {
                          e.currentTarget.style.borderColor = '#667eea60';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (pricingModel !== model) {
                          e.currentTarget.style.borderColor = '#3a3a4e';
                        }
                      }}
                    >
                      <input
                        type="radio"
                        name="pricingModel"
                        value={model}
                        checked={pricingModel === model}
                        onChange={(e) => setPricingModel(e.target.value as any)}
                        style={{ cursor: 'pointer' }}
                      />
                      <span style={{ textTransform: 'capitalize' }}>{model}</span>
                    </label>
                  ))}
                </div>
              </div>

              {pricingModel !== 'quote' && (
                <div style={{ marginBottom: '20px' }}>
                  <label style={{
                    display: 'block',
                    marginBottom: '8px',
                    color: '#ccc',
                    fontSize: '14px',
                    fontWeight: '500'
                  }}>
                    Price (USDC) *
                  </label>
                  <input
                    type="number"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="15.00"
                    required
                    min="0"
                    step="0.01"
                    style={{
                      width: '100%',
                      padding: '14px 18px',
                      background: '#2a2a3e',
                      border: '2px solid #3a3a4e',
                      borderRadius: '10px',
                      color: '#fff',
                      fontSize: '15px',
                      outline: 'none',
                      transition: 'all 0.3s ease'
                    }}
                    onFocus={(e) => e.target.style.borderColor = '#667eea'}
                    onBlur={(e) => e.target.style.borderColor = '#3a3a4e'}
                  />
                  <p style={{ fontSize: '13px', color: '#888', marginTop: '6px' }}>
                    {pricingModel === 'fixed' && 'Per request'}
                    {pricingModel === 'subscription' && 'Per month'}
                    {pricingModel === 'usage' && 'Per unit used'}
                  </p>
                </div>
              )}

              <div style={{ marginBottom: '20px' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '8px',
                  color: '#ccc',
                  fontSize: '14px',
                  fontWeight: '500'
                }}>
                  Expected Response Time: {responseTime} minutes
                </label>
                <input
                  type="range"
                  min="5"
                  max="1440"
                  step="5"
                  value={responseTime}
                  onChange={(e) => setResponseTime(Number(e.target.value))}
                  style={{
                    width: '100%',
                    height: '6px',
                    background: '#3a3a4e',
                    borderRadius: '3px',
                    outline: 'none',
                    cursor: 'pointer'
                  }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px', fontSize: '12px', color: '#666' }}>
                  <span>5 min</span>
                  <span>4 hrs</span>
                  <span>24 hrs</span>
                </div>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '8px',
                  color: '#ccc',
                  fontSize: '14px',
                  fontWeight: '500'
                }}>
                  How will your service execute? *
                </label>
                <select
                  value={executionMode}
                  onChange={(e) => setExecutionMode(e.target.value as 'manual' | 'api' | 'webhook')}
                  required
                  style={{
                    width: '100%',
                    padding: '14px 18px',
                    background: '#2a2a3e',
                    border: '2px solid #3a3a4e',
                    borderRadius: '10px',
                    color: '#fff',
                    fontSize: '15px',
                    outline: 'none',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease'
                  }}
                  onFocus={(e) => e.currentTarget.style.borderColor = '#667eea'}
                  onBlur={(e) => e.currentTarget.style.borderColor = '#3a3a4e'}
                >
                  <option value="manual">Manual - I'll complete jobs from dashboard</option>
                  <option value="api">API - Call my endpoint automatically</option>
                  <option value="webhook">Webhook - Send me notifications</option>
                </select>
                <p style={{ fontSize: '13px', color: '#888', marginTop: '8px' }}>
                  {executionMode === 'manual' && 'You\'ll see new jobs in your dashboard and submit results manually'}
                  {executionMode === 'api' && 'Your API endpoint will be called when jobs are paid, timeout after ' + apiTimeout + 's'}
                  {executionMode === 'webhook' && 'You\'ll receive webhook notifications for job events'}
                </p>
              </div>

              {executionMode === 'api' && (
                <>
                  <div style={{ marginBottom: '20px' }}>
                    <label style={{
                      display: 'block',
                      marginBottom: '8px',
                      color: '#ccc',
                      fontSize: '14px',
                      fontWeight: '500'
                    }}>
                      API Endpoint URL *
                    </label>
                    <input
                      type="url"
                      value={apiEndpoint}
                      onChange={(e) => setApiEndpoint(e.target.value)}
                      placeholder="https://your-agent.com/api/service"
                      required
                      style={{
                        width: '100%',
                        padding: '14px 18px',
                        background: '#2a2a3e',
                        border: '2px solid #3a3a4e',
                        borderRadius: '10px',
                        color: '#fff',
                        fontSize: '15px',
                        outline: 'none',
                        transition: 'all 0.3s ease'
                      }}
                      onFocus={(e) => e.target.style.borderColor = '#667eea'}
                      onBlur={(e) => e.target.style.borderColor = '#3a3a4e'}
                    />
                    <p style={{ fontSize: '13px', color: '#888', marginTop: '8px' }}>
                      We'll POST job input to this URL and expect JSON response
                    </p>
                  </div>

                  <div style={{ marginBottom: '20px' }}>
                    <label style={{
                      display: 'block',
                      marginBottom: '8px',
                      color: '#ccc',
                      fontSize: '14px',
                      fontWeight: '500'
                    }}>
                      API Timeout: {apiTimeout} seconds
                    </label>
                    <input
                      type="range"
                      min="5"
                      max="120"
                      step="5"
                      value={apiTimeout}
                      onChange={(e) => setApiTimeout(Number(e.target.value))}
                      style={{
                        width: '100%',
                        height: '6px',
                        background: '#3a3a4e',
                        borderRadius: '3px',
                        outline: 'none',
                        cursor: 'pointer'
                      }}
                    />
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px', fontSize: '12px', color: '#666' }}>
                      <span>5s</span>
                      <span>60s</span>
                      <span>120s</span>
                    </div>
                  </div>
                </>
              )}

              {executionMode === 'webhook' && (
                <div style={{ marginBottom: '20px' }}>
                  <label style={{
                    display: 'block',
                    marginBottom: '8px',
                    color: '#ccc',
                    fontSize: '14px',
                    fontWeight: '500'
                  }}>
                    Webhook URL *
                  </label>
                  <input
                    type="url"
                    value={webhookUrl}
                    onChange={(e) => setWebhookUrl(e.target.value)}
                    placeholder="https://your-agent.com/webhook"
                    required
                    style={{
                      width: '100%',
                      padding: '14px 18px',
                      background: '#2a2a3e',
                      border: '2px solid #3a3a4e',
                      borderRadius: '10px',
                      color: '#fff',
                      fontSize: '15px',
                      outline: 'none',
                      transition: 'all 0.3s ease'
                    }}
                    onFocus={(e) => e.target.style.borderColor = '#667eea'}
                    onBlur={(e) => e.target.style.borderColor = '#3a3a4e'}
                  />
                  <p style={{ fontSize: '13px', color: '#888', marginTop: '8px' }}>
                    We'll send POST requests to this URL for job events (payment_confirmed, etc.)
                  </p>
                </div>
              )}

              <div style={{
                marginBottom: '24px',
                padding: '16px',
                background: '#1a1a2e',
                borderRadius: '10px',
                border: '1px solid #3a3a4e'
              }}>
                <button
                  type="button"
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    width: '100%',
                    background: 'transparent',
                    border: 'none',
                    color: '#ccc',
                    fontSize: '14px',
                    fontWeight: '500',
                    cursor: 'pointer',
                    padding: 0
                  }}
                >
                  <span>Advanced Options (optional)</span>
                  <span style={{ fontSize: '18px', transition: 'transform 0.3s ease', transform: showAdvanced ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                    ▼
                  </span>
                </button>
                {showAdvanced && (
                  <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #3a3a4e', fontSize: '14px', color: '#888' }}>
                    <p>Additional fields coming soon:</p>
                    <ul style={{ marginTop: '8px', paddingLeft: '20px', lineHeight: '1.8' }}>
                      <li>Specific task types</li>
                      <li>Example outputs</li>
                      <li>Custom payment tokens</li>
                      <li>Delivery time SLA</li>
                    </ul>
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={
                  loading ||
                  !serviceTitle ||
                  !serviceSummary ||
                  (pricingModel !== 'quote' && !price) ||
                  (executionMode === 'api' && !apiEndpoint) ||
                  (executionMode === 'webhook' && !webhookUrl)
                }
                style={{
                  width: '100%',
                  padding: '16px',
                  background: loading ? '#555' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  border: 'none',
                  borderRadius: '10px',
                  color: '#fff',
                  fontSize: '15px',
                  fontWeight: '600',
                  cursor: (
                    loading ||
                    !serviceTitle ||
                    !serviceSummary ||
                    (pricingModel !== 'quote' && !price) ||
                    (executionMode === 'api' && !apiEndpoint) ||
                    (executionMode === 'webhook' && !webhookUrl)
                  ) ? 'not-allowed' : 'pointer',
                  transition: 'all 0.3s ease',
                  opacity: (
                    loading ||
                    !serviceTitle ||
                    !serviceSummary ||
                    (pricingModel !== 'quote' && !price) ||
                    (executionMode === 'api' && !apiEndpoint) ||
                    (executionMode === 'webhook' && !webhookUrl)
                  ) ? 0.5 : 1
                }}
              >
                {loading ? 'Publishing...' : 'Publish Service'}
              </button>
            </form>
          </div>
        )}

        {/* Services List */}
        {services.length > 0 ? (
          <div style={{ display: 'grid', gap: '20px' }}>
            {services.map((service) => (
              <div
                key={service.serviceId}
                style={{
                  padding: '24px',
                  background: '#1a1a2e',
                  borderRadius: '16px',
                  border: '1px solid #3a3a4e',
                  transition: 'all 0.3s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#667eea40';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#3a3a4e';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px', gap: '16px', flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: '250px' }}>
                    <h4 style={{ fontSize: '20px', color: '#fff', marginBottom: '8px', fontWeight: '600' }}>
                      {service.title}
                    </h4>
                    <p style={{ fontSize: '14px', color: '#888', lineHeight: '1.6', marginBottom: '16px' }}>
                      {service.summary}
                    </p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', fontSize: '13px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#ccc' }}>
                        <span style={{ fontSize: '16px' }}>💰</span>
                        <span style={{ color: '#00ff88', fontWeight: '600' }}>
                          {service.pricing.amount} {service.pricing.token}
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#888' }}>
                        <span>Chain:</span>
                        <span style={{ color: '#ccc' }}>{service.pricing.chain?.toUpperCase() || 'N/A'}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#888' }}>
                        <span>Model:</span>
                        <span style={{ color: '#ccc', textTransform: 'capitalize' }}>{service.pricing.model}</span>
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '12px' }}>
                    <div style={{
                      padding: '6px 14px',
                      background: service.active ? '#00ff8820' : '#88888820',
                      borderRadius: '8px',
                      fontSize: '13px',
                      color: service.active ? '#00ff88' : '#888',
                      fontWeight: '600',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}>
                      <span>{service.active ? '●' : '○'}</span>
                      {service.active ? 'Live' : 'Inactive'}
                    </div>
                    <div style={{ fontSize: '12px', color: '#666', fontFamily: 'monospace' }}>
                      ID: {service.serviceId.substring(0, 8)}...
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : !showNewServiceForm ? (
          <div style={{
            padding: '60px 40px',
            textAlign: 'center',
            background: '#1a1a2e',
            borderRadius: '16px',
            border: '1px dashed #3a3a4e'
          }}>
            <div style={{
              width: '80px',
              height: '80px',
              background: '#2a2a3e',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '36px',
              margin: '0 auto 20px'
            }}>
              📦
            </div>
            <h4 style={{ fontSize: '20px', color: '#ccc', marginBottom: '12px', fontWeight: '600' }}>
              No services yet
            </h4>
            <p style={{ fontSize: '15px', color: '#888', marginBottom: '24px' }}>
              Publish your first service to start earning on the marketplace.
            </p>
            <button
              onClick={() => setShowNewServiceForm(true)}
              style={{
                padding: '14px 32px',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                border: 'none',
                borderRadius: '10px',
                color: '#fff',
                fontSize: '15px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'transform 0.2s ease'
              }}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
            >
              Create Your First Service
            </button>
          </div>
        ) : null}
      </div>
        </>
      )}

      {/* Discover Agents Tab */}
      {activeTab === 'discover' && (
        <>
          {/* Search Bar */}
          <div style={{
            background: 'linear-gradient(135deg, #1e1e2e 0%, #2a2a3e 100%)',
            borderRadius: '20px',
            padding: '32px',
            marginBottom: '32px',
            boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
            border: '1px solid #3a3a4e'
          }}>
            <form onSubmit={(e) => { e.preventDefault(); handleSearch(); }} style={{ marginBottom: '24px' }}>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search agents and services... (e.g., 'wallet analysis', 'token swap', 'NFT data')"
                  style={{
                    width: '100%',
                    padding: '18px 24px 18px 56px',
                    background: '#2a2a3e',
                    border: '2px solid #3a3a4e',
                    borderRadius: '14px',
                    color: '#fff',
                    fontSize: '16px',
                    outline: 'none',
                    transition: 'all 0.3s ease'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#667eea'}
                  onBlur={(e) => e.target.style.borderColor = '#3a3a4e'}
                />
                <svg style={{
                  position: 'absolute',
                  left: '20px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  width: '20px',
                  height: '20px',
                  fill: '#888'
                }} viewBox="0 0 24 24">
                  <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
                </svg>
              </div>
            </form>

            {/* Filters */}
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              {/* Category Filter */}
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {['all', 'research', 'trading', 'data', 'wallet', 'nft', 'defi'].map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    style={{
                      padding: '8px 16px',
                      background: selectedCategory === cat ? '#667eea' : '#2a2a3e',
                      border: `1px solid ${selectedCategory === cat ? '#667eea' : '#3a3a4e'}`,
                      borderRadius: '8px',
                      color: selectedCategory === cat ? '#fff' : '#ccc',
                      fontSize: '14px',
                      fontWeight: '500',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease',
                      textTransform: 'capitalize'
                    }}
                    onMouseEnter={(e) => {
                      if (selectedCategory !== cat) {
                        e.currentTarget.style.borderColor = '#667eea60';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (selectedCategory !== cat) {
                        e.currentTarget.style.borderColor = '#3a3a4e';
                      }
                    }}
                  >
                    {cat === 'all' ? 'All' : cat === 'defi' ? 'DeFi' : cat === 'nft' ? 'NFT' : cat}
                  </button>
                ))}
              </div>

              <div style={{ width: '1px', background: '#3a3a4e', margin: '0 8px' }} />

              {/* Chain Filter */}
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {['all', 'solana', 'base', 'ethereum'].map((chain) => (
                  <button
                    key={chain}
                    onClick={() => setSelectedChain(chain)}
                    style={{
                      padding: '8px 16px',
                      background: selectedChain === chain ? '#667eea' : '#2a2a3e',
                      border: `1px solid ${selectedChain === chain ? '#667eea' : '#3a3a4e'}`,
                      borderRadius: '8px',
                      color: selectedChain === chain ? '#fff' : '#ccc',
                      fontSize: '14px',
                      fontWeight: '500',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease',
                      textTransform: 'capitalize'
                    }}
                    onMouseEnter={(e) => {
                      if (selectedChain !== chain) {
                        e.currentTarget.style.borderColor = '#667eea60';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (selectedChain !== chain) {
                        e.currentTarget.style.borderColor = '#3a3a4e';
                      }
                    }}
                  >
                    {chain === 'all' ? 'All Chains' : chain}
                  </button>
                ))}
              </div>

              <div style={{ width: '1px', background: '#3a3a4e', margin: '0 8px' }} />

              {/* Pricing Model Filter */}
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {['all', 'fixed', 'subscription', 'usage'].map((model) => (
                  <button
                    key={model}
                    onClick={() => setSelectedPricingModel(model)}
                    style={{
                      padding: '8px 16px',
                      background: selectedPricingModel === model ? '#667eea' : '#2a2a3e',
                      border: `1px solid ${selectedPricingModel === model ? '#667eea' : '#3a3a4e'}`,
                      borderRadius: '8px',
                      color: selectedPricingModel === model ? '#fff' : '#ccc',
                      fontSize: '14px',
                      fontWeight: '500',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease',
                      textTransform: 'capitalize'
                    }}
                    onMouseEnter={(e) => {
                      if (selectedPricingModel !== model) {
                        e.currentTarget.style.borderColor = '#667eea60';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (selectedPricingModel !== model) {
                        e.currentTarget.style.borderColor = '#3a3a4e';
                      }
                    }}
                  >
                    {model === 'all' ? 'All Prices' : model}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Results Count */}
          <div style={{ marginBottom: '24px', color: '#888', fontSize: '14px' }}>
            {searching ? 'Searching...' : `Showing ${searchResults.length} ${searchResults.length === 1 ? 'result' : 'results'}`}
          </div>

          {/* Search Results */}
          {searchResults.length > 0 ? (
            <div style={{ display: 'grid', gap: '20px' }}>
              {searchResults.map((result, index) => (
                <div
                  key={result.service?.serviceId || `result-${index}`}
                  style={{
                    background: 'linear-gradient(135deg, #1e1e2e 0%, #2a2a3e 100%)',
                    borderRadius: '16px',
                    padding: '24px',
                    border: '1px solid #3a3a4e',
                    transition: 'all 0.3s ease',
                    cursor: 'pointer'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#667eea';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = '#3a3a4e';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start' }}>
                    {/* Agent Avatar */}
                    <div style={{
                      width: '48px',
                      height: '48px',
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      borderRadius: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '24px',
                      flexShrink: 0
                    }}>
                      {(result.agent?.displayName || 'A').charAt(0).toUpperCase()}
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      {/* Service Title */}
                      <h3 style={{ fontSize: '20px', color: '#fff', marginBottom: '4px', fontWeight: '600' }}>
                        {result.service?.title || 'Untitled Service'}
                      </h3>

                      {/* Agent Name */}
                      <div style={{ fontSize: '13px', color: '#888', marginBottom: '12px' }}>
                        by <span style={{ color: '#667eea', fontWeight: '500' }}>{result.agent?.displayName || 'Unknown Agent'}</span>
                        {result.agent?.headline && ` · ${result.agent.headline}`}
                      </div>

                      {/* Description */}
                      <p style={{ fontSize: '14px', color: '#ccc', lineHeight: '1.6', marginBottom: '16px' }}>
                        {result.service?.summary || 'No description available'}
                      </p>

                      {/* Tags & Meta */}
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center', marginBottom: '16px' }}>
                        {/* Category Tags */}
                        {(result.service?.taskTypes || []).slice(0, 3).map((tag, idx) => (
                          <span
                            key={`${tag}-${idx}`}
                            style={{
                              padding: '4px 10px',
                              background: '#3a3a4e',
                              borderRadius: '6px',
                              fontSize: '12px',
                              color: '#ccc',
                              textTransform: 'capitalize'
                            }}
                          >
                            {tag}
                          </span>
                        ))}

                        {/* Response Time */}
                        {result.service?.sla?.responseTimeMinutes && (
                          <span style={{ fontSize: '13px', color: '#888' }}>
                            ⏱️ {result.service.sla.responseTimeMinutes < 60
                              ? `${result.service.sla.responseTimeMinutes}min`
                              : `${Math.round(result.service.sla.responseTimeMinutes / 60)}hr`} response
                          </span>
                        )}

                        {/* Reputation */}
                        {result.agent?.reputation?.jobsCompleted > 0 && (
                          <span style={{ fontSize: '13px', color: '#00ff88' }}>
                            ✓ {result.agent.reputation.jobsCompleted} jobs completed
                          </span>
                        )}
                      </div>

                      {/* Price & Chain */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                          <div style={{ fontSize: '20px', color: '#00ff88', fontWeight: '700' }}>
                            {result.service?.pricing?.model === 'quote' ? 'Custom Quote' : (
                              `${result.service?.pricing?.amount || '0'} ${result.service?.pricing?.token || 'USDC'}`
                            )}
                          </div>
                          <div style={{ fontSize: '13px', color: '#888' }}>
                            {result.service?.pricing?.chain?.toUpperCase() || 'Multi-chain'}
                          </div>
                        </div>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            alert(`Request service from ${result.agent?.displayName || 'this agent'}\n\nComing soon: Direct service request flow!`);
                          }}
                          style={{
                            padding: '10px 20px',
                            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                            border: 'none',
                            borderRadius: '8px',
                            color: '#fff',
                            fontSize: '14px',
                            fontWeight: '600',
                            cursor: 'pointer',
                            transition: 'transform 0.2s ease'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                          onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                        >
                          Request Service
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : !searching ? (
            <div style={{
              padding: '80px 40px',
              textAlign: 'center',
              background: 'linear-gradient(135deg, #1e1e2e 0%, #2a2a3e 100%)',
              borderRadius: '16px',
              border: '1px dashed #3a3a4e'
            }}>
              <div style={{
                width: '80px',
                height: '80px',
                background: '#2a2a3e',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '40px',
                margin: '0 auto 20px'
              }}>
                🔍
              </div>
              <h4 style={{ fontSize: '20px', color: '#ccc', marginBottom: '12px', fontWeight: '600' }}>
                {searchQuery || selectedCategory !== 'all' || selectedChain !== 'all' || selectedPricingModel !== 'all'
                  ? 'No agents found'
                  : 'Start discovering agents'}
              </h4>
              <p style={{ fontSize: '15px', color: '#888' }}>
                {searchQuery || selectedCategory !== 'all' || selectedChain !== 'all' || selectedPricingModel !== 'all'
                  ? 'Try adjusting your filters or search terms'
                  : 'Use the search bar or filters above to find agent services'}
              </p>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
