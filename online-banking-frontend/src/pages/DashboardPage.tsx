import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import type { Account, Beneficiary, LedgerEntry } from '../types';
import { DepositModal } from '../components/DepositModal';
import { WithdrawModal } from '../components/WithdrawModal';
import { TwoFactorModal } from '../components/TwoFactorModal';
import { TransferSuccessModal } from '../components/TransferSuccessModal';

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [accounts, setAccounts] = useState<Account[]>(() => api.accounts.getAccounts());
  const [ledgerEntries, setLedgerEntries] = useState<LedgerEntry[]>(() => api.ledger.getEntries());
  const [beneficiaries] = useState<Beneficiary[]>(() => api.beneficiaries.getBeneficiaries());

  // Modals state
  const [isDepositOpen, setIsDepositOpen] = useState(false);
  const [isWithdrawOpen, setIsWithdrawOpen] = useState(false);
  const [selectedAccId, setSelectedAccId] = useState<string | undefined>(undefined);
  const [is2FaOpen, setIs2FaOpen] = useState(false);
  const [isSuccessOpen, setIsSuccessOpen] = useState(false);
  const [pendingTxnData, setPendingTxnData] = useState<{ txnId: string; corrId: string; amount: string; payee: string; sourceName: string } | null>(null);

  // Quick Transfer simple state
  const [quickAmount, setQuickAmount] = useState('2400.00');
  const [quickPayee, setQuickPayee] = useState(beneficiaries[0]?.name || 'Apex Global Tech Ltd');
  const [isTransferring, setIsTransferring] = useState(false);

  const refreshData = () => {
    setAccounts(api.accounts.getAccounts());
    setLedgerEntries(api.ledger.getEntries());
  };

  const totalLiquidity = accounts
    .reduce((sum, a) => sum + (a.status !== 'FROZEN' ? parseFloat(a.balance) : 0), 0)
    .toFixed(2);

  const bookBalanceTotal = accounts
    .reduce((sum, a) => sum + parseFloat(a.bookBalance || a.balance), 0)
    .toFixed(2);

  const handleDeposit = (accId: string, amount: number, note?: string) => {
    api.accounts.deposit(accId, amount, note);
    refreshData();
  };

  const handleWithdraw = (accId: string, amount: number, note?: string) => {
    api.accounts.withdraw(accId, amount, note);
    refreshData();
  };

  const handleStartQuickTransfer = () => {
    setIs2FaOpen(true);
  };

  const handleConfirm2Fa = (otp: string) => {
    setIsTransferring(true);
    setTimeout(() => {
      try {
        const source = accounts[0];
        const res = api.transfers.executeTransfer({
          sourceAccountId: source.id,
          amount: quickAmount,
          beneficiaryName: quickPayee,
          idempotencyKey: `idem-${Date.now()}`,
          twoFactorOtp: otp,
          note: `Quick Execution Wire: ${quickPayee}`,
        });
        refreshData();
        setIsTransferring(false);
        setIs2FaOpen(false);
        setPendingTxnData({
          txnId: res.transactionId,
          corrId: res.correlationId,
          amount: quickAmount,
          payee: quickPayee,
          sourceName: source.nickname || source.accountType,
        });
        setIsSuccessOpen(true);
      } catch (err: any) {
        alert(err.message || 'Transfer failed');
        setIsTransferring(false);
      }
    }, 500);
  };

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto">
      {/* Modals */}
      <DepositModal
        isOpen={isDepositOpen}
        onClose={() => setIsDepositOpen(false)}
        accounts={accounts}
        onDeposit={handleDeposit}
        selectedAccountId={selectedAccId}
      />
      <WithdrawModal
        isOpen={isWithdrawOpen}
        onClose={() => setIsWithdrawOpen(false)}
        accounts={accounts}
        onWithdraw={handleWithdraw}
        selectedAccountId={selectedAccId}
      />
      <TwoFactorModal
        isOpen={is2FaOpen}
        onClose={() => setIs2FaOpen(false)}
        onConfirm={handleConfirm2Fa}
        amount={quickAmount}
        beneficiaryName={quickPayee}
        sourceAccountName={accounts[0]?.nickname || 'Primary Checking'}
        isProcessing={isTransferring}
      />
      {pendingTxnData && (
        <TransferSuccessModal
          isOpen={isSuccessOpen}
          onClose={() => setIsSuccessOpen(false)}
          transactionId={pendingTxnData.txnId}
          correlationId={pendingTxnData.corrId}
          amount={pendingTxnData.amount}
          beneficiaryName={pendingTxnData.payee}
          sourceAccountName={pendingTxnData.sourceName}
        />
      )}

      {/* TOP HERO & RECONCILIATION SUMMARY */}
      <section className="relative flex flex-col gap-4 p-6 rounded-2xl bg-surface-container-lowest shadow-sm border border-surface-container-highest overflow-hidden">
        {/* Subtle Institutional Glow */}
        <div className="absolute -right-20 -top-20 w-80 h-80 rounded-full bg-secondary-fixed opacity-40 blur-3xl pointer-events-none"></div>
        <div className="absolute right-1/3 -bottom-20 w-60 h-60 rounded-full bg-surface-container-highest opacity-50 blur-2xl pointer-events-none"></div>

        {/* Header Handshake */}
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex flex-col">
            <div className="flex items-center gap-2 text-on-surface-variant font-label-meta uppercase tracking-wider text-[11px]">
              <span className="inline-block w-2 h-2 rounded-full bg-on-tertiary-container animate-pulse"></span>
              <span>Core Vault Client Session Active</span>
              <span>•</span>
              <span>ACID Synchronized</span>
            </div>
            <h1 className="font-headline-lg text-headline-lg text-on-surface tracking-tight mt-1">
              Good morning, Eleanor
            </h1>
            <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">
              Last authenticated: Today at 08:42 AM from <span className="font-mono font-semibold text-on-surface">192.168.1.104</span> (Mutual TLS active via Edge-Proxy)
            </p>
          </div>

          {/* Trust Protection Chip */}
          <div className="flex items-center gap-3 px-4 py-2.5 bg-surface-container-low rounded-xl border-l-4 border-secondary max-w-md border border-surface-container-highest">
            <span className="material-symbols-outlined text-secondary text-[26px]">verified_user</span>
            <div className="flex flex-col">
              <span className="font-label-meta uppercase text-on-surface font-bold text-[10px]">Account Protection Protocol</span>
              <span className="font-body-sm text-xs text-on-surface-variant leading-tight">
                Transactional Outbox active. Dual-sign required on transfers exceeding $10,000.00 USD.
              </span>
            </div>
          </div>
        </div>

        {/* Primary Liquidity & Ledger Matrix */}
        <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
          {/* Net Available Liquidity */}
          <div className="p-5 rounded-xl bg-surface-container-low border border-surface-container-highest flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="font-label-meta uppercase tracking-wider text-on-surface-variant text-[11px]">Net Available Liquidity</span>
              <span className="px-2 py-0.5 rounded bg-surface-container-high font-label-numeric-sm text-[10px] text-secondary font-bold">CLEARED</span>
            </div>
            <div className="my-2">
              <div className="font-label-numeric-lg text-2xl lg:text-3xl text-on-surface font-bold">
                ${parseFloat(totalLiquidity).toLocaleString('en-US', { minimumFractionDigits: 2 })} <span className="text-sm font-normal text-on-surface-variant">USD</span>
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-on-tertiary-container font-label-numeric-sm text-xs font-semibold">
              <span className="material-symbols-outlined text-[16px]">trending_up</span>
              <span>+$3,250.00 (+1.32%)</span>
              <span className="text-on-surface-variant font-normal text-[11px] ml-1">last 24h</span>
            </div>
          </div>

          {/* Book / Ledger Balance */}
          <div className="p-5 rounded-xl bg-surface-container-low border border-surface-container-highest flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="font-label-meta uppercase tracking-wider text-on-surface-variant text-[11px]">Book Ledger Balance</span>
              <span className="px-2 py-0.5 rounded bg-surface-container-high font-label-numeric-sm text-[10px] text-on-surface-variant font-bold">SETTLEMENT DB</span>
            </div>
            <div className="my-2">
              <div className="font-label-numeric-lg text-2xl lg:text-3xl text-on-surface font-bold">
                ${parseFloat(bookBalanceTotal).toLocaleString('en-US', { minimumFractionDigits: 2 })} <span className="text-sm font-normal text-on-surface-variant">USD</span>
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-on-surface-variant text-xs">
              <span className="material-symbols-outlined text-[16px] text-secondary">timelapse</span>
              <span>Pending In-clearing: <strong className="font-mono text-on-surface">$2,500.00 USD</strong></span>
            </div>
          </div>

          {/* Vault Yield Acceleration */}
          <div className="p-5 rounded-xl bg-surface-container-low border border-surface-container-highest flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="font-label-meta uppercase tracking-wider text-on-surface-variant text-[11px]">Yield Acceleration</span>
              <span className="px-2 py-0.5 rounded bg-tertiary-container/20 font-label-numeric-sm text-[10px] text-on-tertiary-container font-bold">4.85% APY</span>
            </div>
            <div className="my-2">
              <div className="font-label-numeric-lg text-2xl lg:text-3xl text-on-surface font-bold">
                +$814.20 <span className="text-sm font-normal text-on-surface-variant">MTD</span>
              </div>
            </div>
            <div className="flex items-center justify-between text-xs text-on-surface-variant">
              <span>Est. Annual: <strong className="text-on-surface font-mono">+$9,998.40</strong></span>
              <span className="text-secondary font-semibold">Auto-Compounding</span>
            </div>
          </div>
        </div>
      </section>

      {/* QUICK ACTION TOOLBAR */}
      <section className="flex flex-wrap items-center justify-between gap-3 p-4 bg-surface-container-lowest rounded-xl border border-surface-container-highest shadow-sm">
        <div className="flex items-center gap-1.5 text-on-surface-variant font-label-meta uppercase tracking-wider text-xs pl-1">
          <span className="material-symbols-outlined text-[18px]">bolt</span>
          <span>Express Execution</span>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => navigate('/transfers')}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-on-primary text-body-sm font-semibold rounded-xl hover:bg-inverse-surface transition-colors shadow-sm"
          >
            <span className="material-symbols-outlined text-[18px]">send</span>
            <span>Send Money</span>
          </button>
          <button
            onClick={() => {
              setSelectedAccId(accounts[0]?.id);
              setIsDepositOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-surface-container-low text-on-surface text-body-sm font-semibold rounded-xl hover:bg-surface-container transition-colors border border-surface-container-highest"
          >
            <span className="material-symbols-outlined text-[18px] text-secondary">account_balance_wallet</span>
            <span>Deposit Funds</span>
          </button>
          <button
            onClick={() => {
              setSelectedAccId(accounts[0]?.id);
              setIsWithdrawOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-surface-container-low text-on-surface text-body-sm font-semibold rounded-xl hover:bg-surface-container transition-colors border border-surface-container-highest"
          >
            <span className="material-symbols-outlined text-[18px] text-error">output</span>
            <span>Withdraw</span>
          </button>
          <button
            onClick={() => navigate('/beneficiaries')}
            className="flex items-center gap-2 px-4 py-2 bg-surface-container-low text-on-surface text-body-sm font-semibold rounded-xl hover:bg-surface-container transition-colors border border-surface-container-highest"
          >
            <span className="material-symbols-outlined text-[18px]">person_add</span>
            <span>Beneficiaries</span>
          </button>
          <button
            onClick={() => navigate('/scheduled-transfers')}
            className="flex items-center gap-2 px-4 py-2 bg-surface-container-low text-on-surface text-body-sm font-semibold rounded-xl hover:bg-surface-container transition-colors border border-surface-container-highest"
          >
            <span className="material-symbols-outlined text-[18px]">calendar_clock</span>
            <span>Scheduled Transfers</span>
          </button>
        </div>
      </section>

      {/* ACCOUNT PORTFOLIO CARDS */}
      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <h2 className="font-headline-sm text-headline-sm font-bold text-on-surface">Accounts &amp; Sub-Ledgers</h2>
            <span className="px-2 py-0.5 rounded-full bg-surface-container-high font-label-numeric-sm text-xs text-on-surface-variant font-semibold">
              {accounts.length} Portfolios
            </span>
          </div>
          <button
            onClick={() => navigate('/accounts')}
            className="text-secondary hover:underline text-xs font-semibold flex items-center gap-1"
          >
            <span>Manage Ledgers</span>
            <span className="material-symbols-outlined text-[16px]">chevron_right</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {accounts.map((acc, index) => (
            <div
              key={acc.id}
              className="flex flex-col justify-between p-5 rounded-2xl bg-surface-container-lowest border border-surface-container-highest shadow-sm hover:shadow-md transition-all relative overflow-hidden group"
            >
              <div className={`absolute top-0 left-0 right-0 h-1.5 ${index === 0 ? 'bg-secondary' : index === 1 ? 'bg-on-tertiary-container' : 'bg-primary-container'}`}></div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-secondary text-[20px]">account_balance</span>
                    <h3 className="font-headline-sm text-body-lg font-bold text-on-surface truncate">{acc.nickname || acc.accountType}</h3>
                  </div>
                  <span className={`flex items-center gap-1 px-2.5 py-0.5 rounded-full font-label-meta text-[10px] font-bold ${acc.status === 'ACTIVE' ? 'bg-tertiary-container/20 text-on-tertiary-container' : 'bg-error-container text-error'}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${acc.status === 'ACTIVE' ? 'bg-on-tertiary-container' : 'bg-error'}`}></span>
                    {acc.status}
                  </span>
                </div>

                <div className="font-label-numeric-sm text-xs text-on-surface-variant mb-4">
                  IBAN: <span className="font-semibold text-on-surface font-mono tracking-tight">{acc.iban || acc.accountNumber}</span>
                </div>

                <div className="flex flex-col my-3 py-2.5 px-3.5 rounded-xl bg-surface-container-low border border-surface-container-highest">
                  <span className="font-label-meta text-[10px] uppercase text-on-surface-variant font-bold">Available Balance</span>
                  <div className="font-label-numeric-lg text-xl text-on-surface font-bold mt-0.5">
                    ${parseFloat(acc.balance).toLocaleString('en-US', { minimumFractionDigits: 2 })} <span className="text-xs font-normal text-on-surface-variant">USD</span>
                  </div>
                </div>

                {acc.dailyLimit && (
                  <div className="flex flex-col gap-1 my-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-on-surface-variant">Daily Limit:</span>
                      <span className="font-mono text-on-surface">${parseFloat(acc.dailyLimitUsed || '0').toLocaleString('en-US')} / ${parseFloat(acc.dailyLimit).toLocaleString('en-US')}</span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-surface-container-highest overflow-hidden">
                      <div
                        className="h-full bg-secondary rounded-full"
                        style={{ width: `${Math.min(100, (parseFloat(acc.dailyLimitUsed || '0') / parseFloat(acc.dailyLimit)) * 100)}%` }}
                      ></div>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 pt-3 border-t border-surface-container-highest mt-3">
                <button
                  onClick={() => {
                    setSelectedAccId(acc.id);
                    setIsDepositOpen(true);
                  }}
                  className="flex-1 py-1.5 px-2 bg-surface-container text-on-surface text-xs font-semibold rounded-lg hover:bg-surface-container-high transition-colors text-center"
                >
                  Deposit
                </button>
                <button
                  onClick={() => {
                    setSelectedAccId(acc.id);
                    setIsWithdrawOpen(true);
                  }}
                  className="flex-1 py-1.5 px-2 bg-surface-container text-on-surface text-xs font-semibold rounded-lg hover:bg-surface-container-high transition-colors text-center"
                >
                  Withdraw
                </button>
                <button
                  onClick={() => navigate('/transfers')}
                  className="py-1.5 px-2.5 bg-primary text-on-primary text-xs font-semibold rounded-lg hover:bg-inverse-surface transition-colors"
                  title="Send from this ledger"
                >
                  <span className="material-symbols-outlined text-[16px]">send</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* TWO-COLUMN LOWER DECK: QUICK WIRE FORM & RECENT LEDGER JOURNAL */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Quick Wire Form Card (5 Cols) */}
        <div className="lg:col-span-5 p-5 rounded-2xl bg-surface-container-lowest border border-surface-container-highest shadow-sm flex flex-col gap-4">
          <div className="flex items-center justify-between pb-3 border-b border-surface-container-highest">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-secondary text-[20px]">flash_on</span>
              <h3 className="font-headline-sm text-body-lg font-bold text-on-surface">Quick Wire Dispatch</h3>
            </div>
            <span className="font-label-meta text-[10px] uppercase font-bold text-on-tertiary-container bg-tertiary-container/20 px-2 py-0.5 rounded">
              T-0 RTGS
            </span>
          </div>

          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <label className="font-label-meta uppercase text-on-surface-variant font-bold text-[10px]">Beneficiary Payee</label>
              <select
                value={quickPayee}
                onChange={(e) => setQuickPayee(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-surface-container-low border border-surface-container-highest text-on-surface text-body-sm font-semibold focus:outline-none focus:border-secondary"
              >
                {beneficiaries.map((b) => (
                  <option key={b.id} value={b.name}>
                    {b.name} ({b.bankName})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="font-label-meta uppercase text-on-surface-variant font-bold text-[10px]">Monetary Sum (USD)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono font-bold text-on-surface-variant">$</span>
                <input
                  type="number"
                  step="0.01"
                  value={quickAmount}
                  onChange={(e) => setQuickAmount(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 rounded-xl bg-surface-container-low border border-surface-container-highest text-on-surface font-label-numeric-md font-bold focus:outline-none focus:border-secondary"
                />
              </div>
            </div>

            <div className="p-3 rounded-xl bg-surface-container-low text-xs text-on-surface-variant flex flex-col gap-1">
              <div className="flex justify-between">
                <span>Interbank Routing Fee:</span>
                <span className="font-mono font-bold text-on-tertiary-container">$0.00 USD (Waived)</span>
              </div>
              <div className="flex justify-between">
                <span>Settlement Engine:</span>
                <span className="font-semibold text-on-surface">Fedwire Same-Day (ACID Guaranteed)</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleStartQuickTransfer}
              className="w-full py-2.5 px-4 bg-primary text-on-primary font-semibold rounded-xl hover:bg-inverse-surface transition-colors flex items-center justify-center gap-2 shadow-sm"
            >
              <span className="material-symbols-outlined text-[18px]">verified_user</span>
              <span>Authorize &amp; Dispatch Wire</span>
            </button>
          </div>
        </div>

        {/* Recent Ledger Journal (7 Cols) */}
        <div className="lg:col-span-7 p-5 rounded-2xl bg-surface-container-lowest border border-surface-container-highest shadow-sm flex flex-col gap-4">
          <div className="flex items-center justify-between pb-3 border-b border-surface-container-highest">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-secondary text-[20px]">receipt_long</span>
              <h3 className="font-headline-sm text-body-lg font-bold text-on-surface">Recent Ledger Journal</h3>
            </div>
            <button
              onClick={() => navigate('/transactions')}
              className="text-secondary hover:underline text-xs font-semibold flex items-center gap-1"
            >
              <span>Full Journal</span>
              <span className="material-symbols-outlined text-[16px]">chevron_right</span>
            </button>
          </div>

          <div className="flex flex-col divide-y divide-surface-container-highest">
            {ledgerEntries.slice(0, 5).map((entry) => (
              <div key={entry.id} className="py-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${entry.type === 'CREDIT' ? 'bg-tertiary-container/30 text-on-tertiary-container' : 'bg-surface-container-low text-on-surface'}`}>
                    <span className="material-symbols-outlined text-[18px]">
                      {entry.type === 'CREDIT' ? 'arrow_downward' : 'arrow_upward'}
                    </span>
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="font-semibold text-body-sm text-on-surface truncate">{entry.description}</span>
                    <div className="flex items-center gap-2 text-xs text-on-surface-variant mt-0.5">
                      <span className="font-mono text-[10px]">{entry.transactionId}</span>
                      <span>•</span>
                      <span className="text-[11px]">{new Date(entry.timestamp).toLocaleDateString()}</span>
                      {entry.status === 'REVERSED' && (
                        <span className="px-1.5 py-0.2 rounded bg-error-container text-error font-bold text-[9px]">REVERSED</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex flex-col items-end shrink-0">
                  <span className={`font-label-numeric-md font-bold text-body-sm ${entry.type === 'CREDIT' ? 'text-on-tertiary-container' : 'text-on-surface'}`}>
                    {entry.type === 'CREDIT' ? '+' : '-'}${parseFloat(entry.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </span>
                  <span className="font-label-numeric-sm text-[10px] text-on-surface-variant">
                    Bal: ${parseFloat(entry.balanceAfter).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
