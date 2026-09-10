import React, { useState } from 'react';
import { api } from '../services/api';
import type { TransactionTrace } from '../types';
import { formatMoney } from '../utils/currency';

export const AuditorPage: React.FC = () => {
  const [searchTxnId, setSearchTxnId] = useState('TXN-2026-IND-88310');
  const [trace, setTrace] = useState<TransactionTrace>(() => api.audit.getTransactionTrace('TXN-2026-IND-88310'));
  const [activeTab, setActiveTab] = useState<'timeline' | 'kafka' | 'merkle'>('timeline');
  const [selectedKafkaEventIndex, setSelectedKafkaEventIndex] = useState<number | null>(null);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchTxnId) return;
    const freshTrace = api.audit.getTransactionTrace(searchTxnId.trim());
    setTrace(freshTrace);
  };

  const handleExportProof = () => {
    const proofDoc = {
      complianceStandard: 'ISO-27001 / SOC-2 TYPE II',
      mandateAuthority: 'Aegis CoreBank (India) Forensic Ledger Engine',
      timestamp: new Date().toISOString(),
      merkleRoot: trace.merkleRoot,
      blockNumber: trace.blockNumber,
      transactionId: trace.transactionId,
      correlationId: trace.correlationId,
      initiator: trace.initiator,
      initiatorId: trace.initiatorId,
      amount: trace.amount,
      currency: trace.currency,
      sagaSteps: trace.sagaSteps,
      kafkaEvents: trace.kafkaEvents,
      status: trace.status,
    };

    const blob = new Blob([JSON.stringify(proofDoc, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `aegis-cryptographic-proof-${trace.transactionId}.json`;
    a.click();
  };

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto">
      {/* Auditor Authority Top Banner */}
      <div className="bg-primary-container text-on-primary rounded-2xl p-6 shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative overflow-hidden">
        <div className="absolute -right-8 -top-8 w-48 h-48 bg-secondary/10 rounded-full blur-2xl pointer-events-none"></div>
        <div className="flex items-center gap-4 z-10">
          <div className="w-12 h-12 rounded-xl bg-tertiary-container flex items-center justify-center text-on-tertiary-container shadow-xs">
            <span className="material-symbols-outlined text-[26px]">policy</span>
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="font-label-meta text-[10px] uppercase tracking-widest text-secondary-container font-bold">Mandate Scope</span>
              <span className="w-1.5 h-1.5 rounded-full bg-on-tertiary-container"></span>
              <span className="font-label-numeric-sm text-xs text-on-primary-container">ISO 27001 / SOC-2 TYPE II</span>
            </div>
            <h1 className="font-headline-sm text-lg md:text-xl font-bold tracking-tight text-white mt-0.5">
              AUDITOR VIEW — Cryptographic Audit Trail &amp; Outbox Verification
            </h1>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 z-10">
          <div className="flex items-center gap-2 bg-surface-container-highest/10 px-3 py-1.5 rounded-xl font-mono text-xs text-white">
            <span className="material-symbols-outlined text-[16px] text-on-tertiary-container">enhanced_encryption</span>
            <span>MERKLE ROOT: {trace.merkleRoot.slice(0, 12)}...</span>
          </div>
          <button
            onClick={handleExportProof}
            className="bg-secondary text-on-secondary px-4 py-2 rounded-xl font-semibold text-xs hover:bg-secondary/90 transition-colors shadow-sm flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-[16px]">file_download</span>
            <span>Export Cryptographic Proof</span>
          </button>
        </div>
      </div>

      {/* Investigation Target & Search Bar */}
      <div className="p-6 bg-surface-container-lowest rounded-2xl border border-surface-container-highest shadow-sm flex flex-col gap-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-surface-container-low flex items-center justify-center text-secondary border border-surface-container-highest">
              <span className="material-symbols-outlined text-[28px]">search_insights</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-headline-md text-headline-sm font-bold text-on-surface">{trace.transactionId}</h2>
                <span className="bg-surface-container-high text-on-surface font-label-meta text-[10px] px-2 py-0.5 rounded font-bold uppercase">
                  WIRE OUTBOUND
                </span>
                <span className="flex items-center gap-1 bg-surface-container-low text-on-tertiary-container font-label-meta text-[10px] px-2 py-0.5 rounded font-bold uppercase">
                  <span className="w-1.5 h-1.5 rounded-full bg-on-tertiary-container"></span>
                  {trace.status}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs text-on-surface-variant mt-1">
                <span>Initiator: <strong className="text-on-surface">{trace.initiator} ({trace.initiatorId})</strong></span>
                <span>•</span>
                <span>Sum: <strong className="text-on-surface font-mono">{formatMoney(trace.amount, trace.currency || 'INR', true)}</strong></span>
                <span>•</span>
                <span>Block: <strong className="text-on-surface font-mono">#{trace.blockNumber}</strong></span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 bg-surface-container-low p-3 rounded-xl border border-surface-container-highest">
            <div className="flex flex-col text-right">
              <span className="font-label-meta uppercase text-on-surface-variant text-[10px]">Merkle Inclusion State</span>
              <span className="font-mono text-xs text-on-tertiary-container font-bold flex items-center justify-end gap-1">
                <span className="material-symbols-outlined text-[16px]">verified</span>
                INCLUDED IN BLOCK #{trace.blockNumber}
              </span>
            </div>
          </div>
        </div>

        {/* Forensic Search Input Strip */}
        <form onSubmit={handleSearch} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
          <div className="flex items-center bg-surface-container-low rounded-xl px-3 py-2 border border-surface-container-highest">
            <span className="material-symbols-outlined text-on-surface-variant text-[18px] mr-2">search</span>
            <div className="flex flex-col flex-1 min-w-0">
              <span className="font-label-meta text-[9px] text-on-surface-variant uppercase font-bold">Transaction ID</span>
              <input
                type="text"
                value={searchTxnId}
                onChange={(e) => setSearchTxnId(e.target.value)}
                className="bg-transparent font-mono text-xs text-on-surface focus:outline-none truncate font-bold"
              />
            </div>
          </div>

          <div className="flex items-center bg-surface-container-low rounded-xl px-3 py-2 border border-surface-container-highest">
            <span className="material-symbols-outlined text-on-surface-variant text-[18px] mr-2">fingerprint</span>
            <div className="flex flex-col flex-1 min-w-0">
              <span className="font-label-meta text-[9px] text-on-surface-variant uppercase font-bold">Correlation Hash</span>
              <span className="font-mono text-xs text-on-surface truncate">{trace.correlationId}</span>
            </div>
          </div>

          <div className="flex items-center bg-surface-container-low rounded-xl px-3 py-2 border border-surface-container-highest">
            <span className="material-symbols-outlined text-on-surface-variant text-[18px] mr-2">hub</span>
            <div className="flex flex-col flex-1 min-w-0">
              <span className="font-label-meta text-[9px] text-on-surface-variant uppercase font-bold">Kafka Topic</span>
              <span className="font-mono text-xs text-on-surface truncate">core.banking.transactions:04</span>
            </div>
          </div>

          <button
            type="submit"
            className="bg-primary text-on-primary rounded-xl font-semibold text-xs flex items-center justify-center gap-2 hover:bg-inverse-surface transition-colors shadow-sm py-2"
          >
            <span className="material-symbols-outlined text-[16px]">sync_alt</span>
            <span>Evaluate Proof</span>
          </button>
        </form>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-surface-container-highest pb-2">
        <button
          onClick={() => setActiveTab('timeline')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'timeline' ? 'bg-secondary text-on-secondary shadow-xs' : 'text-on-surface-variant hover:bg-surface-container'
          }`}
        >
          <span className="material-symbols-outlined text-[16px]">account_tree</span>
          <span>Distributed Saga Lifecycle</span>
        </button>
        <button
          onClick={() => setActiveTab('kafka')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'kafka' ? 'bg-secondary text-on-secondary shadow-xs' : 'text-on-surface-variant hover:bg-surface-container'
          }`}
        >
          <span className="material-symbols-outlined text-[16px]">data_object</span>
          <span>Kafka Topic Event Lineage ({trace.kafkaEvents.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('merkle')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'merkle' ? 'bg-secondary text-on-secondary shadow-xs' : 'text-on-surface-variant hover:bg-surface-container'
          }`}
        >
          <span className="material-symbols-outlined text-[16px]">verified</span>
          <span>Merkle Cryptographic Root</span>
        </button>
      </div>

      {/* Tab 1: Saga Lifecycle Graph */}
      {activeTab === 'timeline' && (
        <div className="p-6 bg-surface-container-lowest rounded-2xl border border-surface-container-highest shadow-sm flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-headline-sm text-body-lg font-bold text-on-surface">Deterministic Distributed Saga Graph</h3>
              <p className="text-xs text-on-surface-variant">Step-by-step 2PC lock phases, execution timings, and node telemetry.</p>
            </div>
            <div className="flex items-center gap-3 font-label-meta text-[10px] text-on-surface-variant">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-on-tertiary-container"></span> Verified Synchronous</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-secondary"></span> Asynchronous Outbox</span>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            {trace.sagaSteps.map((step, idx) => (
              <div
                key={idx}
                className="p-4 rounded-xl bg-surface-container-low border border-surface-container-highest flex items-start gap-4"
              >
                <div className="w-8 h-8 rounded-full bg-primary text-on-primary flex items-center justify-center font-mono font-bold text-xs shrink-0 mt-0.5">
                  {idx + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h4 className="font-headline-sm text-body-sm font-bold text-on-surface">{step.name}</h4>
                    <div className="flex items-center gap-2 font-mono text-[11px]">
                      <span className="text-on-surface-variant">{step.node}</span>
                      <span className="px-2 py-0.5 rounded bg-tertiary-container/30 text-on-tertiary-container font-bold">
                        {step.latencyMs}ms latency
                      </span>
                    </div>
                  </div>
                  <p className="text-xs text-on-surface-variant mt-1 leading-relaxed">{step.details}</p>
                  <span className="font-mono text-[10px] text-on-surface-variant mt-1 inline-block">{step.timestamp}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 2: Kafka Topic Event Lineage */}
      {activeTab === 'kafka' && (
        <div className="p-6 bg-surface-container-lowest rounded-2xl border border-surface-container-highest shadow-sm flex flex-col gap-4">
          <h3 className="font-headline-sm text-body-lg font-bold text-on-surface">Kafka Outbox Partition Event Log</h3>
          <p className="text-xs text-on-surface-variant">Transactional outbox publications emitted across Kafka partitions with strict FIFO ordering.</p>

          <div className="flex flex-col gap-3">
            {trace.kafkaEvents.map((evt, idx) => (
              <div
                key={idx}
                className="p-4 rounded-xl bg-surface-container-low border border-surface-container-highest flex flex-col gap-2"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-surface-container-high font-mono text-xs font-bold text-secondary">
                      {evt.topic} [P:{evt.partition}]
                    </span>
                    <span className="font-bold text-xs text-on-surface">{evt.eventType}</span>
                  </div>
                  <span className="font-mono text-xs text-on-surface-variant">Offset #{evt.offset}</span>
                </div>

                <div className="flex items-center justify-between text-xs text-on-surface-variant">
                  <span className="font-mono text-[10px]">{evt.timestamp}</span>
                  <button
                    onClick={() => setSelectedKafkaEventIndex(selectedKafkaEventIndex === idx ? null : idx)}
                    className="text-secondary hover:underline font-semibold"
                  >
                    {selectedKafkaEventIndex === idx ? 'Hide Payload' : 'Inspect JSON Payload'}
                  </button>
                </div>

                {selectedKafkaEventIndex === idx && (
                  <pre className="p-3 bg-surface-container-highest/20 rounded-xl font-mono text-xs text-on-surface overflow-x-auto border border-surface-container-highest">
                    {evt.payload}
                  </pre>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 3: Merkle Cryptographic Root */}
      {activeTab === 'merkle' && (
        <div className="p-6 bg-surface-container-lowest rounded-2xl border border-surface-container-highest shadow-sm flex flex-col gap-4">
          <h3 className="font-headline-sm text-body-lg font-bold text-on-surface">Merkle Tree Inclusion Proof</h3>
          <p className="text-xs text-on-surface-variant">Zero-knowledge proof verifying that the ledger record is immutably anchored in the ledger consensus chain.</p>

          <div className="p-4 bg-surface-container-low rounded-xl border border-surface-container-highest font-mono text-xs flex flex-col gap-2">
            <div>
              <span className="text-on-surface-variant uppercase text-[10px] font-bold">Merkle Root Hash:</span>
              <p className="font-bold text-secondary break-all mt-0.5">{trace.merkleRoot}</p>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-surface-container-highest">
              <div>
                <span className="text-on-surface-variant uppercase text-[10px] font-bold">Anchored Block:</span>
                <p className="font-bold text-on-surface">#{trace.blockNumber}</p>
              </div>
              <div>
                <span className="text-on-surface-variant uppercase text-[10px] font-bold">Consensus Signature:</span>
                <p className="font-bold text-on-tertiary-container">ED25519-VERIFIED</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
