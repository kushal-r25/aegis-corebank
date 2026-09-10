import React from 'react';
import { useAuth } from '../context/AuthContext';

export const SecurityPage: React.FC = () => {
  const { user } = useAuth();

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 bg-surface-container-lowest rounded-2xl border border-surface-container-highest shadow-sm">
        <div>
          <div className="flex items-center gap-2 text-xs font-label-meta uppercase text-secondary font-bold">
            <span className="material-symbols-outlined text-[18px]">security</span>
            <span>Cryptographic Trust &amp; Hardware Keys</span>
          </div>
          <h1 className="font-headline-lg text-headline-lg font-bold text-on-surface mt-1">
            Security &amp; Access Controls
          </h1>
          <p className="text-body-sm text-on-surface-variant mt-0.5">
            Mutual TLS 1.3 encryption, hardware FIDO2 tokens, and active session cryptographic fingerprints.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-tertiary-container/20 text-on-tertiary-container font-label-meta text-xs font-bold rounded-xl border border-on-tertiary-container/20">
            <span className="w-2 h-2 rounded-full bg-on-tertiary-container"></span>
            <span>ISO 27001 / CERT-IN GUIDELINES ALIGNED</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active Session & Hardware */}
        <div className="p-6 bg-surface-container-lowest rounded-2xl border border-surface-container-highest shadow-sm flex flex-col gap-4">
          <h2 className="font-headline-sm text-body-lg font-bold text-on-surface">Active Session Trust Profile</h2>

          <div className="p-4 rounded-xl bg-surface-container-low border border-surface-container-highest text-xs flex flex-col gap-2">
            <div className="flex justify-between">
              <span className="text-on-surface-variant">Principal Actor:</span>
              <span className="font-bold text-on-surface">{user.firstName} {user.lastName} ({user.customerId})</span>
            </div>
            <div className="flex justify-between">
              <span className="text-on-surface-variant">Network Gateway IP:</span>
              <span className="font-mono font-bold text-on-surface">{user.ipAddress}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-on-surface-variant">Authentication Tier:</span>
              <span className="font-semibold text-secondary">mTLS + Hardware FIDO2 2FA</span>
            </div>
            <div className="flex justify-between">
              <span className="text-on-surface-variant">Session Last Renewed:</span>
              <span className="font-mono text-on-surface-variant">{user.lastLogin}</span>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <span className="font-label-meta uppercase text-on-surface-variant font-bold text-[10px]">Registered Security Keys</span>
            <div className="p-3 bg-surface-container-low rounded-xl border border-surface-container-highest flex items-center justify-between text-xs">
              <div className="flex items-center gap-2.5">
                <span className="material-symbols-outlined text-secondary text-[20px]">usb</span>
                <div>
                  <p className="font-bold text-on-surface">YubiKey 5C NFC Enterprise</p>
                  <span className="font-mono text-[10px] text-on-surface-variant">ID: FIDO2-YUBI-884102</span>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded bg-tertiary-container/20 text-on-tertiary-container font-label-meta text-[10px] font-bold">
                PRIMARY
              </span>
            </div>
          </div>
        </div>

        {/* Cryptographic Signing & Outbox Engine */}
        <div className="p-6 bg-surface-container-lowest rounded-2xl border border-surface-container-highest shadow-sm flex flex-col gap-4">
          <h2 className="font-headline-sm text-body-lg font-bold text-on-surface">Cryptographic Outbox Verification</h2>

          <div className="p-4 rounded-xl bg-surface-container-low border border-surface-container-highest text-xs flex flex-col gap-2">
            <div className="flex justify-between">
              <span className="text-on-surface-variant">ECDSA Curve:</span>
              <span className="font-mono font-bold text-on-surface">secp256r1 (NIST P-256)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-on-surface-variant">Saga Idempotency Cache:</span>
              <span className="font-mono font-bold text-on-tertiary-container">Redis 7 Cluster (Enabled)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-on-surface-variant">PostgreSQL Lock Mode:</span>
              <span className="font-mono font-bold text-on-surface">Pessimistic Deterministic UUID Order</span>
            </div>
          </div>

          <div className="p-4 bg-secondary-fixed/30 rounded-xl border border-secondary/20 text-xs text-on-surface flex flex-col gap-1">
            <span className="font-bold text-secondary flex items-center gap-1">
              <span className="material-symbols-outlined text-[16px]">verified_user</span>
              Immutable Double-Entry Ledger Invariant
            </span>
            <p className="text-on-surface-variant text-[11px] leading-relaxed">
              Every financial transfer executes paired double-entry journal records. Account rows are strictly locked in deterministic order to eliminate deadlock risks.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
