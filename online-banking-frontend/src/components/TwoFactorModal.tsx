import React, { useState } from 'react';
import { formatMoney } from '../utils/currency';

interface TwoFactorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (otp: string) => void;
  amount: string;
  currency?: string;
  beneficiaryName: string;
  sourceAccountName: string;
  isProcessing: boolean;
}

export const TwoFactorModal: React.FC<TwoFactorModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  amount,
  currency = 'INR',
  beneficiaryName,
  sourceAccountName,
  isProcessing,
}) => {
  const [otp, setOtp] = useState('849201');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp) return;
    onConfirm(otp);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-on-surface/40 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-md p-6 bg-surface-container-lowest rounded-2xl shadow-2xl border border-surface-container-highest flex flex-col gap-4">
        <div className="flex items-center justify-between pb-3 border-b border-surface-container-highest">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-surface-container-low flex items-center justify-center text-secondary">
              <span className="material-symbols-outlined text-[22px]">verified_user</span>
            </div>
            <div>
              <h3 className="font-headline-sm text-body-lg font-bold text-on-surface">Enter 6-Digit OTP</h3>
              <p className="font-label-meta text-label-meta uppercase text-on-surface-variant">2-Factor Authentication</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-on-surface-variant hover:bg-surface-container">
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <div className="p-3.5 rounded-xl bg-surface-container-low border border-surface-container-highest flex flex-col gap-1.5 text-xs">
          <div className="flex justify-between">
            <span className="text-on-surface-variant">Transfer Amount:</span>
            <span className="font-mono font-bold text-on-surface">{formatMoney(amount, currency, true)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-on-surface-variant">From Account:</span>
            <span className="font-semibold text-on-surface">{sourceAccountName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-on-surface-variant">To Payee:</span>
            <span className="font-semibold text-on-surface">{beneficiaryName}</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="font-label-meta uppercase text-on-surface-variant font-bold text-[10px]">
              OTP sent to registered mobile (+91 98765 43210)
            </label>
            <input
              type="text"
              maxLength={6}
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              placeholder="000000"
              className="w-full text-center tracking-[0.5em] font-mono text-2xl font-bold py-2.5 px-3 rounded-xl bg-surface-container-low border border-surface-container-highest text-on-surface focus:outline-none focus:border-secondary"
            />
            <span className="text-[10px] text-on-surface-variant text-center">Demo OTP code: 849201</span>
          </div>

          <div className="flex items-center gap-3 pt-2 border-t border-surface-container-highest">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 px-4 rounded-xl border border-surface-container-highest text-on-surface hover:bg-surface-container font-semibold transition-colors text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isProcessing}
              className="flex-1 py-2.5 px-4 rounded-xl bg-primary text-on-primary font-bold hover:bg-inverse-surface transition-colors shadow-sm flex items-center justify-center gap-1.5 text-xs"
            >
              {isProcessing ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-on-primary border-t-transparent rounded-full animate-spin"></span>
                  <span>Verifying...</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[16px]">lock_open</span>
                  <span>Confirm &amp; Pay</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
