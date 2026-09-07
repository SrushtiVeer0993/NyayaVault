import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider, useApp } from './context/AppContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Profile from './pages/Profile';
import Dashboard from './pages/Dashboard';
import Cases from './pages/Cases';
import CaseDetail from './pages/CaseDetail';
import Documents from './pages/Documents';
import DocumentDetail from './pages/DocumentDetail';
import Evidence from './pages/Evidence';
import AISearch from './pages/AISearch';
import ChainOfCustody from './pages/ChainOfCustody';
import Integrity from './pages/Integrity';
import SecurityCenter from './pages/SecurityCenter';
import AuditTrail from './pages/AuditTrail';
import Certificates from './pages/Certificates';
import AccessControl from './pages/AccessControl';
import Analytics from './pages/Analytics';
import Settings from './pages/Settings';

function ProtectedRoutes() {
  const { state } = useApp();
  if (state.loading) {
    return <div className="min-h-screen flex items-center justify-center text-sm text-slate-400">Loading NyayaVault...</div>;
  }
  if (!state.isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/cases" element={<Cases />} />
        <Route path="/cases/:id" element={<CaseDetail />} />
        <Route path="/documents" element={<Documents />} />
        <Route path="/documents/:id" element={<DocumentDetail />} />
        <Route path="/evidence" element={<Evidence />} />
        <Route path="/search" element={<AISearch />} />
        <Route path="/chain-of-custody" element={<ChainOfCustody />} />
        <Route path="/integrity" element={<Integrity />} />
        <Route path="/security" element={<SecurityCenter />} />
        <Route path="/audit" element={<AuditTrail />} />
        <Route path="/certificates" element={<Certificates />} />
        <Route path="/access-control" element={<AccessControl />} />
        <Route path="/analytics" element={<Analytics />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Layout>
  );
}

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/*" element={<ProtectedRoutes />} />
        </Routes>
      </BrowserRouter>
    </AppProvider>
  );
}