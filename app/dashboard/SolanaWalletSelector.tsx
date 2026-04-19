"use client";

import { useState } from 'react';
import SolanaWalletDropdown from './SolanaWalletDropdown';

interface Wallet {
  walletNo: number;
  address: string;
}

interface SolanaWalletSelectorProps {
  wallets: Wallet[];
  activeWalletNo: number;
}

export default function SolanaWalletSelector({ wallets, activeWalletNo }: SolanaWalletSelectorProps) {
  const [selectedWallet, setSelectedWallet] = useState(activeWalletNo);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSelect = async (walletNo: number) => {
    setSelectedWallet(walletNo);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const formData = new FormData();
    formData.append('walletNo', selectedWallet.toString());
    formData.append('networkId', 'solana');

    try {
      await fetch('/api/agent/wallets/default', {
        method: 'POST',
        body: formData
      });
      window.location.reload();
    } catch (error) {
      console.error('Failed to set default Solana wallet:', error);
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="wallet-select">
      <SolanaWalletDropdown
        wallets={wallets}
        activeWalletNo={selectedWallet}
        onSelect={handleSelect}
      />
      <button
        className="button ghost"
        type="submit"
        disabled={isSubmitting || selectedWallet === activeWalletNo}
      >
        {isSubmitting ? 'Setting...' : 'Set default'}
      </button>
    </form>
  );
}
