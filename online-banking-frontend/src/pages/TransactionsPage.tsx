import React, { useState } from 'react';
import { api } from '../services/api';
import type { Account, LedgerEntry } from '../types';
import { formatMoney } from '../utils/currency';
import { ReversalModal } from '../components/ReversalModal';

export const TransactionsPage: React.FC = () => {
  const [entries, setEntries] = useState<LedgerEntry[]>(() => api.ledger.getEntries());
  const [accounts] = useState<Account[]>(() => api.accounts.getAccounts());
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'DEBIT' | 'CREDIT'>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'SETTLED' | 'REVERSED'>('ALL');
  const [selectedAccId, setSelectedAccId] = useState('ALL');

  // Reversal Modal
  const [selectedForReversal, setSelectedForReversal] = useState<LedgerEntry | null>(null);

  const refresh = () => setEntries(api.ledger.getEntries());

  const handleExecuteReversal = (transactionId: string, reason: string) => {
    try {
      api.transfers.reverseTransfer(transactionId, reason);
      refresh();
    } catch (err: any) {
      alert(err.message || 'Reversal failed');
    }
  };

  const handleExportCSV = () => {
    const headers = 'Transaction ID,Account,Currency,Type,Amount,Status,Description,Timestamp,Correlation ID,Balance After\n';
    const rows = filtered.map((e) =>
      `"${e.transactionId}","${e.accountName || e.accountId}","${e.currency || 'USD'}","${e.type}","${e.amount}","${e.status}","${e.description}","${e.timestamp}","${e.correlationId}","${e.balanceAfter}"`
    ).join('\n');
    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `aegis-ledger-statement-${Date.now()}.csv`;
    a.click();
  };

  const filtered = entries.filter((e) => {
    if (typeFilter !== 'ALL' && e.type !== typeFilter) return false;
    if (statusFilter !== 'ALL' && e.status !== statusFilter) return false;
    if (selectedAccId !== 'ALL' && e.accountId !== selectedAccId) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchDesc = e.description.toLowerCase().includes(q);
      const matchTxn = e.transactionId.toLowerCase().includes(q);
      const matchCorr = e.correlationId.toLowerCase().includes(q);
      const matchParty = e.counterparty?.toLowerCase().includes(q);
      if (!matchDesc && !matchTxn && !matchCorr && !matchParty) return false;
    }
    return true;
  });

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto">
      {/* Reversal Confirmation Modal */}
      <ReversalModal
        isOpen={!!selectedForReversal}
        onClose={() => setSelectedForReversal(null)}
        entry={selectedForReversal}
        onConfirm={handleExecuteReversal}
      />

      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 bg-surface-container-lowest rounded-2xl border border-surface-container-highest shadow-sm">
        <div>
          <div className="flex items-center gap-2 text-xs font-label-meta uppercase text-secondary font-bold">
            <span className="material-symbols-outlined text-[18px]">receipt_long</span>
            <span>Account Statement &amp; Transaction History</span>
          </div>
          <h1 className="font-headline-lg text-headline-lg font-bold text-on-surface mt-1">
            Transactions &amp; Statements
          </h1>
          <p className="text-body-sm text-on-surface-variant mt-0.5">
            Complete real-time transaction statement with category breakdowns and instant reversal.
          </p>
        </div>

        <button
          onClick={handleExportCSV}
          className="flex items-center gap-2 px-4 py-2.5 bg-surface-container-low text-on-surface hover:bg-surface-container rounded-xl font-semibold border border-surface-container-highest transition-colors shadow-xs text-body-sm"
        >
          <span className="material-symbols-outlined text-[18px]">file_download</span>
          <span>Export CSV Statement</span>
        </button>
      </div>

      {/* Filter Toolbar */}
      <div className="p-4 bg-surface-container-lowest rounded-2xl border border-surface-container-highest shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="relative flex-1 min-w-[240px]">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[18px]">search</span>
          <input
            type="text"
            placeholder="Search by transaction ID, correlation hash, payee..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-surface-container-low rounded-xl border border-surface-container-highest text-xs text-on-surface focus:outline-none focus:border-secondary"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <select
            value={selectedAccId}
            onChange={(e) => setSelectedAccId(e.target.value)}
            className="px-3 py-2 rounded-xl bg-surface-container-low border border-surface-container-highest text-xs text-on-surface font-semibold focus:outline-none focus:border-secondary"
          >
            <option value="ALL">All Sub-Ledgers</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.nickname || a.accountType} ({a.currency || 'USD'})
              </option>
            ))}
          </select>

          {/* Type Filter */}
          <div className="flex items-center p-1 bg-surface-container-low rounded-xl border border-surface-container-highest">
            <button
              onClick={() => setTypeFilter('ALL')}
              className={`px-3 py-1 rounded-lg font-label-meta text-[10px] font-bold transition-all ${
                typeFilter === 'ALL' ? 'bg-surface-container-lowest text-secondary shadow-xs' : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              ALL
            </button>
            <button
              onClick={() => setTypeFilter('DEBIT')}
              className={`px-3 py-1 rounded-lg font-label-meta text-[10px] font-bold transition-all ${
                typeFilter === 'DEBIT' ? 'bg-surface-container-lowest text-secondary shadow-xs' : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              DEBITS
            </button>
            <button
              onClick={() => setTypeFilter('CREDIT')}
              className={`px-3 py-1 rounded-lg font-label-meta text-[10px] font-bold transition-all ${
                typeFilter === 'CREDIT' ? 'bg-surface-container-lowest text-secondary shadow-xs' : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              CREDITS
            </button>
          </div>

          {/* Status Filter */}
          <div className="flex items-center p-1 bg-surface-container-low rounded-xl border border-surface-container-highest">
            <button
              onClick={() => setStatusFilter('ALL')}
              className={`px-3 py-1 rounded-lg font-label-meta text-[10px] font-bold transition-all ${
                statusFilter === 'ALL' ? 'bg-surface-container-lowest text-secondary shadow-xs' : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              ALL
            </button>
            <button
              onClick={() => setStatusFilter('SETTLED')}
              className={`px-3 py-1 rounded-lg font-label-meta text-[10px] font-bold transition-all ${
                statusFilter === 'SETTLED' ? 'bg-surface-container-lowest text-on-tertiary-container shadow-xs' : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              SETTLED
            </button>
            <button
              onClick={() => setStatusFilter('REVERSED')}
              className={`px-3 py-1 rounded-lg font-label-meta text-[10px] font-bold transition-all ${
                statusFilter === 'REVERSED' ? 'bg-surface-container-lowest text-error shadow-xs' : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              REVERSED
            </button>
          </div>
        </div>
      </div>

      {/* Main Ledger Table */}
      <div className="p-6 bg-surface-container-lowest rounded-2xl border border-surface-container-highest shadow-sm flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="font-headline-sm text-body-lg font-bold text-on-surface">Ledger Records</h2>
            <span className="px-2 py-0.5 rounded bg-surface-container-high text-xs font-mono font-semibold text-on-surface-variant">
              {filtered.length} of {entries.length}
            </span>
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-surface-container-highest">
          <table className="w-full text-left text-xs">
            <thead className="bg-surface-container-low text-on-surface-variant font-label-meta uppercase border-b border-surface-container-highest">
              <tr>
                <th className="p-3">Type</th>
                <th className="p-3">Txn ID / Correlation</th>
                <th className="p-3">Description / Payee</th>
                <th className="p-3">Account Sub-Ledger</th>
                <th className="p-3">Currency</th>
                <th className="p-3">Timestamp</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-right">Amount</th>
                <th className="p-3 text-right">Balance After</th>
                <th className="p-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-container-highest">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={10} className="p-8 text-center text-on-surface-variant text-body-sm">
                    No transactions matching the selected criteria found.
                  </td>
                </tr>
              ) : (
                filtered.map((entry) => (
                  <tr key={entry.id} className="hover:bg-surface-container-low transition-colors">
                    <td className="p-3">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-label-meta text-[10px] font-bold ${
                        entry.type === 'CREDIT' ? 'bg-tertiary-container/30 text-on-tertiary-container' : 'bg-surface-container text-on-surface'
                      }`}>
                        <span className="material-symbols-outlined text-[14px]">
                          {entry.type === 'CREDIT' ? 'arrow_downward' : 'arrow_upward'}
                        </span>
                        {entry.type}
                      </span>
                    </td>
                    <td className="p-3">
                      <div className="flex flex-col">
                        <span className="font-mono font-bold text-on-surface">{entry.transactionId}</span>
                        <span className="font-mono text-[10px] text-on-surface-variant">{entry.correlationId}</span>
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="flex flex-col max-w-xs">
                        <span className="font-semibold text-on-surface truncate">{entry.description}</span>
                        {entry.counterparty && (
                          <span className="text-[10px] text-on-surface-variant">Payee: {entry.counterparty}</span>
                        )}
                      </div>
                    </td>
                    <td className="p-3 font-semibold text-on-surface truncate max-w-[140px]">
                      {entry.accountName || entry.accountId}
                    </td>
                    <td className="p-3 font-mono font-bold text-secondary">{entry.currency || 'USD'}</td>
                    <td className="p-3 font-mono text-on-surface-variant">{new Date(entry.timestamp).toLocaleString()}</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded-full font-label-meta text-[9px] font-bold uppercase ${
                        entry.status === 'SETTLED'
                          ? 'bg-tertiary-container/20 text-on-tertiary-container'
                          : entry.status === 'REVERSED'
                          ? 'bg-error-container text-error'
                          : 'bg-surface-container text-on-surface-variant'
                      }`}>
                        {entry.status}
                      </span>
                    </td>
                    <td className="p-3 text-right font-label-numeric-md font-bold">
                      <span className={entry.type === 'CREDIT' ? 'text-on-tertiary-container' : 'text-on-surface'}>
                        {entry.type === 'CREDIT' ? '+' : '-'}{formatMoney(entry.amount, entry.currency || 'USD')}
                      </span>
                    </td>
                    <td className="p-3 text-right font-mono text-on-surface font-semibold">
                      {formatMoney(entry.balanceAfter, entry.currency || 'USD')}
                    </td>
                    <td className="p-3 text-right">
                      {entry.type === 'DEBIT' && entry.status !== 'REVERSED' && (
                        <button
                          onClick={() => setSelectedForReversal(entry)}
                          className="px-2.5 py-1 rounded bg-error-container/60 text-error hover:bg-error-container font-semibold text-[11px] transition-colors"
                          title="Initiate Double-Entry Reversal"
                        >
                          Reverse
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
