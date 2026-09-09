import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SearchModal: React.FC<SearchModalProps> = ({ isOpen, onClose }) => {
  const [query, setQuery] = useState('');
  const navigate = useNavigate();

  if (!isOpen) return null;

  const accounts = api.accounts.getAccounts();
  const beneficiaries = api.beneficiaries.getBeneficiaries();
  const ledgerEntries = api.ledger.getEntries();
  const fraudRecords = api.admin.getFraudRecords();

  const q = query.toLowerCase();

  const filteredAccounts = q ? accounts.filter((a) => a.nickname?.toLowerCase().includes(q) || a.accountNumber.includes(q)) : [];
  const filteredBeneficiaries = q ? beneficiaries.filter((b) => b.name.toLowerCase().includes(q) || b.accountNumber.includes(q)) : [];
  const filteredLedgers = q ? ledgerEntries.filter((l) => l.description.toLowerCase().includes(q) || l.transactionId.toLowerCase().includes(q) || l.correlationId.toLowerCase().includes(q)) : [];
  const filteredFraud = q ? fraudRecords.filter((f) => f.reason.toLowerCase().includes(q) || f.transactionId.toLowerCase().includes(q)) : [];

  const handleSelect = (path: string) => {
    navigate(path);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 p-4 bg-on-surface/40 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div className="relative w-full max-w-2xl bg-surface-container-lowest rounded-2xl shadow-2xl border border-surface-container-highest overflow-hidden" onClick={(e) => e.stopPropagation()}>
        {/* Search bar input */}
        <div className="flex items-center px-4 py-3 border-b border-surface-container-highest gap-3">
          <span className="material-symbols-outlined text-on-surface-variant text-[22px]">search</span>
          <input
            type="text"
            autoFocus
            placeholder="Search accounts, ledgers, correlation IDs, payees, topics..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 bg-transparent text-body-md font-body-md text-on-surface focus:outline-none"
          />
          <kbd className="font-label-numeric-sm text-xs bg-surface-container px-2 py-0.5 rounded text-on-surface-variant">ESC</kbd>
        </div>

        {/* Results Area */}
        <div className="max-h-96 overflow-y-auto p-4 flex flex-col gap-4">
          {!query ? (
            <div className="py-8 text-center text-on-surface-variant text-body-sm flex flex-col items-center gap-2">
              <span className="material-symbols-outlined text-[32px] text-outline-variant">travel_explore</span>
              <p>Type to search across all distributed ledger entries, accounts, beneficiaries, and audit logs.</p>
            </div>
          ) : (
            <>
              {filteredAccounts.length > 0 && (
                <div>
                  <span className="font-label-meta uppercase text-on-surface-variant font-bold text-[11px] px-2">Accounts</span>
                  <div className="mt-1 flex flex-col gap-1">
                    {filteredAccounts.map((acc) => (
                      <button
                        key={acc.id}
                        onClick={() => handleSelect('/accounts')}
                        className="flex items-center justify-between p-2.5 rounded-xl hover:bg-surface-container-low text-left transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-secondary text-[20px]">account_balance</span>
                          <span className="font-semibold text-on-surface text-body-sm">{acc.nickname || acc.accountType}</span>
                          <span className="text-xs font-mono text-on-surface-variant">···· {acc.accountNumber.slice(-4)}</span>
                        </div>
                        <span className="font-label-numeric-sm font-bold text-on-surface">${parseFloat(acc.balance).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {filteredBeneficiaries.length > 0 && (
                <div>
                  <span className="font-label-meta uppercase text-on-surface-variant font-bold text-[11px] px-2">Beneficiaries</span>
                  <div className="mt-1 flex flex-col gap-1">
                    {filteredBeneficiaries.map((ben) => (
                      <button
                        key={ben.id}
                        onClick={() => handleSelect('/beneficiaries')}
                        className="flex items-center justify-between p-2.5 rounded-xl hover:bg-surface-container-low text-left transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-secondary text-[20px]">domain</span>
                          <span className="font-semibold text-on-surface text-body-sm">{ben.name}</span>
                          <span className="text-xs text-on-surface-variant">{ben.bankName}</span>
                        </div>
                        <span className="text-xs font-mono text-on-surface-variant">{ben.accountNumber}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {filteredLedgers.length > 0 && (
                <div>
                  <span className="font-label-meta uppercase text-on-surface-variant font-bold text-[11px] px-2">Ledger Journal Entries</span>
                  <div className="mt-1 flex flex-col gap-1">
                    {filteredLedgers.map((led) => (
                      <button
                        key={led.id}
                        onClick={() => handleSelect('/transactions')}
                        className="flex items-center justify-between p-2.5 rounded-xl hover:bg-surface-container-low text-left transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <span className={`material-symbols-outlined text-[18px] ${led.type === 'CREDIT' ? 'text-on-tertiary-container' : 'text-error'}`}>
                            {led.type === 'CREDIT' ? 'arrow_downward' : 'arrow_upward'}
                          </span>
                          <div className="flex flex-col">
                            <span className="font-semibold text-on-surface text-body-sm truncate max-w-sm">{led.description}</span>
                            <span className="font-label-numeric-sm text-[10px] text-on-surface-variant">{led.transactionId} · {led.correlationId}</span>
                          </div>
                        </div>
                        <span className={`font-label-numeric-sm font-bold ${led.type === 'CREDIT' ? 'text-on-tertiary-container' : 'text-on-surface'}`}>
                          {led.type === 'CREDIT' ? '+' : '-'}${parseFloat(led.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {filteredFraud.length > 0 && (
                <div>
                  <span className="font-label-meta uppercase text-on-surface-variant font-bold text-[11px] px-2">Fraud &amp; Risk Cases</span>
                  <div className="mt-1 flex flex-col gap-1">
                    {filteredFraud.map((frd) => (
                      <button
                        key={frd.id}
                        onClick={() => handleSelect('/admin')}
                        className="flex items-center justify-between p-2.5 rounded-xl hover:bg-surface-container-low text-left transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-error text-[20px]">shield_with_heart</span>
                          <div className="flex flex-col">
                            <span className="font-semibold text-on-surface text-body-sm">{frd.reason}</span>
                            <span className="font-label-numeric-sm text-[10px] text-error font-bold">Risk Score {frd.riskScore}/100</span>
                          </div>
                        </div>
                        <span className="font-label-numeric-sm font-bold text-on-surface">${parseFloat(frd.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {filteredAccounts.length === 0 && filteredBeneficiaries.length === 0 && filteredLedgers.length === 0 && filteredFraud.length === 0 && (
                <div className="py-6 text-center text-on-surface-variant text-body-sm">
                  No records matching &ldquo;{query}&rdquo; found.
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
