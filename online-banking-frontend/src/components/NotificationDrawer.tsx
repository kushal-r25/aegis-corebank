import React from 'react';

interface NotificationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NotificationDrawer: React.FC<NotificationDrawerProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const notifications = [
    {
      id: 'notif-1',
      title: 'ACID Ledger Consensus Synchronized',
      time: '2 minutes ago',
      desc: 'Epoch #49102 committed across all PostgreSQL shards with 0 replication lag.',
      type: 'success',
      icon: 'verified',
    },
    {
      id: 'notif-2',
      title: 'Dual-Sign Security Challenge Pass',
      time: '18 minutes ago',
      desc: 'Hardware 2FA challenge signed for wire settlement to Infosys Technologies Ltd.',
      type: 'info',
      icon: 'lock',
    },
    {
      id: 'notif-3',
      title: 'OFAC & AML Automated Sanctions Check',
      time: '1 hour ago',
      desc: 'Real-time sanctions screening completed: 0 matches on global sanctions lists.',
      type: 'info',
      icon: 'policy',
    },
    {
      id: 'notif-4',
      title: 'Interest Yield Auto-Compounded',
      time: '8 hours ago',
      desc: '+₹17,750.00 INR credited to Fixed Deposit (12M) at 7.10% p.a. rate.',
      type: 'success',
      icon: 'trending_up',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-on-surface/30 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div className="relative w-full max-w-sm h-full bg-surface-container-lowest shadow-2xl border-l border-surface-container-highest flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-surface-container-highest">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-secondary text-[22px]">notifications</span>
            <h3 className="font-headline-sm text-body-lg font-bold text-on-surface">System Alerts</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-on-surface-variant hover:bg-surface-container">
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <div className="p-4 flex-1 overflow-y-auto flex flex-col gap-3">
          {notifications.map((n) => (
            <div key={n.id} className="p-3 rounded-xl bg-surface-container-low border border-surface-container-highest flex items-start gap-3">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${n.type === 'success' ? 'bg-tertiary-container/30 text-on-tertiary-container' : 'bg-surface-container text-secondary'}`}>
                <span className="material-symbols-outlined text-[18px]">{n.icon}</span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="font-semibold text-body-sm text-on-surface leading-tight">{n.title}</span>
                <span className="text-xs text-on-surface-variant leading-relaxed">{n.desc}</span>
                <span className="font-label-numeric-sm text-[10px] text-on-surface-variant mt-1">{n.time}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="p-4 border-t border-surface-container-highest bg-surface-container-low">
          <div className="flex items-center justify-between text-xs text-on-surface-variant">
            <span>Node: PROD-IND-SOUTH (Bengaluru Edge)</span>
            <span className="font-label-meta font-bold text-on-tertiary-container uppercase">TLS 1.3 ACTIVE</span>
          </div>
        </div>
      </div>
    </div>
  );
};
