import React, { useState } from 'react';

interface TransferSuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  transactionId: string;
  correlationId: string;
  amount: string;
  beneficiaryName: string;
  sourceAccountName: string;
}

export const TransferSuccessModal: React.FC<TransferSuccessModalProps> = ({
  isOpen,
  onClose,
  transactionId,
  correlationId,
  amount,
  beneficiaryName,
  sourceAccountName,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(`Aegis Vault Transfer Receipt\nTransaction ID: ${transactionId}\nCorrelation ID: ${correlationId}\nAmount: $${amount} USD\nPayee: ${beneficiaryName}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-on-surface/40 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-md p-6 bg-surface-container-lowest rounded-2xl shadow-2xl border border-surface-container-highest flex flex-col gap-4">
        {/* Success Icon Badge */}
        <div className="flex flex-col items-center text-center gap-2 pt-2">
          <div className="w-14 h-14 rounded-full bg-tertiary-container/20 border-2 border-on-tertiary-container flex items-center justify-center text-on-tertiary-container shadow-sm">
            <span className="material-symbols-outlined text-[32px]">check_circle</span>
          </div>
          <h3 className="font-headline-md text-headline-sm font-bold text-on-surface">Settlement Dispatched</h3>
          <p className="font-body-sm text-body-sm text-on-surface-variant max-w-xs">
            Transfer successfully signed and committed via Transactional Outbox.
          </p>
        </div>

        {/* Receipt Container */}
        <div className="p-4 rounded-xl bg-surface-container-low border border-surface-container-highest flex flex-col gap-3">
          <div className="flex items-center justify-between pb-2 border-b border-surface-container-highest">
            <span className="font-label-meta text-label-meta uppercase text-on-surface-variant">Amount Settled</span>
            <span className="font-label-numeric-lg text-label-numeric-lg font-bold text-on-surface">
              ${parseFloat(amount || '0').toLocaleString('en-US', { minimumFractionDigits: 2 })} <span className="text-xs font-normal text-on-surface-variant">USD</span>
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="font-label-meta uppercase text-on-surface-variant">Transaction ID</span>
              <p className="font-label-numeric-sm font-bold text-on-surface mt-0.5 truncate">{transactionId}</p>
            </div>
            <div>
              <span className="font-label-meta uppercase text-on-surface-variant">Settlement State</span>
              <p className="font-label-meta font-bold text-on-tertiary-container mt-0.5 uppercase flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-on-tertiary-container"></span>
                COMMITTED
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-surface-container-highest">
            <div>
              <span className="font-label-meta uppercase text-on-surface-variant">Payee</span>
              <p className="font-semibold text-on-surface mt-0.5 truncate">{beneficiaryName}</p>
            </div>
            <div>
              <span className="font-label-meta uppercase text-on-surface-variant">Source Ledger</span>
              <p className="font-semibold text-on-surface mt-0.5 truncate">{sourceAccountName}</p>
            </div>
          </div>

          <div className="pt-2 border-t border-surface-container-highest">
            <span className="font-label-meta uppercase text-on-surface-variant">Correlation Hash</span>
            <p className="font-label-numeric-sm text-[11px] text-on-surface-variant font-mono mt-0.5 truncate bg-surface-container px-2 py-1 rounded">
              {correlationId}
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3 pt-2">
          <button
            type="button"
            onClick={handleCopy}
            className="flex-1 py-2.5 px-4 rounded-xl border border-surface-container-highest text-on-surface hover:bg-surface-container font-semibold transition-colors flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined text-[18px]">
              {copied ? 'check' : 'content_copy'}
            </span>
            <span>{copied ? 'Copied!' : 'Copy Receipt'}</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 px-4 rounded-xl bg-primary text-on-primary font-semibold hover:bg-inverse-surface transition-colors shadow-sm"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
