import React, { useState } from 'react';
import { api } from '../services/api';
import type { Beneficiary } from '../types';

export const BeneficiariesPage: React.FC = () => {
  const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>(() => api.beneficiaries.getBeneficiaries());
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingBen, setEditingBen] = useState<Beneficiary | null>(null);

  // Form fields
  const [name, setName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [bankName, setBankName] = useState('');
  const [routingCode, setRoutingCode] = useState('');
  const [nickname, setNickname] = useState('');

  const refresh = () => setBeneficiaries(api.beneficiaries.getBeneficiaries());

  const handleOpenAdd = () => {
    setName('');
    setAccountNumber('');
    setBankName('Aegis Institutional Treasury');
    setRoutingCode('021000021');
    setNickname('');
    setIsAddOpen(true);
  };

  const handleOpenEdit = (b: Beneficiary) => {
    setEditingBen(b);
    setName(b.name);
    setAccountNumber(b.accountNumber);
    setBankName(b.bankName);
    setRoutingCode(b.routingCode);
    setNickname(b.nickname || '');
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !accountNumber || !routingCode) return;

    if (editingBen) {
      api.beneficiaries.updateBeneficiary(editingBen.id, {
        name,
        accountNumber,
        bankName,
        routingCode,
        nickname,
      });
      setEditingBen(null);
    } else {
      api.beneficiaries.createBeneficiary({
        name,
        accountNumber,
        bankName,
        routingCode,
        nickname,
        status: 'ACTIVE',
        verifiedCorporate: true,
      });
      setIsAddOpen(false);
    }
    refresh();
  };

  const handleToggleBlock = (b: Beneficiary) => {
    if (b.status === 'ACTIVE') {
      api.beneficiaries.blockBeneficiary(b.id);
    } else {
      api.beneficiaries.unblockBeneficiary(b.id);
    }
    refresh();
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this beneficiary from your directory?')) {
      api.beneficiaries.deleteBeneficiary(id);
      refresh();
    }
  };

  const filtered = beneficiaries.filter((b) =>
    b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    b.bankName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    b.accountNumber.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto">
      {/* Add / Edit Modal */}
      {(isAddOpen || editingBen) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-on-surface/40 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-md p-6 bg-surface-container-lowest rounded-2xl shadow-2xl border border-surface-container-highest">
            <div className="flex items-center justify-between pb-4 border-b border-surface-container-highest">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-lg bg-surface-container-low flex items-center justify-center text-secondary">
                  <span className="material-symbols-outlined text-[22px]">domain</span>
                </div>
                <div>
                  <h3 className="font-headline-sm text-body-lg font-bold text-on-surface">
                    {editingBen ? 'Edit Beneficiary' : 'Add New Beneficiary'}
                  </h3>
                  <p className="font-label-meta text-label-meta uppercase text-on-surface-variant">Interbank Routing Directory</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsAddOpen(false);
                  setEditingBen(null);
                }}
                className="p-1 rounded-lg text-on-surface-variant hover:bg-surface-container"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <form onSubmit={handleSave} className="flex flex-col gap-3.5 mt-4">
              <div className="flex flex-col gap-1">
                <label className="font-label-meta uppercase text-on-surface-variant font-bold text-[10px]">Beneficiary Legal Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Apex Global Tech Ltd"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-surface-container-low border border-surface-container-highest text-xs text-on-surface focus:outline-none focus:border-secondary"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-label-meta uppercase text-on-surface-variant font-bold text-[10px]">Account Number / IBAN</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. US94 AEGIS 0001 ..."
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-surface-container-low border border-surface-container-highest text-xs font-mono text-on-surface focus:outline-none focus:border-secondary"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="font-label-meta uppercase text-on-surface-variant font-bold text-[10px]">Receiving Bank</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. JPMorgan Chase"
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-surface-container-low border border-surface-container-highest text-xs text-on-surface focus:outline-none focus:border-secondary"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="font-label-meta uppercase text-on-surface-variant font-bold text-[10px]">Routing / BIC</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 021000021"
                    value={routingCode}
                    onChange={(e) => setRoutingCode(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-surface-container-low border border-surface-container-highest text-xs font-mono text-on-surface focus:outline-none focus:border-secondary"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-label-meta uppercase text-on-surface-variant font-bold text-[10px]">Nickname (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Primary Cloud Hosting"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-surface-container-low border border-surface-container-highest text-xs text-on-surface focus:outline-none focus:border-secondary"
                />
              </div>

              <div className="flex items-center gap-3 pt-3 border-t border-surface-container-highest">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddOpen(false);
                    setEditingBen(null);
                  }}
                  className="flex-1 py-2 px-4 rounded-xl border border-surface-container-highest text-on-surface hover:bg-surface-container font-semibold transition-colors text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 px-4 rounded-xl bg-primary text-on-primary font-semibold hover:bg-inverse-surface transition-colors shadow-sm text-xs"
                >
                  {editingBen ? 'Update Beneficiary' : 'Add to Directory'}
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
            <span className="material-symbols-outlined text-[18px]">group</span>
            <span>Interbank Counterparty Management</span>
          </div>
          <h1 className="font-headline-lg text-headline-lg font-bold text-on-surface mt-1">
            Beneficiaries Directory
          </h1>
          <p className="text-body-sm text-on-surface-variant mt-0.5">
            Verified institutional payees, Fedwire routing codes, and corporate settlement profiles.
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="flex items-center gap-2 px-4 py-2.5 bg-primary text-on-primary rounded-xl font-bold hover:bg-inverse-surface transition-colors shadow-sm text-body-sm"
        >
          <span className="material-symbols-outlined text-[18px]">person_add</span>
          <span>Add New Beneficiary</span>
        </button>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[18px]">search</span>
          <input
            type="text"
            placeholder="Search payees, banks, account numbers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-surface-container-lowest rounded-xl border border-surface-container-highest text-xs text-on-surface focus:outline-none focus:border-secondary shadow-xs"
          />
        </div>
        <div className="text-xs text-on-surface-variant font-mono">
          Showing <strong>{filtered.length}</strong> of {beneficiaries.length} records
        </div>
      </div>

      {/* Beneficiaries Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((ben) => (
          <div
            key={ben.id}
            className="p-5 rounded-2xl bg-surface-container-lowest border border-surface-container-highest shadow-sm hover:shadow-md transition-all flex flex-col justify-between gap-4 relative overflow-hidden"
          >
            <div>
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-start gap-2.5 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-surface-container-low flex items-center justify-center text-secondary font-bold shrink-0 border border-surface-container-highest">
                    <span className="material-symbols-outlined text-[22px]">domain</span>
                  </div>
                  <div className="flex flex-col min-w-0">
                    <h3 className="font-headline-sm text-body-md font-bold text-on-surface truncate">{ben.name}</h3>
                    {ben.nickname && <span className="text-xs text-on-surface-variant truncate">{ben.nickname}</span>}
                  </div>
                </div>
                <span className={`px-2 py-0.5 rounded-full font-label-meta text-[10px] font-bold shrink-0 ${
                  ben.status === 'ACTIVE' ? 'bg-tertiary-container/20 text-on-tertiary-container' : 'bg-error-container text-error'
                }`}>
                  {ben.status}
                </span>
              </div>

              {ben.verifiedCorporate && (
                <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-surface-container-low text-secondary font-label-meta text-[9px] font-bold my-1 border border-surface-container-highest">
                  <span className="material-symbols-outlined text-[12px] text-secondary">verified</span>
                  <span>VERIFIED CORPORATE PAYEE</span>
                </div>
              )}

              <div className="mt-3 p-3 rounded-xl bg-surface-container-low border border-surface-container-highest flex flex-col gap-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-on-surface-variant font-label-meta text-[10px]">Account / IBAN:</span>
                  <span className="font-mono font-bold text-on-surface truncate max-w-[170px]">{ben.accountNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-on-surface-variant font-label-meta text-[10px]">Bank:</span>
                  <span className="font-semibold text-on-surface truncate max-w-[170px]">{ben.bankName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-on-surface-variant font-label-meta text-[10px]">Routing / BIC:</span>
                  <span className="font-mono font-bold text-on-surface">{ben.routingCode}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-3 border-t border-surface-container-highest">
              <button
                onClick={() => handleOpenEdit(ben)}
                className="flex-1 py-1.5 px-3 bg-surface-container text-on-surface text-xs font-semibold rounded-lg hover:bg-surface-container-high transition-colors"
              >
                Edit
              </button>
              <button
                onClick={() => handleToggleBlock(ben)}
                className={`py-1.5 px-3 rounded-lg text-xs font-semibold transition-colors ${
                  ben.status === 'ACTIVE'
                    ? 'bg-error-container/60 text-error hover:bg-error-container'
                    : 'bg-tertiary-container/30 text-on-tertiary-container hover:bg-tertiary-container'
                }`}
              >
                {ben.status === 'ACTIVE' ? 'Block' : 'Unblock'}
              </button>
              <button
                onClick={() => handleDelete(ben.id)}
                className="p-1.5 text-on-surface-variant hover:text-error hover:bg-surface-container rounded-lg transition-colors"
                title="Delete Beneficiary"
              >
                <span className="material-symbols-outlined text-[18px]">delete</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
