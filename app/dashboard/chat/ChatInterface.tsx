'use client';

import { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

type Message = {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  error?: boolean;
  txHash?: string;
  explorerUrl?: string;
  chain?: string;
};

type Wallet = {
  agentId: string;
  walletNo: number;
  address: string;
  networkId: string;
  createdAt: number;
};

type Props = {
  agentId: string;
  apiKey: string;
  username: string;
  wallets: Wallet[];
  solanaWallets: Wallet[];
};

export default function ChatInterface({ agentId, apiKey, username, wallets, solanaWallets }: Props) {
  const [selectedChain, setSelectedChain] = useState<'solana' | 'base'>('solana');
  const [selectedWalletNo, setSelectedWalletNo] = useState<number | null>(null);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '0',
      role: 'system',
      content: `welcome **@${username}**! i'm barter, your onchain execution assistant.

use the dropdown above to select your chain (**solana** or **base**) and wallet, then ask me to:

- swap tokens
- check balances
- transfer tokens
- get token prices

just type naturally and i'll handle the rest.`,
      timestamp: Date.now()
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [debugMode, setDebugMode] = useState(false);
  const [lastResponse, setLastResponse] = useState<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Get available wallets for selected chain
  const availableWallets = selectedChain === 'solana' ? solanaWallets : wallets;

  // Auto-select first wallet when chain changes or on mount
  useEffect(() => {
    if (availableWallets.length > 0 && selectedWalletNo === null) {
      setSelectedWalletNo(availableWallets[0].walletNo);
    } else if (availableWallets.length > 0 && !availableWallets.find(w => w.walletNo === selectedWalletNo)) {
      // If selected wallet doesn't exist in current chain, select first one
      setSelectedWalletNo(availableWallets[0].walletNo);
    }
  }, [selectedChain, availableWallets, selectedWalletNo]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const formatResponse = (result: any, chain: string, txHash?: string): string => {
    console.log('Formatting response:', JSON.stringify(result, null, 2));

    // PRIORITY 1: Use the pre-formatted response from the API (already LLM-formatted)
    if (result.response && typeof result.response === 'string' && result.response.trim()) {
      console.log('Using pre-formatted API response');
      let response = result.response.trim();

      // Remove markdown images to keep it clean
      response = response.replace(/!\[.*?\]\(.*?\)/g, '');

      // Add transaction hash if available
      const shortHash = txHash ? `\n\ntx: ${txHash.slice(0, 6)}...${txHash.slice(-4)}` : '';
      return response + shortHash;
    }

    // PRIORITY 2: Check for tool results with specific data types
    if (result.toolResults && Array.isArray(result.toolResults)) {
      let response = '';

      for (const tool of result.toolResults) {
        console.log('Processing tool:', tool.toolName, tool.result);

        // Balance/Holdings response
        if (tool.result?.holdings || tool.result?.balance) {
          const holdings = tool.result.holdings || [];
          const totalUsd = tool.result.totalUsd;

          if (holdings.length === 0) {
            response += `your ${chain} wallet is empty. fund it to start trading.\n`;
          } else {
            response += `💰 your ${chain} balance:\n\n`;
            holdings.forEach((token: any) => {
              const symbol = token.symbol || 'unknown';
              const balance = token.balance || token.uiAmount || '0';
              const valueUsd = token.valueUsd || token.priceUsd;

              if (valueUsd && parseFloat(valueUsd) > 0.01) {
                response += `${balance} ${symbol} (~$${parseFloat(valueUsd).toFixed(2)})\n`;
              } else {
                response += `${balance} ${symbol}\n`;
              }
            });

            if (totalUsd && parseFloat(totalUsd) > 0) {
              response += `\ntotal: $${parseFloat(totalUsd).toFixed(2)}`;
            }
          }
        }
        // Token price/info response
        else if (tool.result?.priceUsd || tool.result?.marketCap) {
          const symbol = tool.result.symbol || tool.result.name || 'token';
          const price = tool.result.priceUsd;
          const mcap = tool.result.marketCap;

          response += `💵 ${symbol.trim()}\n`;
          if (price) response += `price: $${parseFloat(price).toFixed(8)}\n`;
          if (mcap) response += `market cap: $${parseFloat(mcap).toLocaleString()}\n`;

          if (tool.result.priceChange24h) {
            const change = parseFloat(tool.result.priceChange24h);
            const emoji = change > 0 ? '📈' : '📉';
            response += `24h change: ${emoji} ${change > 0 ? '+' : ''}${change.toFixed(2)}%\n`;
          }
        }
        // Generic message from tool
        else if (tool.result?.message) {
          response += tool.result.message + '\n';
        }
        // Swap/Transfer with details
        else if (tool.result?.fromToken && tool.result?.toToken) {
          const from = `${tool.result.fromAmount || ''} ${tool.result.fromToken}`;
          const to = `${tool.result.toAmount || ''} ${tool.result.toToken}`;
          response += `✅ swapped ${from} → ${to}\n`;
        }
      }

      if (response) {
        const shortHash = txHash ? `\n\ntx: ${txHash.slice(0, 6)}...${txHash.slice(-4)}` : '';
        return response.trim() + shortHash;
      }
    }

    // PRIORITY 3: Direct message field
    if (result.message) {
      const shortHash = txHash ? `\n\ntx: ${txHash.slice(0, 6)}...${txHash.slice(-4)}` : '';
      return result.message + shortHash;
    }

    // FALLBACK
    console.warn('No matching response format found, using fallback');
    const shortHash = txHash ? `\n\ntx: ${txHash.slice(0, 6)}...${txHash.slice(-4)}` : '';
    return txHash
      ? `✅ executed successfully on ${chain}!${shortHash}`
      : `✅ executed successfully on ${chain}!`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: Date.now(),
      chain: selectedChain
    };

    setMessages(prev => [...prev, userMessage]);
    const promptText = input.trim();
    setInput('');
    setIsLoading(true);

    try {
      // Use selected chain
      const chain = selectedChain;
      const endpoint = chain === 'solana' ? '/agent/execute/solana' : '/agent/execute';

      // Use the selected wallet
      const walletNo = selectedWalletNo;

      if (!walletNo) {
        throw new Error(`no ${chain} wallet selected. please select a wallet from the dropdown.`);
      }

      const baseUrl = process.env.NEXT_PUBLIC_AGENT_API_BASE_URL || 'https://api.ignotusai.xyz';

      console.log('Sending request:', {
        url: `${baseUrl}${endpoint}`,
        agentId,
        walletNo,
        prompt: promptText
      });

      const response = await fetch(`${baseUrl}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': apiKey
        },
        body: JSON.stringify({
          agentId,
          prompt: promptText,
          walletNo
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('API Error:', errorData);
        throw new Error(errorData?.error?.message || `execution failed (${response.status})`);
      }

      const result = await response.json();
      console.log('API Response:', result);
      setLastResponse(result); // Store for debug view

      // Extract transaction hash
      let txHash: string | undefined;
      let explorerUrl: string | undefined;

      if (result.txHash || result.transactionHash || result.signature) {
        txHash = result.txHash || result.transactionHash || result.signature;
      } else if (result.quote?.txHash) {
        txHash = result.quote.txHash;
      } else if (result.toolResults) {
        for (const item of result.toolResults) {
          if (item.result?.txHash || item.result?.transactionHash || item.result?.signature) {
            txHash = item.result.txHash || item.result.transactionHash || item.result.signature;
            break;
          }
        }
      }

      // Generate explorer URL
      if (txHash) {
        const explorers: Record<string, string> = {
          solana: `https://solscan.io/tx/${txHash}`,
          base: `https://basescan.org/tx/${txHash}`,
          ethereum: `https://etherscan.io/tx/${txHash}`,
          arbitrum: `https://arbiscan.io/tx/${txHash}`,
          optimism: `https://optimistic.etherscan.io/tx/${txHash}`,
          polygon: `https://polygonscan.com/tx/${txHash}`
        };
        explorerUrl = explorers[chain] || explorers.base;
      }

      // Format response
      const responseContent = formatResponse(result, chain, txHash);

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: responseContent,
        timestamp: Date.now(),
        txHash,
        explorerUrl,
        chain
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Execution error:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `❌ ${error instanceof Error ? error.message : 'execution failed'}`,
        timestamp: Date.now(),
        error: true
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const examplePrompts = selectedChain === 'solana'
    ? [
        "what's my balance?",
        "swap 0.1 sol to usdc",
        "price of sol",
        "send 10 usdc to [address]"
      ]
    : [
        "what's my balance?",
        "swap 0.01 eth to usdc",
        "price of eth",
        "send 5 usdc to [address]"
      ];

  const hasWallet = availableWallets.length > 0;
  const currentWallet = availableWallets.find(w => w.walletNo === selectedWalletNo);

  return (
    <div className="chat-container">
      <div className="chat-header">
        <div className="chat-header-info">
          <h3>chat with barter</h3>
          <p className="muted">
            {currentWallet
              ? `${currentWallet.address.slice(0, 6)}...${currentWallet.address.slice(-4)}`
              : `no ${selectedChain} wallet found`}
          </p>
        </div>
        <div className="chat-header-actions">
          <button
            type="button"
            onClick={() => setDebugMode(!debugMode)}
            className="chat-debug-toggle"
            title="Toggle debug mode"
          >
            {debugMode ? '🔍 on' : '🔍 off'}
          </button>
          <div className="chat-chain-selector">
            <label htmlFor="chain-select">chain:</label>
            <select
              id="chain-select"
              value={selectedChain}
              onChange={(e) => setSelectedChain(e.target.value as 'solana' | 'base')}
              disabled={isLoading}
              className="chain-select"
            >
              <option value="solana">Solana</option>
              <option value="base">Base</option>
            </select>
          </div>
          {hasWallet && (
            <div className="chat-wallet-selector">
              <label htmlFor="wallet-select">wallet:</label>
              <select
                id="wallet-select"
                value={selectedWalletNo || ''}
                onChange={(e) => setSelectedWalletNo(Number(e.target.value))}
                disabled={isLoading}
                className="wallet-select"
              >
                {availableWallets.map((wallet) => (
                  <option key={wallet.walletNo} value={wallet.walletNo}>
                    Wallet {wallet.walletNo} • {wallet.address.slice(0, 4)}...{wallet.address.slice(-4)}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      <div className="chat-messages">
        {messages.map(msg => (
          <div key={msg.id} className={`chat-message chat-message-${msg.role}`}>
            <div className="chat-message-header">
              <span className="chat-message-role">
                {msg.role === 'user' ? `@${username}` : msg.role === 'system' ? 'barter' : 'barter'}
              </span>
              {msg.chain && (
                <span className="chat-message-chain">{msg.chain}</span>
              )}
              <span className="chat-message-time">
                {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
            <div className="chat-message-content">
              {msg.role === 'assistant' || msg.role === 'system' ? (
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    // Custom link styling
                    a: ({ node, ...props }) => (
                      <a {...props} target="_blank" rel="noreferrer" className="chat-markdown-link" />
                    ),
                    // Remove images (we already filter them)
                    img: () => null,
                    // Custom styling for other elements
                    p: ({ node, ...props }) => <p {...props} className="chat-markdown-p" />,
                    ul: ({ node, ...props }) => <ul {...props} className="chat-markdown-ul" />,
                    ol: ({ node, ...props }) => <ol {...props} className="chat-markdown-ol" />,
                    li: ({ node, ...props }) => <li {...props} className="chat-markdown-li" />,
                    strong: ({ node, ...props }) => <strong {...props} className="chat-markdown-strong" />,
                    code: ({ node, ...props }) => <code {...props} className="chat-markdown-code" />,
                    h1: ({ node, ...props }) => <h3 {...props} className="chat-markdown-h" />,
                    h2: ({ node, ...props }) => <h4 {...props} className="chat-markdown-h" />,
                    h3: ({ node, ...props }) => <h4 {...props} className="chat-markdown-h" />,
                  }}
                >
                  {msg.content}
                </ReactMarkdown>
              ) : (
                <span style={{ whiteSpace: 'pre-wrap' }}>{msg.content}</span>
              )}
              {msg.explorerUrl && (
                <div style={{ marginTop: 12 }}>
                  <a
                    href={msg.explorerUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="chat-explorer-link"
                  >
                    view on explorer →
                  </a>
                </div>
              )}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="chat-message chat-message-assistant">
            <div className="chat-message-header">
              <span className="chat-message-role">barter</span>
            </div>
            <div className="chat-message-content">
              <div className="chat-loading">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="chat-examples">
        <span className="chat-examples-label">try these:</span>
        {examplePrompts.map((prompt, idx) => (
          <button
            key={idx}
            className="chat-example-button"
            onClick={() => setInput(prompt)}
            disabled={isLoading}
          >
            {prompt}
          </button>
        ))}
      </div>

      {!hasWallet && (
        <div className="chat-wallet-warning">
          <strong>⚠️ no {selectedChain} wallet found</strong>
          <p>create a {selectedChain} wallet in your <a href="/dashboard">dashboard</a> to start using the chat.</p>
        </div>
      )}

      {debugMode && lastResponse && (
        <div className="chat-debug-panel">
          <div className="chat-debug-header">
            <strong>🔍 debug: last api response</strong>
            <button onClick={() => setDebugMode(false)} className="chat-debug-close">close</button>
          </div>
          <pre className="chat-debug-content">
            {JSON.stringify(lastResponse, null, 2)}
          </pre>
        </div>
      )}

      <form onSubmit={handleSubmit} className="chat-input-form">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={hasWallet ? "ask me to swap, transfer, or check balances..." : `create a ${selectedChain} wallet first...`}
          className="chat-input"
          disabled={isLoading || !hasWallet}
          autoFocus={hasWallet}
        />
        <button
          type="submit"
          className="button primary chat-submit"
          disabled={isLoading || !input.trim() || !hasWallet}
        >
          {isLoading ? 'executing...' : 'send'}
        </button>
      </form>
    </div>
  );
}
