import React, { useState } from 'react';
import { api } from '../services/api';
import type { Account, LedgerEntry } from '../types';
import { formatMoney } from '../utils/currency';
import { DepositModal } from '../components/DepositModal';
import { WithdrawModal } from '../components/WithdrawModal';
import { FreezeAccountModal } from '../components/FreezeAccountModal';

export const AccountsPage: React.FC = () => {
  const [accounts, setAccounts] = useState<Account[]>(() => api.accounts.getAccounts());
  const [ledgerEntries, setLedgerEntries] = useState<LedgerEntry[]>(() => api.ledger.getEntries());
  const [selectedAccount, setSelectedAccount] = useState<Account>(accounts[0] || {} as Account);
  const [filterQuery, setFilterQuery] = useState('');

  // Modals
  const [isDepositOpen, setIsDepositOpen] = useState(false);
  const [isWithdrawOpen, setIsWithdrawOpen] = useState(false);
  const [isFreezeOpen, setIsFreezeOpen] = useState(false);

  const refreshData = () => {
    const freshAccounts = api.accounts.getAccounts();
    setAccounts(freshAccounts);
    setLedgerEntries(api.ledger.getEntries());
    const updatedSelected = freshAccounts.find((a) => a.id === selectedAccount.id) || freshAccounts[0];
    setSelectedAccount(updatedSelected);
  };

  const handleDeposit = (accId: string, amount: number, note?: string) => {
    api.accounts.deposit(accId, amount, note);
    refreshData();
  };

  const handleWithdraw = (accId: string, amount: number, note?: string) => {
    api.accounts.withdraw(accId, amount, note);
    refreshData();
  };

  const handleFreezeToggle = (accId: string, reason: string) => {
    if (selectedAccount.status === 'FROZEN') {
      api.accounts.unfreezeAccount(accId);
    } else {
      api.accounts.freezeAccount(accId, reason);
    }
    refreshData();
  };

  const accountLedger = ledgerEntries.filter((l) => l.accountId === selectedAccount.id);
  const filteredLedger = filterQuery
    ? accountLedger.filter((l) => l.description.toLowerCase().includes(filterQuery.toLowerCase()) || l.transactionId.toLowerCase().includes(filterQuery.toLowerCase()))
    : accountLedger;

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto">
      <DepositModal
        isOpen={isDepositOpen}
        onClose={() => setIsDepositOpen(false)}
        accounts={accounts}
        onDeposit={handleDeposit}
        selectedAccountId={selectedAccount.id}
      />
      <WithdrawModal
        isOpen={isWithdrawOpen}
        onClose={() => setIsWithdrawOpen(false)}
        accounts={accounts}
        onWithdraw={handleWithdraw}
        selectedAccountId={selectedAccount.id}
      />
      <FreezeAccountModal
        isOpen={isFreezeOpen}
        onClose={() => setIsFreezeOpen(false)}
        account={selectedAccount}
        onConfirm={handleFreezeToggle}
      />

      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 bg-surface-container-lowest rounded-2xl border border-surface-container-highest shadow-sm">
        <div>
          <div className="flex items-center gap-2 text-xs font-label-meta uppercase text-secondary font-bold">
            <span className="material-symbols-outlined text-[18px]">account_balance</span>
            <span>Account Management</span>
          </div>
          <h1 className="font-headline-lg text-headline-lg font-bold text-on-surface mt-1">
            My Accounts &amp; Fixed Deposits
          </h1>
          <p className="text-body-sm text-on-surface-variant mt-0.5">
            Manage your Savings, Salary, and Fixed Deposit accounts in INR with real-time balance tracking.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setIsDepositOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-secondary text-on-secondary rounded-xl font-semibold hover:bg-on-secondary-fixed-variant transition-colors shadow-sm"
          >
            <span className="material-symbols-outlined text-[18px]">account_balance_wallet</span>
            <span>Deposit Money</span>
          </button>
          <button
            onClick={() => setIsWithdrawOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-surface-container-low text-on-surface rounded-xl font-semibold hover:bg-surface-container transition-colors border border-surface-container-highest"
          >
            <span className="material-symbols-outlined text-[18px] text-error">output</span>
            <span>Withdraw Money</span>
          </button>
          <button
            onClick={() => setIsFreezeOpen(true)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-semibold transition-colors shadow-sm ${
              selectedAccount.status === 'FROZEN'
                ? 'bg-on-tertiary-container text-on-primary hover:bg-tertiary-container'
                : 'bg-error text-on-error hover:bg-on-error-container'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">
              {selectedAccount.status === 'FROZEN' ? 'lock_open' : 'lock_person'}
            </span>
            <span>{selectedAccount.status === 'FROZEN' ? 'Unlock Account' : 'Lock / Freeze Account'}</span>
          </button>
        </div>
      </div>

      {/* Account Selector Strip */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {accounts.map((acc) => {
          const isSelected = acc.id === selectedAccount.id;
          return (
            <div
              key={acc.id}
              onClick={() => setSelectedAccount(acc)}
              className={`p-5 rounded-2xl cursor-pointer transition-all border ${
                isSelected
                  ? 'bg-surface-container-low border-secondary shadow-md ring-2 ring-secondary/20'
                  : 'bg-surface-container-lowest border-surface-container-highest hover:bg-surface-container-low'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-headline-sm text-body-lg font-bold text-on-surface truncate">{acc.nickname || acc.accountType}</span>
                <div className="flex items-center gap-1.5">
                  <span className="px-2 py-0.5 rounded font-mono text-[10px] font-bold bg-surface-container text-secondary">
                    {acc.currency || 'INR'}
                  </span>
                  <span className={`px-2 py-0.5 rounded-full font-label-meta text-[10px] font-bold ${acc.status === 'ACTIVE' ? 'bg-tertiary-container/20 text-on-tertiary-container' : 'bg-error-container text-error'}`}>
                    {acc.status}
                  </span>
                </div>
              </div>
              <p className="font-mono text-xs text-on-surface-variant mb-3">{acc.accountNumber}</p>
              <div className="font-label-numeric-lg text-2xl font-bold text-on-surface">
                {formatMoney(acc.balance, acc.currency || 'INR', true)}
              </div>
            </div>
          );
        })}
      </div>

      {/* Selected Account Deep Inspection */}
      <div className="p-6 rounded-2xl bg-surface-container-lowest border border-surface-container-highest shadow-sm flex flex-col gap-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-surface-container-highest gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-surface-container-low flex items-center justify-center text-secondary border border-surface-container-highest">
              <span className="material-symbols-outlined text-[28px]">account_balance</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-headline-md text-headline-sm font-bold text-on-surface">
                  {selectedAccount.nickname || selectedAccount.accountType}
                </h2>
                <span className="px-2.5 py-0.5 rounded font-mono text-xs font-bold bg-surface-container-high text-secondary">
                  {selectedAccount.currency || 'INR'}
                </span>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${selectedAccount.status === 'ACTIVE' ? 'bg-tertiary-container/20 text-on-tertiary-container' : 'bg-error-container text-error'}`}>
                  {selectedAccount.status}
                </span>
              </div>
              <p className="font-mono text-xs text-on-surface-variant mt-0.5">
                Account Number: <strong className="text-on-surface">{selectedAccount.accountNumber}</strong> · IFSC: <strong className="text-on-surface">{selectedAccount.routingNumber}</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="flex flex-col text-right">
              <span className="font-label-meta uppercase text-on-surface-variant text-[10px]">Available Balance</span>
              <span className="font-label-numeric-lg text-xl font-bold text-on-surface">
                {formatMoney(selectedAccount.availableLiquidity || selectedAccount.balance, selectedAccount.currency || 'INR', true)}
              </span>
            </div>
          </div>
        </div>

        {/* Limit Bar */}
        {selectedAccount.dailyLimit && (
          <div className="p-4 rounded-xl bg-surface-container-low border border-surface-container-highest flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-label-meta uppercase font-bold text-on-surface-variant">Daily Transfer Limit ({selectedAccount.currency || 'INR'})</span>
              <span className="font-mono font-bold text-on-surface">
                {formatMoney(selectedAccount.dailyLimitUsed || '0', selectedAccount.currency || 'INR')} / {formatMoney(selectedAccount.dailyLimit, selectedAccount.currency || 'INR')}
              </span>
            </div>
            <div className="w-full h-2 rounded-full bg-surface-container-highest overflow-hidden">
              <div
                className="h-full bg-secondary rounded-full transition-all"
                style={{ width: `${Math.min(100, (parseFloat(selectedAccount.dailyLimitUsed || '0') / parseFloat(selectedAccount.dailyLimit)) * 100)}%` }}
              ></div>
            </div>
          </div>
        )}

        {/* Account Statement Table */}
        <div className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <h3 className="font-headline-sm text-body-lg font-bold text-on-surface">Account Statement</h3>
              <span className="px-2 py-0.5 rounded bg-surface-container text-xs font-mono font-semibold text-on-surface-variant">
                {accountLedger.length} Records
              </span>
            </div>
            <div className="relative w-full sm:w-64">
              <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant text-[18px]">search</span>
              <input
                type="text"
                placeholder="Filter transactions..."
                value={filterQuery}
                onChange={(e) => setFilterQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-surface-container-low border border-surface-container-highest text-xs text-on-surface focus:outline-none focus:border-secondary"
              />
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-surface-container-highest">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface-container-low text-on-surface-variant font-label-meta uppercase border-b border-surface-container-highest">
                <tr>
                  <th className="p-3">Type</th>
                  <th className="p-3">Reference / Txn ID</th>
                  <th className="p-3">Description</th>
                  <th className="p-3">Currency</th>
                  <th className="p-3">Date</th>
                  <th className="p-3 text-right">Amount</th>
                  <th className="p-3 text-right">Balance After</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-container-highest">
                {filteredLedger.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-6 text-center text-on-surface-variant">
                      No transaction records found for this account.
                    </td>
                  </tr>
                ) : (
                  filteredLedger.map((entry) => (
                    <tr key={entry.id} className="hover:bg-surface-container-low transition-colors">
                      <td className="p-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-bold font-label-meta text-[10px] ${
                          entry.type === 'CREDIT' ? 'bg-tertiary-container/30 text-on-tertiary-container' : 'bg-surface-container text-on-surface'
                        }`}>
                          <span className="material-symbols-outlined text-[14px]">
                            {entry.type === 'CREDIT' ? 'arrow_downward' : 'arrow_upward'}
                          </span>
                          {entry.type}
                        </span>
                      </td>
                      <td className="p-3">
                        <span className="font-mono font-bold text-on-surface">{entry.transactionId}</span>
                      </td>
                      <td className="p-3 font-semibold text-on-surface">{entry.description}</td>
                      <td className="p-3 font-mono font-bold text-secondary">{entry.currency || selectedAccount.currency || 'INR'}</td>
                      <td className="p-3 font-mono text-on-surface-variant">{new Date(entry.timestamp).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                      <td className="p-3 text-right font-label-numeric-md font-bold">
                        <span className={entry.type === 'CREDIT' ? 'text-on-tertiary-container' : 'text-on-surface'}>
                          {entry.type === 'CREDIT' ? '+' : '-'}{formatMoney(entry.amount, entry.currency || selectedAccount.currency || 'INR')}
                        </span>
                      </td>
                      <td className="p-3 text-right font-mono text-on-surface font-semibold">
                        {formatMoney(entry.balanceAfter, entry.currency || selectedAccount.currency || 'INR')}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
