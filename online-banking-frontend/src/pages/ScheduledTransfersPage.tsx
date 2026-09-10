import React, { useState } from 'react';
import { api } from '../services/api';
import type { Account, Beneficiary, ScheduledTransfer } from '../types';
import { formatMoney } from '../utils/currency';

export const ScheduledTransfersPage: React.FC = () => {
  const [schedules, setSchedules] = useState<ScheduledTransfer[]>(() => api.scheduled.getScheduledTransfers());
  const [accounts] = useState<Account[]>(() => api.accounts.getAccounts());
  const [beneficiaries] = useState<Beneficiary[]>(() => api.beneficiaries.getBeneficiaries());
  const [isAddOpen, setIsAddOpen] = useState(false);

  // Form fields
  const [sourceAccountId, setSourceAccountId] = useState(accounts[0]?.id || '');
  const [beneficiaryName, setBeneficiaryName] = useState(beneficiaries[0]?.name || '');
  const [amount, setAmount] = useState('1000.00');
  const [frequency, setFrequency] = useState<'DAILY' | 'WEEKLY' | 'MONTHLY'>('MONTHLY');
  const [nextExecutionDate, setNextExecutionDate] = useState('2026-10-01');
  const [note, setNote] = useState('');

  const refresh = () => setSchedules(api.scheduled.getScheduledTransfers());

  const sourceAcc = accounts.find((a) => a.id === sourceAccountId) || accounts[0];
  const sourceCurrency = sourceAcc ? (sourceAcc.currency || 'USD') : 'USD';

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    const ben = beneficiaries.find((b) => b.name === beneficiaryName) || beneficiaries[0];

    api.scheduled.createScheduledTransfer({
      sourceAccountId: sourceAcc.id,
      sourceAccountName: sourceAcc.nickname || sourceAcc.accountType,
      beneficiaryName: ben?.name || beneficiaryName,
      beneficiaryAccount: ben?.accountNumber || 'US94 AEGIS 0001 ...',
      amount,
      currency: sourceCurrency,
      frequency,
      nextExecutionDate,
      status: 'ACTIVE',
      note: note || `Scheduled ${frequency} wire transfer (${sourceCurrency})`,
    });

    setIsAddOpen(false);
    refresh();
  };

  const handleTogglePause = (sch: ScheduledTransfer) => {
    if (sch.status === 'ACTIVE') {
      api.scheduled.pauseScheduledTransfer(sch.id);
    } else {
      api.scheduled.resumeScheduledTransfer(sch.id);
    }
    refresh();
  };

  const handleCancel = (id: string) => {
    if (confirm('Cancel and terminate this recurring scheduled transfer?')) {
      api.scheduled.cancelScheduledTransfer(id);
      refresh();
    }
  };

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto">
      {/* Create Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-on-surface/40 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-md p-6 bg-surface-container-lowest rounded-2xl shadow-2xl border border-surface-container-highest">
            <div className="flex items-center justify-between pb-4 border-b border-surface-container-highest">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-lg bg-surface-container-low flex items-center justify-center text-secondary">
                  <span className="material-symbols-outlined text-[22px]">calendar_clock</span>
                </div>
                <div>
                  <h3 className="font-headline-sm text-body-lg font-bold text-on-surface">Schedule New Payment</h3>
                  <p className="font-label-meta text-label-meta uppercase text-on-surface-variant">Recurring Ledger Execution</p>
                </div>
              </div>
              <button onClick={() => setIsAddOpen(false)} className="p-1 rounded-lg text-on-surface-variant hover:bg-surface-container">
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <form onSubmit={handleCreate} className="flex flex-col gap-3.5 mt-4">
              <div className="flex flex-col gap-1">
                <label className="font-label-meta uppercase text-on-surface-variant font-bold text-[10px]">Source Ledger</label>
                <select
                  value={sourceAccountId}
                  onChange={(e) => setSourceAccountId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-surface-container-low border border-surface-container-highest text-xs text-on-surface font-semibold focus:outline-none focus:border-secondary"
                >
                  {accounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.nickname || acc.accountType} ({acc.currency}) - {formatMoney(acc.balance, acc.currency)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-label-meta uppercase text-on-surface-variant font-bold text-[10px]">Beneficiary Payee</label>
                <select
                  value={beneficiaryName}
                  onChange={(e) => setBeneficiaryName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-surface-container-low border border-surface-container-highest text-xs text-on-surface font-semibold focus:outline-none focus:border-secondary"
                >
                  {beneficiaries.map((b) => (
                    <option key={b.id} value={b.name}>
                      {b.name} ({b.bankName}) [{b.currency || 'USD'}]
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="font-label-meta uppercase text-on-surface-variant font-bold text-[10px]">Amount ({sourceCurrency})</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-surface-container-low border border-surface-container-highest text-xs font-mono font-bold text-on-surface focus:outline-none focus:border-secondary"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="font-label-meta uppercase text-on-surface-variant font-bold text-[10px]">Frequency</label>
                  <select
                    value={frequency}
                    onChange={(e) => setFrequency(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl bg-surface-container-low border border-surface-container-highest text-xs text-on-surface font-semibold focus:outline-none focus:border-secondary"
                  >
                    <option value="DAILY">Daily</option>
                    <option value="WEEKLY">Weekly</option>
                    <option value="MONTHLY">Monthly</option>
                  </select>
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-label-meta uppercase text-on-surface-variant font-bold text-[10px]">First Execution Date</label>
                <input
                  type="date"
                  required
                  value={nextExecutionDate}
                  onChange={(e) => setNextExecutionDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-surface-container-low border border-surface-container-highest text-xs font-mono text-on-surface focus:outline-none focus:border-secondary"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-label-meta uppercase text-on-surface-variant font-bold text-[10px]">Memo / Purpose</label>
                <input
                  type="text"
                  placeholder="e.g. Automated Supplier Retainer"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-surface-container-low border border-surface-container-highest text-xs text-on-surface focus:outline-none focus:border-secondary"
                />
              </div>

              <div className="flex items-center gap-3 pt-3 border-t border-surface-container-highest">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="flex-1 py-2 px-4 rounded-xl border border-surface-container-highest text-on-surface hover:bg-surface-container font-semibold transition-colors text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 px-4 rounded-xl bg-primary text-on-primary font-semibold hover:bg-inverse-surface transition-colors shadow-sm text-xs"
                >
                  Confirm Schedule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 bg-surface-container-lowest rounded-2xl border border-surface-container-highest shadow-sm">
        <div>
          <div className="flex items-center gap-2 text-xs font-label-meta uppercase text-secondary font-bold">
            <span className="material-symbols-outlined text-[18px]">schedule</span>
            <span>Standing Instructions &amp; Recurring Payments</span>
          </div>
          <h1 className="font-headline-lg text-headline-lg font-bold text-on-surface mt-1">
            Scheduled Transfers
          </h1>
          <p className="text-body-sm text-on-surface-variant mt-0.5">
            Automate monthly rent, bill payments, and SIP transfers in INR with double-entry safety.
          </p>
        </div>

        <button
          onClick={() => setIsAddOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-primary text-on-primary rounded-xl font-bold hover:bg-inverse-surface transition-colors shadow-sm text-body-sm"
        >
          <span className="material-symbols-outlined text-[18px]">calendar_clock</span>
          <span>New Scheduled Payment</span>
        </button>
      </div>

      {/* Schedules Table */}
      <div className="p-6 bg-surface-container-lowest rounded-2xl border border-surface-container-highest shadow-sm flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="font-headline-sm text-body-lg font-bold text-on-surface">Active Recurring Instructions</h2>
            <span className="px-2 py-0.5 rounded bg-surface-container-high text-xs font-mono font-semibold text-on-surface-variant">
              {schedules.length} Active
            </span>
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-surface-container-highest">
          <table className="w-full text-left text-xs">
            <thead className="bg-surface-container-low text-on-surface-variant font-label-meta uppercase border-b border-surface-container-highest">
              <tr>
                <th className="p-3">Status</th>
                <th className="p-3">Beneficiary Payee</th>
                <th className="p-3">Source Account</th>
                <th className="p-3">Currency</th>
                <th className="p-3">Frequency</th>
                <th className="p-3">Next Execution</th>
                <th className="p-3 text-right">Amount</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-container-highest">
              {schedules.map((sch) => (
                <tr key={sch.id} className="hover:bg-surface-container-low transition-colors">
                  <td className="p-3">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-label-meta text-[10px] font-bold ${
                      sch.status === 'ACTIVE'
                        ? 'bg-tertiary-container/30 text-on-tertiary-container'
                        : sch.status === 'PAUSED'
                        ? 'bg-surface-container text-on-surface-variant'
                        : 'bg-error-container text-error'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${sch.status === 'ACTIVE' ? 'bg-on-tertiary-container' : 'bg-outline'}`}></span>
                      {sch.status}
                    </span>
                  </td>
                  <td className="p-3">
                    <div className="flex flex-col">
                      <span className="font-bold text-on-surface text-body-sm">{sch.beneficiaryName}</span>
                      <span className="font-mono text-[10px] text-on-surface-variant truncate max-w-xs">{sch.note || sch.beneficiaryAccount}</span>
                    </div>
                  </td>
                  <td className="p-3 font-semibold text-on-surface">{sch.sourceAccountName}</td>
                  <td className="p-3 font-mono font-bold text-secondary">{sch.currency || 'USD'}</td>
                  <td className="p-3">
                    <span className="px-2 py-0.5 rounded bg-surface-container font-label-meta text-[10px] font-bold uppercase">
                      {sch.frequency}
                    </span>
                  </td>
                  <td className="p-3 font-mono font-bold text-on-surface">{sch.nextExecutionDate}</td>
                  <td className="p-3 text-right font-label-numeric-md font-bold text-on-surface">
                    {formatMoney(sch.amount, sch.currency || 'USD')}
                  </td>
                  <td className="p-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleTogglePause(sch)}
                        className="px-2.5 py-1 rounded bg-surface-container text-on-surface hover:bg-surface-container-high font-semibold text-xs transition-colors"
                      >
                        {sch.status === 'ACTIVE' ? 'Pause' : 'Resume'}
                      </button>
                      <button
                        onClick={() => handleCancel(sch.id)}
                        className="p-1 text-on-surface-variant hover:text-error hover:bg-surface-container rounded transition-colors"
                        title="Cancel Transfer"
                      >
                        <span className="material-symbols-outlined text-[18px]">cancel</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
