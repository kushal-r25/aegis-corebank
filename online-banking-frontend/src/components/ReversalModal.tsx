import React, { useState } from 'react';
import type { LedgerEntry } from '../types';

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
  const [reason, setReason] = useState('Duplicate transfer / Execution error');
  const [confirmed, setConfirmed] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!isOpen || !entry) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirmed) return;

    setLoading(true);
    setTimeout(() => {
      onConfirm(entry.transactionId, reason);
      setLoading(false);
      onClose();
    }, 400);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-on-surface/40 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-md p-6 bg-surface-container-lowest rounded-2xl shadow-2xl border border-surface-container-highest">
        <div className="flex items-center justify-between pb-4 border-b border-surface-container-highest">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-error-container text-error flex items-center justify-center">
              <span className="material-symbols-outlined text-[22px]">published_with_changes</span>
            </div>
            <div>
              <h3 className="font-headline-sm text-body-lg font-bold text-on-surface">Initiate Transaction Reversal</h3>
              <p className="font-label-meta text-label-meta uppercase text-on-surface-variant">Paired Double-Entry Compensation</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-on-surface-variant hover:bg-surface-container">
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 mt-4">
          <div className="p-3.5 rounded-xl bg-surface-container-low border border-surface-container-highest text-xs flex flex-col gap-1.5">
            <div className="flex justify-between">
              <span className="text-on-surface-variant">Original Txn ID:</span>
              <span className="font-mono font-bold text-on-surface">{entry.transactionId}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-on-surface-variant">Reversal Amount:</span>
              <span className="font-mono font-bold text-error">${parseFloat(entry.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })} USD</span>
            </div>
            <div className="flex justify-between">
              <span className="text-on-surface-variant">Description:</span>
              <span className="font-semibold text-on-surface truncate max-w-[220px]">{entry.description}</span>
            </div>
          </div>

          <div className="p-3 bg-error-container/40 border border-error/30 rounded-xl text-xs text-on-error-container flex items-start gap-2">
            <span className="material-symbols-outlined text-error text-[18px] shrink-0 mt-0.5">policy</span>
            <p>
              Under double-entry accounting rules, ledger records are <strong>immutable</strong> and cannot be deleted. This operation generates a paired offsetting transaction with deterministic locking and emits a <code>TRANSFER_REVERSED</code> Kafka event.
            </p>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="font-label-meta uppercase text-on-surface-variant font-bold">Audit Reversal Reason</label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-surface-container-low border border-surface-container-highest text-on-surface text-body-sm focus:outline-none focus:border-secondary"
            >
              <option value="Duplicate transfer / Execution error">Duplicate transfer / Execution error</option>
              <option value="Customer Dispute / Chargeback">Customer Dispute / Chargeback</option>
              <option value="AML / Fraud Investigation Offset">AML / Fraud Investigation Offset</option>
              <option value="Administrative Treasury Correction">Administrative Treasury Correction</option>
            </select>
          </div>

          <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-on-surface pt-1">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
              className="w-4 h-4 rounded text-error focus:ring-error"
            />
            <span>I authorize the paired double-entry compensation</span>
          </label>

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
              disabled={!confirmed || loading}
              className="flex-1 py-2.5 px-4 rounded-xl bg-error text-on-error font-semibold hover:bg-on-error-container transition-colors shadow-sm disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? 'Reversing...' : 'Execute Reversal'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
