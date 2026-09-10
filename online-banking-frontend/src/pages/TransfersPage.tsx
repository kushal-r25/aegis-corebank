import React, { useState } from 'react';
import { api } from '../services/api';
import type { Account, Beneficiary } from '../types';
import { formatMoney, getCurrencySymbol } from '../utils/currency';
import { TwoFactorModal } from '../components/TwoFactorModal';
import { TransferSuccessModal } from '../components/TransferSuccessModal';

export const TransfersPage: React.FC = () => {
  const [accounts, setAccounts] = useState<Account[]>(() => api.accounts.getAccounts());
  const [beneficiaries] = useState<Beneficiary[]>(() => api.beneficiaries.getBeneficiaries());
  const [sourceAccountId, setSourceAccountId] = useState(accounts[0]?.id || '');

  // Tab: saved vs oneoff
  const [tab, setTab] = useState<'saved' | 'oneoff'>('saved');
  const [selectedBenId, setSelectedBenId] = useState(beneficiaries[0]?.id || '');

  // One-off fields
  const [oneOffName, setOneOffName] = useState('');
  const [oneOffAccount, setOneOffAccount] = useState('');
  const [oneOffBank, setOneOffBank] = useState('');
  const [oneOffRouting, setOneOffRouting] = useState('');
  const [oneOffCurrency, setOneOffCurrency] = useState<'USD' | 'INR'>('USD');

  // Transfer inputs
  const [amount, setAmount] = useState('2400.00');
  const [note, setNote] = useState('Cloud Infrastructure & Data Services Retainer');
  const [error, setError] = useState<string | null>(null);

  // 2FA & Success modals
  const [is2FaOpen, setIs2FaOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccessOpen, setIsSuccessOpen] = useState(false);
  const [successData, setSuccessData] = useState<{ txnId: string; corrId: string; amount: string; currency: string; payee: string; sourceName: string } | null>(null);

  const sourceAccount = accounts.find((a) => a.id === sourceAccountId) || accounts[0];
  const selectedBen = beneficiaries.find((b) => b.id === selectedBenId) || beneficiaries[0];

  const sourceCurrency = sourceAccount ? (sourceAccount.currency || 'USD') : 'USD';
  const targetCurrency = tab === 'saved' ? (selectedBen?.currency || 'USD') : oneOffCurrency;
  const isCurrencyMismatch = sourceCurrency !== targetCurrency;

  const payeeName = tab === 'saved' ? (selectedBen?.name || 'Beneficiary') : (oneOffName || 'External Payee');
  const availableBal = sourceAccount ? parseFloat(sourceAccount.balance) : 0;
  const dailyLimit = sourceAccount ? parseFloat(sourceAccount.dailyLimit || '50000') : 50000;
  const dailyUsed = sourceAccount ? parseFloat(sourceAccount.dailyLimitUsed || '0') : 0;
  const remainingDailyCapacity = Math.max(0, dailyLimit - dailyUsed);
  const symbol = getCurrencySymbol(sourceCurrency);

  const handleStartTransfer = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (isCurrencyMismatch) {
      setError(`Cross-currency transfers are not supported without FX conversion. Source: ${sourceCurrency}, Destination: ${targetCurrency}.`);
      return;
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setError('Please enter a valid positive transfer amount');
      return;
    }
    if (amountNum > availableBal) {
      setError(`Insufficient available liquidity (${formatMoney(availableBal, sourceCurrency, true)} in source ledger)`);
      return;
    }
    if (amountNum > remainingDailyCapacity) {
      setError(`Exceeds daily limit. Remaining headroom: ${formatMoney(remainingDailyCapacity, sourceCurrency, true)}`);
      return;
    }
    if (tab === 'oneoff' && (!oneOffName || !oneOffAccount || !oneOffRouting)) {
      setError('Please provide recipient name, account number, and routing code');
      return;
    }

    setIs2FaOpen(true);
  };

  const handleConfirm2Fa = (otp: string) => {
    setIsProcessing(true);
    setTimeout(() => {
      try {
        const res = api.transfers.executeTransfer({
          sourceAccountId: sourceAccount.id,
          amount,
          currency: sourceCurrency,
          beneficiaryName: payeeName,
          beneficiaryAccount: tab === 'saved' ? selectedBen?.accountNumber : oneOffAccount,
          routingCode: tab === 'saved' ? selectedBen?.routingCode : oneOffRouting,
          note: note || `Wire Outbound: ${payeeName}`,
          idempotencyKey: `idem-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          twoFactorOtp: otp,
        });

        const freshAccounts = api.accounts.getAccounts();
        setAccounts(freshAccounts);
        setIsProcessing(false);
        setIs2FaOpen(false);

        setSuccessData({
          txnId: res.transactionId,
          corrId: res.correlationId,
          amount,
          currency: sourceCurrency,
          payee: payeeName,
          sourceName: sourceAccount.nickname || sourceAccount.accountType,
        });
        setIsSuccessOpen(true);
      } catch (err: any) {
        setError(err.message || 'Transfer failed');
        setIsProcessing(false);
      }
    }, 500);
  };

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto">
      {/* 2FA Modal */}
      <TwoFactorModal
        isOpen={is2FaOpen}
        onClose={() => setIs2FaOpen(false)}
        onConfirm={handleConfirm2Fa}
        amount={amount}
        currency={sourceCurrency}
        beneficiaryName={payeeName}
        sourceAccountName={sourceAccount.nickname || sourceAccount.accountType}
        isProcessing={isProcessing}
      />

      {/* Success Modal */}
      {successData && (
        <TransferSuccessModal
          isOpen={isSuccessOpen}
          onClose={() => setIsSuccessOpen(false)}
          transactionId={successData.txnId}
          correlationId={successData.corrId}
          amount={successData.amount}
          currency={successData.currency}
          beneficiaryName={successData.payee}
          sourceAccountName={successData.sourceName}
        />
      )}

      {/* Dynamic Operational Notice Strip */}
      <div className="p-4 bg-surface-container-lowest rounded-2xl border border-surface-container-highest shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-secondary-fixed flex items-center justify-center text-secondary">
            <span className="material-symbols-outlined text-[22px]">verified_user</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-headline-sm text-body-md font-bold text-on-surface">Mission-Critical Transfer Protocol v4.2</span>
              <span className="px-2 py-0.5 rounded bg-surface-container-highest text-secondary font-label-meta text-[10px] font-bold">
                ACID GUARD ON
              </span>
            </div>
            <p className="text-xs text-on-surface-variant">RTGS / Fedwire Settlement Engine · Synchronous Ledger Locking Active · USD &amp; INR Supported</p>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5 font-label-numeric-sm font-bold text-on-tertiary-container">
            <span className="w-2 h-2 rounded-full bg-on-tertiary-container animate-pulse"></span>
            <span>SETTLEMENT WINDOW: OPEN (SAME-DAY)</span>
          </div>
        </div>
      </div>

      {/* Cross-Currency Warning Alert if Mismatch */}
      {isCurrencyMismatch && (
        <div className="p-4 rounded-xl bg-error-container/40 border border-error/30 text-on-error-container flex items-start gap-3">
          <span className="material-symbols-outlined text-error text-[24px]">warning</span>
          <div className="flex flex-col text-xs">
            <span className="font-bold text-sm">Cross-Currency Transfers Not Supported</span>
            <p className="mt-0.5">
              Source account currency is <strong>{sourceCurrency}</strong>, but destination recipient operates in <strong>{targetCurrency}</strong>.
              Ordinary transfers require matching currencies. FX conversion is intentionally outside the current reference implementation.
            </p>
          </div>
        </div>
      )}

      {/* Primary Workspace: 12 Cols Layout */}
      <form onSubmit={handleStartTransfer} className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Form & Routing (7 Cols) */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          {/* Originating Account Card */}
          <div className="p-6 bg-surface-container-lowest rounded-2xl border border-surface-container-highest shadow-sm flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-secondary text-[20px]">account_balance_wallet</span>
                <h3 className="font-headline-sm text-body-lg font-bold text-on-surface">Originating Account</h3>
              </div>
              <span className="px-2.5 py-0.5 rounded-full bg-surface-container-low text-secondary font-mono text-[10px] font-bold uppercase">
                Currency: {sourceCurrency}
              </span>
            </div>

            <div className="p-4 bg-surface-container-low rounded-xl border border-surface-container-highest flex flex-col gap-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-surface-container-lowest flex items-center justify-center shadow-xs border border-surface-container-highest text-secondary">
                    <span className="material-symbols-outlined text-[22px]">corporate_fare</span>
                  </div>
                  <div className="flex flex-col">
                    <select
                      value={sourceAccountId}
                      onChange={(e) => setSourceAccountId(e.target.value)}
                      className="font-headline-sm text-body-md font-bold text-on-surface bg-transparent border-none focus:outline-none cursor-pointer"
                    >
                      {accounts.map((acc) => (
                        <option key={acc.id} value={acc.id} disabled={acc.status === 'FROZEN'}>
                          {acc.nickname || acc.accountType} (···· {acc.accountNumber.slice(-4)}) - {formatMoney(acc.balance, acc.currency, true)}
                        </option>
                      ))}
                    </select>
                    <span className="text-xs text-on-surface-variant font-mono">
                      Account: {sourceAccount.iban || sourceAccount.accountNumber} · Routing: {sourceAccount.routingNumber}
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-surface-container-highest">
                <div>
                  <span className="font-label-meta uppercase text-on-surface-variant text-[10px]">Available Liquidity</span>
                  <p className="font-label-numeric-lg text-xl font-bold text-on-surface mt-0.5">
                    {formatMoney(sourceAccount.balance, sourceCurrency, true)}
                  </p>
                </div>
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-label-meta uppercase text-on-surface-variant text-[10px]">Daily Limit Used</span>
                    <span className="font-mono text-on-surface font-semibold">
                      {formatMoney(sourceAccount.dailyLimitUsed || '0', sourceCurrency)} / {formatMoney(sourceAccount.dailyLimit || '50000', sourceCurrency)}
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-surface-container-highest overflow-hidden">
                    <div
                      className="h-full bg-secondary rounded-full"
                      style={{ width: `${Math.min(100, (parseFloat(sourceAccount.dailyLimitUsed || '0') / parseFloat(sourceAccount.dailyLimit || '50000')) * 100)}%` }}
                    ></div>
                  </div>
                  <p className="text-[10px] text-on-tertiary-container font-semibold mt-1">
                    Remaining Headroom: {formatMoney(remainingDailyCapacity, sourceCurrency, true)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Beneficiary & Interbank Route */}
          <div className="p-6 bg-surface-container-lowest rounded-2xl border border-surface-container-highest shadow-sm flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-secondary text-[20px]">domain</span>
                <h3 className="font-headline-sm text-body-lg font-bold text-on-surface">Beneficiary &amp; Interbank Route</h3>
              </div>
              <div className="flex items-center p-1 bg-surface-container-low rounded-xl border border-surface-container-highest">
                <button
                  type="button"
                  onClick={() => setTab('saved')}
                  className={`px-3 py-1 rounded-lg font-label-meta text-[10px] font-bold transition-all ${
                    tab === 'saved' ? 'bg-surface-container-lowest text-secondary shadow-xs' : 'text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  SAVED BENEFICIARY
                </button>
                <button
                  type="button"
                  onClick={() => setTab('oneoff')}
                  className={`px-3 py-1 rounded-lg font-label-meta text-[10px] font-bold transition-all ${
                    tab === 'oneoff' ? 'bg-surface-container-lowest text-secondary shadow-xs' : 'text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  ONE-OFF WIRE
                </button>
              </div>
            </div>

            {tab === 'saved' ? (
              <div className="p-4 bg-surface-container-low rounded-xl border border-surface-container-highest flex flex-col gap-3">
                <div className="flex flex-col gap-1">
                  <label className="font-label-meta uppercase text-on-surface-variant font-bold text-[10px]">Select Payee Directory Entry</label>
                  <select
                    value={selectedBenId}
                    onChange={(e) => setSelectedBenId(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-surface-container-lowest border border-surface-container-highest text-on-surface font-semibold text-body-sm focus:outline-none focus:border-secondary"
                  >
                    {beneficiaries.map((b) => (
                      <option key={b.id} value={b.id} disabled={b.status === 'BLOCKED'}>
                        {b.name} ({b.bankName}) [{b.currency || 'USD'}] {b.status === 'BLOCKED' ? '[BLOCKED]' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {selectedBen && (
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 p-3 bg-surface-container-lowest rounded-xl border border-surface-container-highest text-xs">
                    <div>
                      <span className="font-label-meta uppercase text-on-surface-variant text-[10px]">Account</span>
                      <p className="font-mono font-bold text-on-surface mt-0.5 truncate">{selectedBen.accountNumber}</p>
                    </div>
                    <div>
                      <span className="font-label-meta uppercase text-on-surface-variant text-[10px]">Bank</span>
                      <p className="font-semibold text-on-surface mt-0.5 truncate">{selectedBen.bankName}</p>
                    </div>
                    <div>
                      <span className="font-label-meta uppercase text-on-surface-variant text-[10px]">Routing</span>
                      <p className="font-mono font-bold text-on-surface mt-0.5">{selectedBen.routingCode}</p>
                    </div>
                    <div>
                      <span className="font-label-meta uppercase text-on-surface-variant text-[10px]">Currency</span>
                      <p className="font-mono font-bold text-secondary mt-0.5">{selectedBen.currency || 'USD'}</p>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-surface-container-low rounded-xl border border-surface-container-highest">
                <div className="flex flex-col gap-1">
                  <label className="font-label-meta uppercase text-on-surface-variant font-bold text-[10px]">Recipient Legal Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Acme Corporation"
                    value={oneOffName}
                    onChange={(e) => setOneOffName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-surface-container-lowest border border-surface-container-highest text-xs text-on-surface focus:outline-none focus:border-secondary"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="font-label-meta uppercase text-on-surface-variant font-bold text-[10px]">Account Number / IBAN</label>
                  <input
                    type="text"
                    placeholder="e.g. US94 AEGIS 0001 ..."
                    value={oneOffAccount}
                    onChange={(e) => setOneOffAccount(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-surface-container-lowest border border-surface-container-highest text-xs font-mono text-on-surface focus:outline-none focus:border-secondary"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="font-label-meta uppercase text-on-surface-variant font-bold text-[10px]">Receiving Bank Name</label>
                  <input
                    type="text"
                    placeholder="e.g. JPMorgan Chase or HDFC"
                    value={oneOffBank}
                    onChange={(e) => setOneOffBank(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-surface-container-lowest border border-surface-container-highest text-xs text-on-surface focus:outline-none focus:border-secondary"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="font-label-meta uppercase text-on-surface-variant font-bold text-[10px]">Routing / IFSC Code</label>
                  <input
                    type="text"
                    placeholder="e.g. 021000021 or HDFC0001234"
                    value={oneOffRouting}
                    onChange={(e) => setOneOffRouting(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-surface-container-lowest border border-surface-container-highest text-xs font-mono text-on-surface focus:outline-none focus:border-secondary"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="font-label-meta uppercase text-on-surface-variant font-bold text-[10px]">Destination Currency</label>
                  <select
                    value={oneOffCurrency}
                    onChange={(e) => setOneOffCurrency(e.target.value as 'USD' | 'INR')}
                    className="w-full px-3 py-2 rounded-xl bg-surface-container-lowest border border-surface-container-highest text-xs font-mono font-bold text-on-surface focus:outline-none focus:border-secondary"
                  >
                    <option value="USD">USD ($)</option>
                    <option value="INR">INR (₹)</option>
                  </select>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Execution Summary & Authorization (5 Cols) */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          <div className="p-6 bg-surface-container-lowest rounded-2xl border border-surface-container-highest shadow-sm flex flex-col gap-4">
            <div className="flex items-center justify-between pb-3 border-b border-surface-container-highest">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-secondary text-[20px]">payments</span>
                <h3 className="font-headline-sm text-body-lg font-bold text-on-surface">Transfer Sum &amp; Signing</h3>
              </div>
              <span className="font-label-meta text-[10px] uppercase font-bold text-on-tertiary-container bg-tertiary-container/20 px-2 py-0.5 rounded">
                ZERO FEE
              </span>
            </div>

            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="font-label-meta uppercase text-on-surface-variant font-bold text-[10px]">Instructed Monetary Amount ({sourceCurrency})</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 font-label-numeric-lg font-bold text-on-surface-variant">{symbol}</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-surface-container-low border border-surface-container-highest text-on-surface font-label-numeric-lg text-2xl font-bold focus:outline-none focus:border-secondary"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="font-label-meta uppercase text-on-surface-variant font-bold text-[10px]">Payment Reference / Memo</label>
                <input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="e.g., Invoice Reference #8841"
                  className="w-full px-3 py-2 rounded-xl bg-surface-container-low border border-surface-container-highest text-on-surface text-body-sm focus:outline-none focus:border-secondary"
                />
              </div>

              {/* Summary breakdown */}
              <div className="p-4 bg-surface-container-low rounded-xl border border-surface-container-highest text-xs flex flex-col gap-2">
                <div className="flex justify-between">
                  <span className="text-on-surface-variant">Instructed Sum:</span>
                  <span className="font-mono font-bold text-on-surface">{formatMoney(amount || '0', sourceCurrency, true)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-on-surface-variant">Settlement Fee:</span>
                  <span className="font-mono font-bold text-on-tertiary-container">{symbol}0.00 {sourceCurrency}</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-surface-container-highest">
                  <span className="font-bold text-on-surface">Total Debit Impact:</span>
                  <span className="font-mono font-bold text-on-surface text-sm">{formatMoney(amount || '0', sourceCurrency, true)}</span>
                </div>
              </div>

              {error && <p className="text-xs text-error font-semibold bg-error-container/40 p-2.5 rounded-xl">{error}</p>}

              <button
                type="submit"
                disabled={isCurrencyMismatch}
                className={`w-full py-3 px-4 font-bold rounded-xl transition-colors flex items-center justify-center gap-2 shadow-sm text-body-md ${
                  isCurrencyMismatch
                    ? 'bg-surface-container-highest text-on-surface-variant cursor-not-allowed'
                    : 'bg-primary text-on-primary hover:bg-inverse-surface'
                }`}
              >
                <span className="material-symbols-outlined text-[20px]">lock</span>
                <span>{isCurrencyMismatch ? 'Cross-Currency Disabled' : 'Proceed to Dual-Sign 2FA'}</span>
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};
