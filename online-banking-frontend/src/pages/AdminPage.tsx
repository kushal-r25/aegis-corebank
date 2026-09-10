import React, { useState } from 'react';
import { api } from '../services/api';
import type { FraudRecord, SystemHealthMetrics } from '../types';
import { formatMoney } from '../utils/currency';

export const AdminPage: React.FC = () => {
  const [fraudRecords, setFraudRecords] = useState<FraudRecord[]>(() => api.admin.getFraudRecords());
  const [metrics, setMetrics] = useState<SystemHealthMetrics>(() => api.admin.getSystemMetrics());
  const [selectedCase, setSelectedCase] = useState<FraudRecord | null>(null);
  const [reviewerNotes, setReviewerNotes] = useState('');

  const refresh = () => {
    setFraudRecords(api.admin.getFraudRecords());
    setMetrics(api.admin.getSystemMetrics());
  };

  const handleApprove = (id: string) => {
    api.admin.approveFraudRecord(id, reviewerNotes || 'Cleared by Compliance Officer Vikram Patel.');
    setSelectedCase(null);
    setReviewerNotes('');
    refresh();
  };

  const handleReject = (id: string) => {
    api.admin.rejectFraudRecord(id, reviewerNotes || 'Blocked and escalated to FIU-IND / RBI AML compliance unit.');
    setSelectedCase(null);
    setReviewerNotes('');
    refresh();
  };

  const handleToggleCircuitBreaker = () => {
    const newState = api.admin.toggleCircuitBreaker();
    alert(newState ? 'Circuit Breaker Armed: Ingress protection active.' : 'Circuit Breaker Tripped: Global Ingress Paused!');
    refresh();
  };

  const pendingCases = fraudRecords.filter((f) => f.status === 'FLAGGED');

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto">
      {/* Review Modal */}
      {selectedCase && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-on-surface/40 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-lg p-6 bg-surface-container-lowest rounded-2xl shadow-2xl border border-surface-container-highest">
            <div className="flex items-center justify-between pb-4 border-b border-surface-container-highest">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-lg bg-error-container text-error flex items-center justify-center font-bold">
                  <span className="material-symbols-outlined text-[22px]">shield_with_heart</span>
                </div>
                <div>
                  <h3 className="font-headline-sm text-body-lg font-bold text-on-surface">Fraud Review Case #{selectedCase.id}</h3>
                  <span className="font-label-meta text-[10px] uppercase font-bold text-error">
                    Risk Score: {selectedCase.riskScore}/100
                  </span>
                </div>
              </div>
              <button onClick={() => setSelectedCase(null)} className="p-1 rounded-lg text-on-surface-variant hover:bg-surface-container">
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <div className="flex flex-col gap-4 mt-4 text-xs">
              <div className="p-3 rounded-xl bg-surface-container-low border border-surface-container-highest flex flex-col gap-1.5">
                <div className="flex justify-between">
                  <span className="text-on-surface-variant">Transaction ID:</span>
                  <span className="font-mono font-bold text-on-surface">{selectedCase.transactionId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-on-surface-variant">Instructed Sum:</span>
                  <span className="font-mono font-bold text-error">{formatMoney(selectedCase.amount, selectedCase.currency || 'INR', true)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-on-surface-variant">Source Entity:</span>
                  <span className="font-semibold text-on-surface">{selectedCase.sourceAccountName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-on-surface-variant">Target Counterparty:</span>
                  <span className="font-semibold text-on-surface">{selectedCase.beneficiaryName}</span>
                </div>
              </div>

              <div>
                <span className="font-label-meta uppercase font-bold text-on-surface-variant text-[10px]">Heuristic Risk Trigger</span>
                <p className="p-2.5 rounded-xl bg-error-container/30 border border-error/20 text-on-error-container font-semibold mt-1">
                  {selectedCase.reason}
                </p>
              </div>

              {selectedCase.flaggedRules && (
                <div>
                  <span className="font-label-meta uppercase font-bold text-on-surface-variant text-[10px]">Flagged Compliance Rules</span>
                  <div className="flex flex-col gap-1 mt-1">
                    {selectedCase.flaggedRules.map((r, i) => (
                      <div key={i} className="flex items-center gap-1.5 text-error font-mono text-[11px] bg-surface-container-low p-1.5 rounded-lg">
                        <span className="material-symbols-outlined text-[14px]">gavel</span>
                        <span>{r}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-1">
                <label className="font-label-meta uppercase font-bold text-on-surface-variant text-[10px]">Officer Review Notes</label>
                <textarea
                  rows={2}
                  value={reviewerNotes}
                  onChange={(e) => setReviewerNotes(e.target.value)}
                  placeholder="Enter administrative review notes or audit justification..."
                  className="w-full p-2.5 rounded-xl bg-surface-container-low border border-surface-container-highest text-on-surface text-xs focus:outline-none focus:border-secondary"
                />
              </div>

              <div className="flex items-center gap-3 pt-3 border-t border-surface-container-highest">
                <button
                  onClick={() => handleReject(selectedCase.id)}
                  className="flex-1 py-2 px-4 rounded-xl bg-error text-on-error font-semibold hover:bg-on-error-container transition-colors shadow-sm text-xs flex items-center justify-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-[16px]">block</span>
                  <span>Reject &amp; Escalate</span>
                </button>
                <button
                  onClick={() => handleApprove(selectedCase.id)}
                  className="flex-1 py-2 px-4 rounded-xl bg-on-tertiary-container text-on-primary font-semibold hover:bg-tertiary-container transition-colors shadow-sm text-xs flex items-center justify-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-[16px]">verified</span>
                  <span>Approve Clearance</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Top Banner: Admin Scope & Circuit Breaker */}
      <div className="p-6 bg-surface-container-lowest rounded-2xl border border-surface-container-highest shadow-sm flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-primary-container px-3 py-1.5 rounded-xl text-on-primary">
            <span className="w-2 h-2 rounded-full bg-on-tertiary-container animate-pulse"></span>
            <span className="font-label-numeric-sm text-xs font-bold uppercase tracking-wider">SYSTEM MODE: STRICT ACID</span>
          </div>
          <div className="flex items-center gap-2 bg-surface-container-low px-3 py-1.5 rounded-xl border border-surface-container-highest text-xs">
            <span className="material-symbols-outlined text-secondary text-[18px]">admin_panel_settings</span>
            <span className="text-on-surface-variant font-medium">Operator:</span>
            <span className="font-mono font-bold text-on-surface">vikram_patel_ops</span>
            <span className="px-1.5 py-0.2 rounded bg-surface-container-high font-label-meta text-[9px] text-secondary font-bold uppercase">Level 3</span>
          </div>
          <div className="flex items-center gap-2 bg-surface-container-low px-3 py-1.5 rounded-xl border border-surface-container-highest text-xs">
            <span className="material-symbols-outlined text-on-tertiary-container text-[18px]">verified</span>
            <span className="text-on-surface-variant">Ledger Consensus:</span>
            <span className="font-mono font-bold text-on-tertiary-container">EPOCH #49102-OK</span>
          </div>
        </div>

        {/* Circuit Breaker */}
        <div className="flex items-center gap-3">
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold ${
            metrics.circuitBreakerArmed ? 'bg-error-container/60 text-on-error-container' : 'bg-surface-container text-on-surface'
          }`}>
            <span className="material-symbols-outlined text-[18px] text-error animate-pulse">crisis_alert</span>
            <span className="font-label-meta uppercase tracking-wider">
              Circuit Breaker: {metrics.circuitBreakerArmed ? 'Armed' : 'Tripped'}
            </span>
          </div>
          <button
            onClick={handleToggleCircuitBreaker}
            className="px-4 py-2 bg-error text-on-error hover:bg-on-error-container rounded-xl font-semibold text-xs transition-colors shadow-sm flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-[16px]">power_settings_new</span>
            <span>{metrics.circuitBreakerArmed ? 'Trip Global Ingress' : 'Restore Ingress'}</span>
          </button>
        </div>
      </div>

      {/* Operational Telemetry KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Capital */}
        <div className="bg-surface-container-lowest p-5 rounded-2xl border border-surface-container-highest shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="font-label-meta uppercase text-on-surface-variant text-[10px] font-bold">Total Managed Capital</span>
            <span className="px-2 py-0.5 rounded bg-tertiary-container/20 font-label-meta text-on-tertiary-container text-[10px] font-bold">
              99.998% In-Recon
            </span>
          </div>
          <div className="my-3">
            <div className="font-label-numeric-lg text-2xl font-bold text-on-surface">
              ₹15,28,25,00,000<span className="text-sm font-normal text-on-surface-variant">.00</span>
            </div>
            <p className="text-[11px] text-on-surface-variant mt-0.5">INR Ledger Aggregate</p>
          </div>
          <div className="w-full bg-surface-container-highest h-1.5 rounded-full overflow-hidden">
            <div className="bg-on-tertiary-container h-full rounded-full" style={{ width: '99.998%' }}></div>
          </div>
        </div>

        {/* Active Customers */}
        <div className="bg-surface-container-lowest p-5 rounded-2xl border border-surface-container-highest shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="font-label-meta uppercase text-on-surface-variant text-[10px] font-bold">Active Customer Vaults</span>
            <span className="font-mono text-xs font-bold text-secondary">{metrics.activeCustomers.toLocaleString()} Total</span>
          </div>
          <div className="my-3 flex items-baseline gap-2">
            <div className="font-label-numeric-lg text-2xl font-bold text-on-surface">{metrics.clearedCustomers.toLocaleString()}</div>
            <span className="text-xs text-on-surface-variant">cleared &amp; operational</span>
          </div>
          <div className="flex items-center justify-between text-[11px] text-on-surface-variant">
            <span className="text-secondary font-semibold">28 Pending KYC</span>
            <span>·</span>
            <span className="text-error font-semibold">{metrics.suspendedCustomers} Suspended</span>
          </div>
        </div>

        {/* Transaction Throughput */}
        <div className="bg-surface-container-lowest p-5 rounded-2xl border border-surface-container-highest shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="font-label-meta uppercase text-on-surface-variant text-[10px] font-bold">Event Throughput</span>
            <span className="px-2 py-0.5 rounded bg-surface-container font-label-meta text-on-tertiary-container text-[10px] font-bold">
              Lag: 0ms
            </span>
          </div>
          <div className="my-3 flex items-baseline gap-2">
            <div className="font-label-numeric-lg text-2xl font-bold text-on-surface">{metrics.transactionThroughput}</div>
            <span className="text-xs text-on-surface-variant">tx / sec</span>
          </div>
          <div className="flex items-center justify-between text-[11px] text-on-surface-variant">
            <span>Kafka Outbox Buffer</span>
            <span className="font-bold text-on-tertiary-container font-label-meta text-[10px] uppercase">Zero Backlog</span>
          </div>
        </div>

        {/* Fraud Queue Velocity */}
        <div className="bg-surface-container-lowest p-5 rounded-2xl border border-surface-container-highest shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="font-label-meta uppercase text-on-surface-variant text-[10px] font-bold">Fraud Review Deck</span>
            <span className="px-2 py-0.5 rounded bg-error-container text-error font-label-meta text-[10px] font-bold animate-pulse">
              ACTIVE
            </span>
          </div>
          <div className="my-3 flex items-baseline gap-2">
            <div className="font-label-numeric-lg text-2xl font-bold text-error">{pendingCases.length}</div>
            <span className="text-xs text-on-surface-variant">cases awaiting decision</span>
          </div>
          <div className="flex items-center gap-2 text-[11px]">
            <span className="px-2 py-0.5 rounded bg-error-container text-error font-bold font-mono">1 High</span>
            <span className="px-2 py-0.5 rounded bg-surface-container text-on-surface font-semibold font-mono">1 Med</span>
          </div>
        </div>
      </div>

      {/* Real-Time Fraud & Anomaly Review Deck */}
      <div className="p-6 bg-surface-container-lowest rounded-2xl border border-surface-container-highest shadow-sm flex flex-col gap-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between pb-3 border-b border-surface-container-highest gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-error text-[22px]">shield_with_heart</span>
              <h2 className="font-headline-sm text-body-lg font-bold text-on-surface">
                Interactive Real-Time Fraud &amp; Anomaly Review
              </h2>
            </div>
            <p className="text-xs text-on-surface-variant mt-0.5">
              Automated ML heuristic inference triggering instant settlement holds for operator verification.
            </p>
          </div>

          <button
            onClick={refresh}
            className="px-3 py-1.5 bg-secondary text-on-secondary hover:bg-on-secondary-fixed-variant rounded-xl font-semibold text-xs transition-colors flex items-center gap-1.5 shadow-xs self-start md:self-auto"
          >
            <span className="material-symbols-outlined text-[16px]">sync</span>
            <span>Refresh Queue</span>
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {fraudRecords.map((frd) => (
            <div
              key={frd.id}
              className="p-5 rounded-2xl bg-surface-container-low border border-surface-container-highest flex flex-col justify-between gap-4 relative overflow-hidden"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex flex-col">
                    <span className="font-mono font-bold text-xs text-error">#{frd.id.toUpperCase()} · {frd.transactionId}</span>
                    <h3 className="font-headline-sm text-body-md font-bold text-on-surface mt-1">{frd.reason}</h3>
                  </div>
                  <span className={`px-2.5 py-0.5 rounded-full font-label-meta text-[10px] font-bold uppercase shrink-0 ${
                    frd.status === 'FLAGGED'
                      ? frd.riskScore > 75
                        ? 'bg-error-container text-error'
                        : 'bg-amber-100 text-amber-800'
                      : frd.status === 'APPROVED'
                      ? 'bg-tertiary-container/30 text-on-tertiary-container'
                      : 'bg-error text-on-error'
                  }`}>
                    {frd.status} · Score {frd.riskScore}/100
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 p-3 bg-surface-container-lowest rounded-xl border border-surface-container-highest text-xs my-2">
                  <div>
                    <span className="font-label-meta uppercase text-on-surface-variant text-[10px]">Instructed Amount</span>
                    <p className="font-mono font-bold text-on-surface text-sm mt-0.5">
                      ${parseFloat(frd.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })} USD
                    </p>
                  </div>
                  <div>
                    <span className="font-label-meta uppercase text-on-surface-variant text-[10px]">Payee Destination</span>
                    <p className="font-semibold text-on-surface mt-0.5 truncate">{frd.beneficiaryName}</p>
                  </div>
                </div>

                {frd.reviewerNotes && (
                  <p className="text-[11px] text-on-surface-variant italic bg-surface-container-lowest p-2 rounded-lg border border-surface-container-highest">
                    Note: {frd.reviewerNotes}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2 pt-2 border-t border-surface-container-highest">
                {frd.status === 'FLAGGED' ? (
                  <button
                    onClick={() => setSelectedCase(frd)}
                    className="w-full py-2 px-4 bg-primary text-on-primary font-bold rounded-xl hover:bg-inverse-surface transition-colors text-xs flex items-center justify-center gap-1.5 shadow-sm"
                  >
                    <span className="material-symbols-outlined text-[16px]">visibility</span>
                    <span>Inspect &amp; Decide Case</span>
                  </button>
                ) : (
                  <div className="flex items-center justify-between w-full text-xs text-on-surface-variant">
                    <span>Reviewed by: <strong className="text-on-surface">{frd.operator || 'admin_ops'}</strong></span>
                    <span className="font-mono text-[10px]">{new Date(frd.reviewedAt || frd.createdAt).toLocaleTimeString()}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
