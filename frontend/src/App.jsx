import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import Layout from './components/Layout';
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

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <Layout>
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
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
            {/* Catch-all */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </Layout>
      </BrowserRouter>
    </AppProvider>
  );
}
