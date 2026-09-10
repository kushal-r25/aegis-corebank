import React from 'react';
import { formatMoney } from '../utils/currency';

interface TransferSuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  transactionId: string;
  correlationId: string;
  amount: string;
  currency?: string;
  beneficiaryName: string;
  sourceAccountName: string;
}

export const TransferSuccessModal: React.FC<TransferSuccessModalProps> = ({
  isOpen,
  onClose,
  transactionId,
  correlationId,
  amount,
  currency = 'USD',
  beneficiaryName,
  sourceAccountName,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-on-surface/40 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-md p-6 bg-surface-container-lowest rounded-2xl shadow-2xl border border-surface-container-highest flex flex-col gap-5">
        <div className="flex flex-col items-center text-center gap-2 pt-2">
          <div className="w-14 h-14 rounded-full bg-tertiary-container/30 text-on-tertiary-container flex items-center justify-center mb-1">
            <span className="material-symbols-outlined text-[32px]">check_circle</span>
          </div>
          <span className="font-label-meta text-xs uppercase font-bold text-on-tertiary-container tracking-wider">
            Transfer Authorized &amp; Settled
          </span>
          <h3 className="font-headline-sm text-2xl font-bold text-on-surface">
            {formatMoney(amount, currency, true)}
          </h3>
          <p className="text-body-sm text-on-surface-variant">
            Dispatched from <strong className="text-on-surface">{sourceAccountName}</strong> to <strong className="text-on-surface">{beneficiaryName}</strong>
          </p>
        </div>

        <div className="p-4 rounded-xl bg-surface-container-low border border-surface-container-highest flex flex-col gap-2 text-xs">
          <div className="flex justify-between">
            <span className="text-on-surface-variant font-label-meta uppercase text-[10px]">Transaction ID:</span>
            <span className="font-mono font-bold text-on-surface">{transactionId}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-on-surface-variant font-label-meta uppercase text-[10px]">Correlation Hash:</span>
            <span className="font-mono text-on-surface-variant">{correlationId}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-on-surface-variant font-label-meta uppercase text-[10px]">Currency / Settlement:</span>
            <span className="font-mono font-bold text-on-tertiary-container">{currency} · STRICT ACID</span>
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full py-2.5 px-4 bg-primary text-on-primary font-bold rounded-xl hover:bg-inverse-surface transition-colors shadow-sm text-body-sm"
        >
          Return to Dashboard
        </button>
      </div>
    </div>
  );
};
