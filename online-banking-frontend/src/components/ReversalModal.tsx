import React, { useState } from 'react';
import type { LedgerEntry } from '../types';
import { formatMoney } from '../utils/currency';

interface ReversalModalProps {
  isOpen: boolean;
  onClose: () => void;
  entry: LedgerEntry | null;
  onConfirm: (transactionId: string, reason: string) => void;
}

export const ReversalModal: React.FC<ReversalModalProps> = ({
  isOpen,
  onClose,
  entry,
  onConfirm,
}) => {
  const [reason, setReason] = useState('Duplicate transfer dispute');

  if (!isOpen || !entry) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConfirm(entry.transactionId, reason);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-on-surface/40 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-md p-6 bg-surface-container-lowest rounded-2xl shadow-2xl border border-surface-container-highest flex flex-col gap-4">
        <div className="flex items-center justify-between pb-3 border-b border-surface-container-highest">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-error-container text-error flex items-center justify-center">
              <span className="material-symbols-outlined text-[22px]">undo</span>
            </div>
            <div>
              <h3 className="font-headline-sm text-body-lg font-bold text-on-surface">Initiate Double-Entry Reversal</h3>
              <p className="font-label-meta text-label-meta uppercase text-on-surface-variant">Compensating Journal Entry</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-on-surface-variant hover:bg-surface-container">
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <div className="p-3.5 rounded-xl bg-surface-container-low border border-surface-container-highest flex flex-col gap-1.5 text-xs">
          <div className="flex justify-between">
            <span className="text-on-surface-variant">Original Txn ID:</span>
            <span className="font-mono font-bold text-on-surface">{entry.transactionId}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-on-surface-variant">Reversal Amount:</span>
            <span className="font-mono font-bold text-error">{formatMoney(entry.amount, entry.currency, true)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-on-surface-variant">Original Payee:</span>
            <span className="font-semibold text-on-surface">{entry.counterparty || entry.description}</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="font-label-meta uppercase text-on-surface-variant font-bold text-[10px]">
              Audit Justification / Reversal Reason
            </label>
            <input
              type="text"
              required
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-surface-container-low border border-surface-container-highest text-xs text-on-surface focus:outline-none focus:border-secondary"
            />
          </div>

          <div className="flex items-center gap-3 pt-2 border-t border-surface-container-highest">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 px-4 rounded-xl border border-surface-container-highest text-on-surface hover:bg-surface-container font-semibold transition-colors text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-2 px-4 rounded-xl bg-error text-on-error font-bold hover:bg-on-error-container transition-colors shadow-sm text-xs"
            >
              Execute Reversal
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
