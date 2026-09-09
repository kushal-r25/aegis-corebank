import React, { useState, useEffect } from 'react';

interface TwoFactorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (otp: string) => void;
  amount: string;
  beneficiaryName: string;
  sourceAccountName: string;
  isProcessing?: boolean;
}

export const TwoFactorModal: React.FC<TwoFactorModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  amount,
  beneficiaryName,
  sourceAccountName,
  isProcessing = false,
}) => {
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [countdown, setCountdown] = useState(45);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setOtp(['8', '4', '9', '2', '0', '1']); // prefill default test passkey
      setCountdown(45);
      setError(null);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const timer = setInterval(() => {
      setCountdown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [isOpen]);

  if (!isOpen) return null;

  const handleInputChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);

    // auto advance focus
    if (value && index < 5) {
      const nextInput = document.getElementById(`otp-input-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      const prevInput = document.getElementById(`otp-input-${index - 1}`);
      prevInput?.focus();
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const fullOtp = otp.join('');
    if (fullOtp.length < 6) {
      setError('Please enter the complete 6-digit security authorization code');
      return;
    }
    onConfirm(fullOtp);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-on-surface/40 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-md p-6 bg-surface-container-lowest rounded-2xl shadow-2xl border border-surface-container-highest">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-surface-container-highest">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-surface-container-low flex items-center justify-center text-secondary">
              <span className="material-symbols-outlined text-[22px]">lock</span>
            </div>
            <div>
              <h3 className="font-headline-sm text-body-lg font-bold text-on-surface">Dual-Sign Verification</h3>
              <p className="font-label-meta text-label-meta uppercase text-on-surface-variant">Step 3 of 4 · Idempotent Hardware Sign</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="p-1 rounded-lg text-on-surface-variant hover:bg-surface-container transition-colors disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Transfer Details Card */}
        <div className="my-4 p-3 rounded-xl bg-surface-container-low border border-surface-container-highest flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="font-label-meta text-label-meta uppercase text-on-surface-variant">Transfer Amount</span>
            <span className="font-label-numeric-md text-label-numeric-md font-bold text-on-surface">
              ${parseFloat(amount || '0').toLocaleString('en-US', { minimumFractionDigits: 2 })} USD
            </span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-on-surface-variant">Destination Payee:</span>
            <span className="font-semibold text-on-surface truncate max-w-[200px]">{beneficiaryName}</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-on-surface-variant">Originating Account:</span>
            <span className="font-semibold text-on-surface">{sourceAccountName}</span>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col items-center gap-2">
            <label className="font-body-sm text-body-sm text-on-surface-variant text-center">
              Enter 6-digit cryptographic security code sent to authorized vault key:
            </label>
            <div className="flex items-center gap-2 my-2">
              {otp.map((digit, idx) => (
                <input
                  key={idx}
                  id={`otp-input-${idx}`}
                  type="text"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleInputChange(idx, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(idx, e)}
                  disabled={isProcessing}
                  className="w-11 h-12 text-center font-label-numeric-lg text-label-numeric-lg font-bold bg-surface-container-lowest border-2 border-surface-container-highest rounded-xl text-on-surface focus:outline-none focus:border-secondary focus:ring-2 focus:ring-secondary-container transition-all"
                />
              ))}
            </div>
            {error && <span className="font-body-sm text-xs text-error font-medium">{error}</span>}
          </div>

          <div className="flex items-center justify-between text-xs text-on-surface-variant px-1">
            <div className="flex items-center gap-1">
              <span className="material-symbols-outlined text-[16px] text-on-tertiary-container">timer</span>
              <span>Code expires in: <strong className="text-on-surface">{countdown}s</strong></span>
            </div>
            <button
              type="button"
              onClick={() => {
                setCountdown(45);
                setOtp(['8', '4', '9', '2', '0', '1']);
              }}
              className="text-secondary font-semibold hover:underline"
            >
              Resend Code
            </button>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-3 pt-3 border-t border-surface-container-highest">
            <button
              type="button"
              onClick={onClose}
              disabled={isProcessing}
              className="flex-1 py-2.5 px-4 rounded-xl border border-surface-container-highest text-on-surface hover:bg-surface-container font-semibold transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isProcessing}
              className="flex-1 py-2.5 px-4 rounded-xl bg-primary text-on-primary font-semibold hover:bg-inverse-surface transition-all flex items-center justify-center gap-2 shadow-sm disabled:opacity-75"
            >
              {isProcessing ? (
                <>
                  <span className="w-4 h-4 rounded-full border-2 border-on-primary border-t-transparent animate-spin"></span>
                  <span>Authorizing...</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[18px]">verified_user</span>
                  <span>Confirm &amp; Sign</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
