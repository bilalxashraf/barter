"use client";

import { useState } from 'react';
import WalletDropdown from './WalletDropdown';

interface Wallet {
  walletNo: number;
  address: string;
}

interface WalletSelectorProps {
  wallets: Wallet[];
  activeWalletNo: number;
}

export default function WalletSelector({ wallets, activeWalletNo }: WalletSelectorProps) {
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

    try {
      await fetch('/api/agent/wallets/default', {
        method: 'POST',
        body: formData
      });
      window.location.reload();
    } catch (error) {
      console.error('Failed to set default wallet:', error);
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="wallet-select">
      <WalletDropdown
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
