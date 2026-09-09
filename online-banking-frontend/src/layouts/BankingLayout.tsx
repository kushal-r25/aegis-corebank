import React, { useState, useEffect } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { AegisLogo } from '../components/AegisLogo';
import { SearchModal } from '../components/SearchModal';
import { NotificationDrawer } from '../components/NotificationDrawer';
import { isDemoMode, setDemoMode } from '../services/api';
import type { UserRole } from '../types';

export const BankingLayout: React.FC = () => {
  const { user, role, switchRole, sessionTimeout, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [demoMode, setDemoModeState] = useState(isDemoMode());

  const toggleDemoMode = () => {
    const nextMode = !demoMode;
    setDemoMode(nextMode);
    setDemoModeState(nextMode);
  };

  // Global shortcut for Cmd+K / Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const getNavLinks = () => {
    if (role === 'ADMIN') {
      return [
        { path: '/admin', label: 'Fraud & Operations', icon: 'admin_panel_settings' },
        { path: '/accounts', label: 'Accounts & Ledgers', icon: 'account_balance' },
        { path: '/transactions', label: 'Transaction Journal', icon: 'receipt_long' },
        { path: '/beneficiaries', label: 'Beneficiary Directory', icon: 'group' },
        { path: '/auditor', label: 'Forensic Lineage', icon: 'policy' },
        { path: '/security', label: 'Security Policies', icon: 'security' },
      ];
    }
    if (role === 'AUDITOR') {
      return [
        { path: '/auditor', label: 'Investigation & Trace', icon: 'policy' },
        { path: '/transactions', label: 'Immutable Journal', icon: 'receipt_long' },
        { path: '/accounts', label: 'Accounts Inspection', icon: 'account_balance' },
        { path: '/admin', label: 'Fraud Deck Review', icon: 'shield_with_heart' },
        { path: '/security', label: 'Cryptographic Root', icon: 'security' },
      ];
    }
    // CUSTOMER default
    return [
      { path: '/dashboard', label: 'Dashboard', icon: 'dashboard' },
      { path: '/accounts', label: 'Accounts & Vaults', icon: 'account_balance' },
      { path: '/transfers', label: 'Transfers & Payments', icon: 'sync_alt' },
      { path: '/transactions', label: 'Transactions & Statements', icon: 'receipt_long' },
      { path: '/beneficiaries', label: 'Beneficiaries', icon: 'group' },
      { path: '/scheduled-transfers', label: 'Scheduled Transfers', icon: 'schedule' },
      { path: '/security', label: 'Security & Access', icon: 'security' },
    ];
  };

  const navLinks = getNavLinks();

  const handleRoleChange = (newRole: UserRole) => {
    switchRole(newRole);
    if (newRole === 'ADMIN') navigate('/admin');
    else if (newRole === 'AUDITOR') navigate('/auditor');
    else navigate('/dashboard');
  };

  return (
    <div className="min-h-screen bg-background text-on-surface flex">
      {/* Search and Notification Modals */}
      <SearchModal isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
      <NotificationDrawer isOpen={isNotifOpen} onClose={() => setIsNotifOpen(false)} />

      {/* Persistent 256px Left Operational Rail */}
      <aside className="fixed left-0 top-0 h-full w-64 bg-surface-container-lowest z-50 flex flex-col justify-between border-r border-surface-container-highest">
        <div className="flex flex-col">
          {/* Logo Header */}
          <div className="h-16 px-4 flex items-center gap-3 border-b border-surface-container-highest">
            <AegisLogo size={32} />
            <div className="flex flex-col">
              <span className="font-headline-sm text-body-md font-bold tracking-tight text-on-surface leading-tight">AEGIS CORE</span>
              <span className="font-label-meta text-[10px] text-on-surface-variant uppercase tracking-wider">Institutional Vault</span>
            </div>
          </div>

          {/* Security Policy Badge */}
          <div className="p-3 mx-3 my-3 bg-surface-container-low rounded-xl border border-surface-container-high">
            <div className="flex items-center justify-between">
              <span className="font-label-meta text-[10px] uppercase font-bold text-secondary tracking-wider">Security Policy</span>
              <span className="w-1.5 h-1.5 rounded-full bg-on-tertiary-container animate-ping"></span>
            </div>
            <div className="mt-1.5 flex flex-col gap-0.5">
              <span className="font-label-numeric-sm text-[10px] text-on-surface font-semibold">ACID LEVEL 4 · STRICT</span>
              <span className="font-label-numeric-sm text-[10px] text-on-surface-variant">OUTBOX: SYNCHRONIZED</span>
              <span className="font-label-numeric-sm text-[10px] text-on-surface-variant">TLS 1.3 / E2E ENCRYPTED</span>
            </div>
          </div>

          <div className="px-4 py-1">
            <span className="font-label-meta text-[10px] uppercase text-on-surface-variant tracking-wider font-bold">
              {role === 'CUSTOMER' ? 'Banking Navigation' : role === 'ADMIN' ? 'Enterprise Controls' : 'Compliance Mandate'}
            </span>
          </div>

          {/* Navigation Items */}
          <nav className="flex flex-col px-2 space-y-1 mt-1">
            {navLinks.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-all font-body-md text-body-sm ${
                    isActive
                      ? 'bg-surface-container-low text-secondary border-l-4 border-secondary font-semibold shadow-xs'
                      : 'text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface'
                  }`}
                >
                  <span className={`material-symbols-outlined text-[20px] ${isActive ? 'text-secondary' : 'text-on-surface-variant'}`}>
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Footer State Strip */}
        <div className="p-4 border-t border-surface-container-highest bg-surface-container-lowest flex flex-col gap-2.5">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface-container-low border border-surface-container-highest">
            <span className="material-symbols-outlined text-[16px] text-on-tertiary-container">lock</span>
            <span className="font-label-numeric-sm text-[11px] text-on-surface font-semibold">TLS 1.3 / IDEMPOTENT</span>
          </div>
          <div className="flex items-center justify-between text-on-surface-variant text-xs px-1">
            <span className="font-label-meta text-[10px]">NODE: CORE-3.3-J21</span>
            <span className="w-2 h-2 rounded-full bg-on-tertiary-container"></span>
          </div>
          <button
            type="button"
            onClick={logout}
            className="flex items-center gap-2 px-3 py-2 text-error hover:bg-error-container/60 hover:text-on-error-container rounded-xl transition-colors font-body-md text-xs font-semibold"
          >
            <span className="material-symbols-outlined text-[18px]">logout</span>
            <span>Terminate Session</span>
          </button>
        </div>
      </aside>

      {/* Main View Area */}
      <div className="pl-64 flex-1 flex flex-col min-w-0">
        {/* Top Sticky Header */}
        <header className="fixed top-0 left-64 right-0 h-16 bg-surface-container-lowest/90 backdrop-blur-xl border-b border-surface-container-highest z-40 flex items-center justify-between px-6">
          {/* Left Live Pulse & API Mode Indicator */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={toggleDemoMode}
              title="Click to toggle between Live Microservices API (:8081-8084) and In-Memory Demo Mode"
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg border transition-all text-xs font-semibold cursor-pointer ${
                demoMode
                  ? 'bg-amber-500/10 border-amber-500/30 text-amber-400 hover:bg-amber-500/20'
                  : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${demoMode ? 'bg-amber-400' : 'bg-emerald-400 animate-pulse'}`}></span>
              <span className="font-label-numeric-sm">
                {demoMode ? '[DEMO SIMULATION]' : '[LIVE API :8081-8084]'}
              </span>
            </button>
            <div className="hidden xl:flex items-center gap-1 text-on-surface-variant text-xs">
              <span className="material-symbols-outlined text-[16px] text-on-tertiary-container">check_circle</span>
              <span>All Core Shards Operational</span>
            </div>
          </div>

          {/* Right Controls: Search, Multi-Role Switcher, Countdown, Notifications, User */}
          <div className="flex items-center gap-3">
            {/* Search Trigger */}
            <button
              onClick={() => setIsSearchOpen(true)}
              className="relative hidden md:flex items-center pl-8 pr-10 py-1.5 bg-surface-container-low border border-surface-container-highest rounded-xl text-xs text-on-surface-variant hover:text-on-surface hover:border-secondary transition-colors w-60 text-left"
            >
              <span className="material-symbols-outlined absolute left-2.5 text-on-surface-variant text-[18px]">search</span>
              <span>Search ledgers, accounts...</span>
              <kbd className="absolute right-2 font-label-numeric-sm text-[10px] text-on-surface-variant bg-surface-container px-1.5 py-0.5 rounded">⌘K</kbd>
            </button>

            {/* Role Switcher Pills */}
            <div className="flex items-center p-1 bg-surface-container-low rounded-xl border border-surface-container-highest">
              <button
                type="button"
                onClick={() => handleRoleChange('CUSTOMER')}
                className={`px-3 py-1 rounded-lg font-label-meta text-[10px] font-bold transition-all ${
                  role === 'CUSTOMER'
                    ? 'bg-secondary text-on-secondary shadow-xs'
                    : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
                }`}
              >
                CUSTOMER
              </button>
              <button
                type="button"
                onClick={() => handleRoleChange('ADMIN')}
                className={`px-3 py-1 rounded-lg font-label-meta text-[10px] font-bold transition-all ${
                  role === 'ADMIN'
                    ? 'bg-secondary text-on-secondary shadow-xs'
                    : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
                }`}
              >
                ADMIN
              </button>
              <button
                type="button"
                onClick={() => handleRoleChange('AUDITOR')}
                className={`px-3 py-1 rounded-lg font-label-meta text-[10px] font-bold transition-all ${
                  role === 'AUDITOR'
                    ? 'bg-secondary text-on-secondary shadow-xs'
                    : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
                }`}
              >
                AUDITOR
              </button>
            </div>

            {/* Session Timeout */}
            <div className="hidden sm:flex items-center gap-1 px-2.5 py-1 bg-surface-container rounded-lg border border-surface-container-highest">
              <span className="material-symbols-outlined text-[15px] text-error animate-pulse">timer</span>
              <span className="font-label-numeric-sm text-xs text-error font-semibold">{sessionTimeout}</span>
            </div>

            {/* Notification Bell */}
            <button
              type="button"
              onClick={() => setIsNotifOpen(true)}
              className="relative p-2 text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low rounded-xl transition-colors"
            >
              <span className="material-symbols-outlined text-[20px]">notifications</span>
              <span className="absolute top-1 right-1 flex items-center justify-center w-4 h-4 text-[9px] font-bold text-on-error bg-error rounded-full">
                3
              </span>
            </button>

            <div className="h-6 w-px bg-surface-container-highest"></div>

            {/* User Profile */}
            <div className="flex items-center gap-2.5">
              <div className="flex flex-col text-right">
                <span className="font-body-sm text-xs font-semibold text-on-surface leading-tight">
                  {user.firstName} {user.lastName}
                </span>
                <span className="font-label-numeric-sm text-[10px] text-on-surface-variant">{user.customerId}</span>
              </div>
              <div className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center font-bold text-xs text-secondary border border-surface-container-highest">
                {user.firstName[0]}{user.lastName[0]}
              </div>
            </div>
          </div>
        </header>

        {/* Page View Container */}
        <main className="w-full pt-16 bg-background min-h-screen p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
