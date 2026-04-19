'use client';

import { useState, useEffect } from 'react';
import type { PaymentLink } from '../../_lib/agentApi';

type Props = {
  link: PaymentLink;
  recipientAddress: string;
  tokenAddress: string;
  decimals: number;
};

declare global {
  interface Window {
    ethereum?: any;
    solana?: any;
  }
}

type SolanaConnection = import('@solana/web3.js').Connection;
type SolanaBlockhash = Awaited<ReturnType<SolanaConnection['getLatestBlockhash']>>;
type SolanaSignatureStatus = Awaited<ReturnType<SolanaConnection['getSignatureStatuses']>>['value'][number];

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function isConfirmedSolanaStatus(status: SolanaSignatureStatus): boolean {
  return Boolean(
    status &&
    !status.err &&
    (
      status.confirmationStatus === 'confirmed' ||
      status.confirmationStatus === 'finalized' ||
      status.confirmations === null
    )
  );
}

export default function PaymentCheckout({ link, recipientAddress, tokenAddress, decimals }: Props) {
  const [walletConnected, setWalletConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);

  const isSolana = link.chain.toLowerCase() === 'solana';
  const isExpired = link.expiresAt && link.expiresAt < Date.now();
  const isPaid = link.status === 'paid';

  useEffect(() => {
    checkWalletConnection();
  }, []);

  const checkWalletConnection = async () => {
    if (isSolana) {
      if (window.solana && window.solana.isConnected) {
        const publicKey = window.solana.publicKey?.toString();
        if (publicKey) {
          setWalletConnected(true);
          setWalletAddress(publicKey);
        }
      }
    } else {
      if (window.ethereum) {
        try {
          const accounts = await window.ethereum.request({ method: 'eth_accounts' });
          if (accounts.length > 0) {
            setWalletConnected(true);
            setWalletAddress(accounts[0]);
          }
        } catch (err) {
          console.error('Failed to check wallet connection:', err);
        }
      }
    }
  };

  const connectMetaMask = async () => {
    if (!window.ethereum) {
      setError('MetaMask not detected. Please install MetaMask extension.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      setWalletConnected(true);
      setWalletAddress(accounts[0]);

      // Check chain
      const chainId = await window.ethereum.request({ method: 'eth_chainId' });
      const expectedChainId = getChainId(link.chain);

      if (chainId !== expectedChainId) {
        try {
          await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: expectedChainId }],
          });
        } catch (switchError: any) {
          if (switchError.code === 4902) {
            setError(`Please add ${link.chain} network to MetaMask`);
          } else {
            setError(`Please switch to ${link.chain} network in MetaMask`);
          }
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to connect MetaMask');
    } finally {
      setLoading(false);
    }
  };

  const connectPhantom = async () => {
    if (!window.solana) {
      setError('Phantom wallet not detected. Please install Phantom extension.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await window.solana.connect();
      setWalletConnected(true);
      setWalletAddress(response.publicKey.toString());
    } catch (err: any) {
      setError(err.message || 'Failed to connect Phantom');
    } finally {
      setLoading(false);
    }
  };

  const executePayment = async () => {
    if (!walletConnected || !walletAddress) {
      setError('Please connect your wallet first');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      if (isSolana) {
        await executeSolanaPayment();
      } else {
        await executeEVMPayment();
      }
    } catch (err: any) {
      setError(err.message || 'Payment failed');
    } finally {
      setLoading(false);
    }
  };

  const executeEVMPayment = async () => {
    if (!window.ethereum) throw new Error('MetaMask not found');

    // Create Web3 provider
    const provider = window.ethereum;

    // ERC20 Transfer ABI
    const transferABI = ['function transfer(address to, uint256 amount) returns (bool)'];

    // Calculate amount with decimals
    const amount = BigInt(parseFloat(link.amount) * Math.pow(10, decimals));

    // Build transaction
    const data = encodeTransferData(recipientAddress, amount.toString());

    const txParams = {
      from: walletAddress,
      to: tokenAddress,
      data: data,
      value: '0x0',
    };

    // Send transaction
    const hash = await provider.request({
      method: 'eth_sendTransaction',
      params: [txParams],
    });

    setSuccess('Payment sent successfully!');
    setTxHash(hash);

    // Wait for confirmation
    waitForConfirmation(hash);
  };

  const executeSolanaPayment = async () => {
    if (!window.solana) throw new Error('Phantom wallet not found');

    try {
      // Dynamic import of Solana web3
      const { PublicKey, SystemProgram, Transaction, LAMPORTS_PER_SOL } = await import('@solana/web3.js');

      // Use Alchemy RPC endpoint instead of public endpoint
      const rpcUrl = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';
      const connection = new (await import('@solana/web3.js')).Connection(
        rpcUrl,
        'confirmed'
      );

      const fromPubkey = new PublicKey(walletAddress!);
      const toPubkey = new PublicKey(recipientAddress);

      let transaction: any;

      // Check if it's native SOL or SPL token
      if (link.token.toUpperCase() === 'SOL') {
        // Native SOL transfer
        const lamports = Math.floor(parseFloat(link.amount) * LAMPORTS_PER_SOL);

        transaction = new Transaction().add(
          SystemProgram.transfer({
            fromPubkey,
            toPubkey,
            lamports,
          })
        );
      } else {
        // SPL Token transfer
        const {
          TOKEN_PROGRAM_ID,
          getAssociatedTokenAddress,
          createTransferInstruction,
          createAssociatedTokenAccountInstruction,
          getAccount
        } = await import('@solana/spl-token');

        const mintPubkey = new PublicKey(tokenAddress);
        const amount = BigInt(Math.floor(parseFloat(link.amount) * Math.pow(10, decimals)));

        // Get associated token accounts
        const fromTokenAccount = await getAssociatedTokenAddress(mintPubkey, fromPubkey);
        const toTokenAccount = await getAssociatedTokenAddress(mintPubkey, toPubkey);

        transaction = new Transaction();

        // Check if recipient's token account exists, if not create it
        try {
          await getAccount(connection, toTokenAccount);
        } catch (err) {
          // Account doesn't exist, create it
          transaction.add(
            createAssociatedTokenAccountInstruction(
              fromPubkey,       // payer
              toTokenAccount,   // ata
              toPubkey,         // owner
              mintPubkey        // mint
            )
          );
        }

        // Add transfer instruction
        transaction.add(
          createTransferInstruction(
            fromTokenAccount,
            toTokenAccount,
            fromPubkey,
            amount,
            [],
            TOKEN_PROGRAM_ID
          )
        );
      }

      // Get recent blockhash
      const latestBlockhash = await connection.getLatestBlockhash('confirmed');
      transaction.recentBlockhash = latestBlockhash.blockhash;
      transaction.feePayer = fromPubkey;

      // Sign and send transaction
      const signed = await window.solana.signTransaction(transaction);
      const signature = await connection.sendRawTransaction(signed.serialize(), {
        skipPreflight: false,
        preflightCommitment: 'confirmed',
        maxRetries: 5
      });

      setSuccess('Payment sent successfully. Waiting for Solana confirmation...');
      setTxHash(signature);

      await confirmSolanaSignature(connection, signature, latestBlockhash);

      setSuccess('Payment confirmed on-chain. Verifying payment status...');

      await confirmBackendPayment(signature);
      setSuccess('Payment confirmed and verified!');

    } catch (err: any) {
      console.error('Solana payment error:', err);
      throw new Error(err.message || 'Failed to send Solana payment');
    }
  };

  const confirmSolanaSignature = async (
    connection: SolanaConnection,
    signature: string,
    latestBlockhash: SolanaBlockhash
  ) => {
    try {
      const confirmation = await connection.confirmTransaction(
        {
          signature,
          blockhash: latestBlockhash.blockhash,
          lastValidBlockHeight: latestBlockhash.lastValidBlockHeight
        },
        'confirmed'
      );

      if (confirmation.value.err) {
        throw new Error('Transaction failed: ' + JSON.stringify(confirmation.value.err));
      }
      return;
    } catch (err) {
      console.warn('Primary Solana confirmation failed, checking signature history:', err);
    }

    const statuses = await connection.getSignatureStatuses([signature], {
      searchTransactionHistory: true
    });
    const status = statuses.value[0];

    if (isConfirmedSolanaStatus(status)) {
      return;
    }

    if (status?.err) {
      throw new Error('Transaction failed: ' + JSON.stringify(status.err));
    }

    throw new Error('Unable to confirm Solana payment before the blockhash expired');
  };

  const confirmBackendPayment = async (signature: string) => {
    const apiBaseUrl = process.env.NEXT_PUBLIC_AGENT_API_BASE_URL || 'http://localhost:4010';
    let lastError: string | null = null;

    for (let attempt = 1; attempt <= 8; attempt++) {
      const response = await fetch(`${apiBaseUrl}/payments/links/${link.linkId}/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          txHash: signature,
          payerAddress: walletAddress,
          chain: link.chain
        })
      });

      if (response.ok) {
        return;
      }

      const body = await response.json().catch(() => ({}));
      const message =
        body?.error?.message ||
        body?.message ||
        `Failed to verify payment (${response.status})`;

      if (message.includes('Payment link is paid')) {
        return;
      }

      lastError = message;
      const shouldRetry =
        message.includes('Transaction not yet confirmed') ||
        message.includes('Transaction signature not found on Solana') ||
        message.includes('Failed to verify transaction signature');

      if (!shouldRetry || attempt === 8) {
        throw new Error(message);
      }

      await sleep(1500 * attempt);
    }

    throw new Error(lastError || 'Failed to verify payment with backend');
  };

  const encodeTransferData = (to: string, amount: string) => {
    // Simple ERC20 transfer encoding
    // transfer(address,uint256) = 0xa9059cbb
    const methodId = '0xa9059cbb';
    const paddedAddress = to.slice(2).padStart(64, '0');
    const paddedAmount = BigInt(amount).toString(16).padStart(64, '0');
    return methodId + paddedAddress + paddedAmount;
  };

  const waitForConfirmation = async (hash: string) => {
    // Poll for transaction receipt
    const provider = window.ethereum;
    let attempts = 0;
    const maxAttempts = 60;

    const checkReceipt = async () => {
      try {
        const receipt = await provider.request({
          method: 'eth_getTransactionReceipt',
          params: [hash],
        });

        if (receipt) {
          if (receipt.status === '0x1') {
            setSuccess('Payment confirmed on-chain!');
          } else {
            setError('Transaction failed. Please try again.');
          }
          return true;
        }

        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(checkReceipt, 2000);
        }
      } catch (err) {
        console.error('Error checking receipt:', err);
      }
    };

    checkReceipt();
  };

  const getChainId = (chain: string): string => {
    const chainIds: Record<string, string> = {
      base: '0x2105',
      ethereum: '0x1',
      optimism: '0xa',
      arbitrum: '0xa4b1',
      bsc: '0x38',
    };
    return chainIds[chain.toLowerCase()] || '0x1';
  };

  const getExplorerUrl = (hash: string): string => {
    const explorers: Record<string, string> = {
      base: 'https://basescan.org/tx/',
      ethereum: 'https://etherscan.io/tx/',
      optimism: 'https://optimistic.etherscan.io/tx/',
      arbitrum: 'https://arbiscan.io/tx/',
      bsc: 'https://bscscan.com/tx/',
      solana: 'https://solscan.io/tx/',
    };
    const baseUrl = explorers[link.chain.toLowerCase()] || explorers.ethereum;
    return `${baseUrl}${hash}`;
  };

  if (isPaid) {
    return (
      <div className="card" style={{ maxWidth: 600, margin: '0 auto' }}>
        <h4 style={{ color: '#44ff44' }}>✓ Payment Completed</h4>
        <p>This payment link has already been paid.</p>
        {link.txHash && (
          <a
            href={getExplorerUrl(link.txHash)}
            target="_blank"
            rel="noreferrer"
            className="button secondary"
            style={{ marginTop: 16 }}
          >
            View Transaction
          </a>
        )}
      </div>
    );
  }

  if (isExpired) {
    return (
      <div className="card" style={{ maxWidth: 600, margin: '0 auto', borderColor: 'rgba(255, 0, 0, 0.3)' }}>
        <h4 style={{ color: '#ff4444' }}>Payment Link Expired</h4>
        <p>This payment link has expired and can no longer be used.</p>
        {link.expiresAt && (
          <p className="muted" style={{ fontSize: '0.9rem' }}>
            Expired: {new Date(link.expiresAt).toLocaleString()}
          </p>
        )}
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 600, margin: '0 auto' }}>
      <div className="card">
        <h4>Payment Details</h4>
        <div style={{ display: 'grid', gap: 12, marginTop: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span className="muted">Amount:</span>
            <strong style={{ fontSize: '1.2rem' }}>{link.amount} {link.token}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span className="muted">Chain:</span>
            <strong>{link.chain.toUpperCase()}</strong>
          </div>
          {link.description && (
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span className="muted">Description:</span>
              <span>{link.description}</span>
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span className="muted">Recipient:</span>
            <span style={{ fontSize: '0.85rem', fontFamily: 'monospace' }}>
              {recipientAddress.slice(0, 6)}...{recipientAddress.slice(-4)}
            </span>
          </div>
          {link.expiresAt && (
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span className="muted">Expires:</span>
              <span style={{ fontSize: '0.85rem' }}>{new Date(link.expiresAt).toLocaleString()}</span>
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="card" style={{ marginTop: 16, borderColor: 'rgba(255, 0, 0, 0.3)', background: 'rgba(255, 0, 0, 0.05)' }}>
          <strong style={{ color: '#ff4444' }}>Error:</strong> {error}
        </div>
      )}

      {success && (
        <div className="card" style={{ marginTop: 16, borderColor: 'rgba(0, 255, 0, 0.3)', background: 'rgba(0, 255, 0, 0.05)' }}>
          <strong style={{ color: '#44ff44' }}>Success!</strong> {success}
          {txHash && (
            <div style={{ marginTop: 12 }}>
              <a
                href={getExplorerUrl(txHash)}
                target="_blank"
                rel="noreferrer"
                className="button secondary"
              >
                View on Explorer
              </a>
            </div>
          )}
        </div>
      )}

      <div className="card" style={{ marginTop: 16 }}>
        <h4>Connect Wallet</h4>
        {!walletConnected ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 12 }}>
            {isSolana ? (
              <button
                className="button primary"
                onClick={connectPhantom}
                disabled={loading}
                style={{ width: '100%' }}
              >
                {loading ? 'Connecting...' : 'Connect Phantom Wallet'}
              </button>
            ) : (
              <button
                className="button primary"
                onClick={connectMetaMask}
                disabled={loading}
                style={{ width: '100%' }}
              >
                {loading ? 'Connecting...' : 'Connect MetaMask'}
              </button>
            )}
            <p className="muted" style={{ fontSize: '0.85rem', textAlign: 'center' }}>
              {isSolana
                ? 'Install Phantom from phantom.app'
                : 'Install MetaMask from metamask.io'}
            </p>
          </div>
        ) : (
          <div>
            <div style={{ padding: 12, background: 'rgba(0, 255, 0, 0.1)', borderRadius: 6, marginTop: 12 }}>
              <p className="muted" style={{ fontSize: '0.85rem', marginBottom: 4 }}>Connected:</p>
              <p style={{ fontFamily: 'monospace', fontSize: '0.9rem' }}>
                {walletAddress?.slice(0, 8)}...{walletAddress?.slice(-6)}
              </p>
            </div>
            <button
              className="button primary"
              onClick={executePayment}
              disabled={loading || !!success}
              style={{ width: '100%', marginTop: 16, fontSize: '1.1rem', padding: '12px' }}
            >
              {loading ? 'Processing...' : `Pay ${link.amount} ${link.token}`}
            </button>
          </div>
        )}
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <h4>Payment Instructions</h4>
        <ol style={{ paddingLeft: 20, marginTop: 12, lineHeight: 1.6 }}>
          <li>Connect your {isSolana ? 'Phantom' : 'MetaMask'} wallet</li>
          <li>Ensure you have enough {link.token} and network fees</li>
          <li>Click the "Pay" button and confirm the transaction</li>
          <li>Wait for confirmation (usually 10-30 seconds)</li>
        </ol>
      </div>
    </div>
  );
}
