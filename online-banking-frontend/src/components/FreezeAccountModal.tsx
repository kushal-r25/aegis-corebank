import React, { useState } from 'react';
import type { Account } from '../types';

interface FreezeAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  account: Account | null;
  onConfirm: (accountId: string, reason: string) => void;
}

export const FreezeAccountModal: React.FC<FreezeAccountModalProps> = ({
  isOpen,
  onClose,
  account,
  onConfirm,
}) => {
  const [reason, setReason] = useState('Suspicious activity / Compliance Hold');
  const [confirmed, setConfirmed] = useState(false);

  if (!isOpen || !account) return null;

  const isFreezing = account.status !== 'FROZEN';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isFreezing && !confirmed) return;
    onConfirm(account.id, reason);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-on-surface/40 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-md p-6 bg-surface-container-lowest rounded-2xl shadow-2xl border border-surface-container-highest">
        <div className="flex items-center justify-between pb-4 border-b border-surface-container-highest">
          <div className="flex items-center gap-2">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${isFreezing ? 'bg-error-container text-error' : 'bg-tertiary-container text-on-tertiary-container'}`}>
              <span className="material-symbols-outlined text-[22px]">{isFreezing ? 'lock_person' : 'lock_open'}</span>
            </div>
            <div>
              <h3 className="font-headline-sm text-body-lg font-bold text-on-surface">
                {isFreezing ? 'Freeze Account Sub-Ledger' : 'Unfreeze Account Sub-Ledger'}
              </h3>
              <p className="font-label-meta text-label-meta uppercase text-on-surface-variant">Administrative State Override</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-on-surface-variant hover:bg-surface-container">
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 mt-4">
          <div className="p-3 rounded-xl bg-surface-container-low border border-surface-container-highest text-xs flex flex-col gap-1">
            <div className="flex justify-between">
              <span className="text-on-surface-variant">Account Title:</span>
              <span className="font-bold text-on-surface">{account.nickname || account.accountType}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-on-surface-variant">IBAN / Number:</span>
              <span className="font-mono font-semibold text-on-surface">{account.iban || account.accountNumber}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-on-surface-variant">Current Balance:</span>
              <span className="font-mono font-bold text-on-surface">${parseFloat(account.balance).toLocaleString('en-US', { minimumFractionDigits: 2 })} USD</span>
            </div>
          </div>

          {isFreezing ? (
            <>
              <div className="p-3 bg-error-container/40 border border-error/30 rounded-xl text-xs text-on-error-container flex items-start gap-2">
                <span className="material-symbols-outlined text-error text-[18px] shrink-0 mt-0.5">warning</span>
                <p>
                  Freezing this account immediately halts all inbound and outbound wire transfers, automated clearing sweeps, and scheduled debits.
                </p>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="font-label-meta uppercase text-on-surface-variant font-bold">Compliance Reason Code</label>
                <select
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-surface-container-low border border-surface-container-highest text-on-surface text-body-sm focus:outline-none focus:border-secondary"
                >
                  <option value="Suspicious activity / Compliance Hold">Suspicious activity / Compliance Hold</option>
                  <option value="OFAC / AML Regulatory Review">OFAC / AML Regulatory Review</option>
                  <option value="Customer Authorized Lock">Customer Authorized Lock</option>
                  <option value="Court Order / Legal Attachment">Court Order / Legal Attachment</option>
                </select>
              </div>

              <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-on-surface pt-1">
                <input
                  type="checkbox"
                  checked={confirmed}
                  onChange={(e) => setConfirmed(e.target.checked)}
                  className="w-4 h-4 rounded text-error focus:ring-error"
                />
                <span>I confirm immediate administrative execution of freeze</span>
              </label>
            </>
          ) : (
            <p className="text-body-sm text-on-surface-variant">
              Unfreezing will restore full transactional capabilities, allowing wire debits and scheduled transfers to resume.
            </p>
          )}

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
              disabled={isFreezing && !confirmed}
              className={`flex-1 py-2.5 px-4 rounded-xl font-semibold transition-colors shadow-sm ${
                isFreezing
                  ? 'bg-error text-on-error hover:bg-on-error-container disabled:opacity-50'
                  : 'bg-on-tertiary-container text-on-primary hover:bg-tertiary-container'
              }`}
            >
              {isFreezing ? 'Freeze Account' : 'Restore / Unfreeze'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
