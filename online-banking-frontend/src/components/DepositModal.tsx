import React, { useState } from 'react';
import type { Account } from '../types';

interface DepositModalProps {
  isOpen: boolean;
  onClose: () => void;
  accounts: Account[];
  onDeposit: (accountId: string, amount: number, note?: string) => void;
  selectedAccountId?: string;
}

export const DepositModal: React.FC<DepositModalProps> = ({
  isOpen,
  onClose,
  accounts,
  onDeposit,
  selectedAccountId,
}) => {
  const [accountId, setAccountId] = useState(selectedAccountId || accounts[0]?.id || '');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setError('Please enter a valid deposit amount');
      return;
    }

    setLoading(true);
    setTimeout(() => {
      try {
        onDeposit(accountId || accounts[0]?.id, amountNum, note || 'Direct Capital Inbound Deposit');
        setAmount('');
        setNote('');
        setLoading(false);
        onClose();
      } catch (err: any) {
        setError(err.message || 'Deposit failed');
        setLoading(false);
      }
    }, 400);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-on-surface/40 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-md p-6 bg-surface-container-lowest rounded-2xl shadow-2xl border border-surface-container-highest">
        <div className="flex items-center justify-between pb-4 border-b border-surface-container-highest">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-surface-container-low flex items-center justify-center text-on-tertiary-container">
              <span className="material-symbols-outlined text-[22px]">account_balance_wallet</span>
            </div>
            <div>
              <h3 className="font-headline-sm text-body-lg font-bold text-on-surface">Deposit Funds</h3>
              <p className="font-label-meta text-label-meta uppercase text-on-surface-variant">Instant Vault Liquidity Inflow</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-on-surface-variant hover:bg-surface-container">
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 mt-4">
          <div className="flex flex-col gap-1.5">
            <label className="font-label-meta uppercase text-on-surface-variant font-bold">Target Account / Sub-Ledger</label>
            <select
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-surface-container-low border border-surface-container-highest text-on-surface font-body-md focus:outline-none focus:border-secondary"
            >
              {accounts.map((acc) => (
                <option key={acc.id} value={acc.id} disabled={acc.status === 'FROZEN'}>
                  {acc.nickname || acc.accountType} (···· {acc.accountNumber.slice(-4)}) - ${parseFloat(acc.balance).toLocaleString('en-US', { minimumFractionDigits: 2 })} USD {acc.status === 'FROZEN' ? '[FROZEN]' : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="font-label-meta uppercase text-on-surface-variant font-bold">Deposit Amount (USD)</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 font-label-numeric-md font-bold text-on-surface-variant">$</span>
              <input
                type="number"
                step="0.01"
                min="0.01"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full pl-8 pr-3 py-2.5 rounded-xl bg-surface-container-low border border-surface-container-highest text-on-surface font-label-numeric-md text-body-lg font-bold focus:outline-none focus:border-secondary"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="font-label-meta uppercase text-on-surface-variant font-bold">Reference / Note (Optional)</label>
            <input
              type="text"
              placeholder="e.g., Client Retainer Inbound"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-surface-container-low border border-surface-container-highest text-on-surface text-body-sm focus:outline-none focus:border-secondary"
            />
          </div>

          {error && <p className="text-xs text-error font-semibold bg-error-container/40 p-2 rounded-lg">{error}</p>}

          <div className="flex items-center gap-3 pt-3 border-t border-surface-container-highest">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 px-4 rounded-xl border border-surface-container-highest text-on-surface hover:bg-surface-container font-semibold transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2.5 px-4 rounded-xl bg-secondary text-on-secondary font-semibold hover:bg-on-secondary-fixed-variant transition-colors shadow-sm flex items-center justify-center gap-2"
            >
              {loading ? 'Crediting...' : 'Confirm Deposit'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
