import { Navigate, Route, Routes } from 'react-router-dom';
import { BankingLayout } from './layouts/BankingLayout';
import { DashboardPage } from './pages/DashboardPage';
import { AccountsPage } from './pages/AccountsPage';
import { TransfersPage } from './pages/TransfersPage';
import { TransactionsPage } from './pages/TransactionsPage';
import { BeneficiariesPage } from './pages/BeneficiariesPage';
import { ScheduledTransfersPage } from './pages/ScheduledTransfersPage';
import { AdminPage } from './pages/AdminPage';
import { AuditorPage } from './pages/AuditorPage';
import { SecurityPage } from './pages/SecurityPage';

export default function App() {
  return (
    <Routes>
      <Route element={<BankingLayout />}>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/accounts" element={<AccountsPage />} />
        <Route path="/transfers" element={<TransfersPage />} />
        <Route path="/transactions" element={<TransactionsPage />} />
        <Route path="/beneficiaries" element={<BeneficiariesPage />} />
        <Route path="/scheduled-transfers" element={<ScheduledTransfersPage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/auditor" element={<AuditorPage />} />
        <Route path="/security" element={<SecurityPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
