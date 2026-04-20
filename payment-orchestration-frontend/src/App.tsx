import { Routes, Route, Navigate } from 'react-router-dom';
import AppLayout from './layouts/AppLayout';
import RequireAuth from './shared/components/RequireAuth';
import Login from './features/auth/Login';
import Dashboard from './features/dashboard/Dashboard';
import Transactions from './features/transactions/Transactions';
import RoutingRules from './features/routing-rules/RoutingRules';
import Providers from './features/providers/Providers';
import FeeRates from './features/fee-rates/FeeRates';
import Metrics from './features/metrics/Metrics';
import Reconciliation from './features/reconciliation/Reconciliation';
import DeadLetterQueue from './features/dead-letter-queue/DeadLetterQueue';
import PaymentDemo from './features/payment-demo/PaymentDemo';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route element={<RequireAuth />}>
        <Route path="/" element={<AppLayout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard"          element={<Dashboard />} />
          <Route path="transactions"       element={<Transactions />} />
          <Route path="routing-rules"      element={<RoutingRules />} />
          <Route path="providers"          element={<Providers />} />
          <Route path="fee-rates"          element={<FeeRates />} />
          <Route path="metrics"            element={<Metrics />} />
          <Route path="reconciliation"     element={<Reconciliation />} />
          <Route path="dead-letter-queue"  element={<DeadLetterQueue />} />
          <Route path="payment-demo"       element={<PaymentDemo />} />
        </Route>
      </Route>
    </Routes>
  );
}
