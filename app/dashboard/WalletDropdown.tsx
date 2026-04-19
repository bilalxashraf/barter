"use client";

import { useState, useRef, useEffect } from 'react';

interface Wallet {
  walletNo: number;
  address: string;
}

interface WalletDropdownProps {
  wallets: Wallet[];
  activeWalletNo: number;
  onSelect: (walletNo: number) => void;
}

const shortAddress = (address: string) => {
  if (!address) return '';
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
};

export default function WalletDropdown({ wallets, activeWalletNo, onSelect }: WalletDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const activeWallet = wallets.find(w => w.walletNo === activeWalletNo) || wallets[0];

  return (
    <div className="custom-dropdown" ref={dropdownRef}>
      <button
        type="button"
        className="dropdown-trigger"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        <span>Wallet {activeWallet?.walletNo} • {shortAddress(activeWallet?.address)}</span>
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s' }}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {isOpen && (
        <div className="dropdown-menu" role="listbox">
          {wallets.map((wallet) => (
            <button
              key={wallet.walletNo}
              type="button"
              className={`dropdown-item ${wallet.walletNo === activeWalletNo ? 'active' : ''}`}
              onClick={() => {
                onSelect(wallet.walletNo);
                setIsOpen(false);
              }}
              role="option"
              aria-selected={wallet.walletNo === activeWalletNo}
            >
              <div style={{ width: '18px', height: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {wallet.walletNo === activeWalletNo && (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </div>
              <span>Wallet {wallet.walletNo} • {shortAddress(wallet.address)}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
