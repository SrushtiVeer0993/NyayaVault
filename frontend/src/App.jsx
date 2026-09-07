import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Signup from './pages/Signup';
import RegistrationRequests from './pages/RegistrationRequests';
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

function ApplicationRoutes() {
  const { loading, isAuthenticated } = useAuth();
  const location = useLocation();

  if (loading) {
    return <div className="min-h-screen bg-[#071322] flex items-center justify-center text-white">Loading secure session...</div>;
  }

  if (!isAuthenticated) {
    return (
      <Routes>
        <Route path="/signup" element={<Signup />} />
        <Route path="/login" element={<Login />} />
        <Route path="*" element={<Navigate to="/login" state={{ from: location.pathname }} replace />} />
      </Routes>
    );
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
        <Route path="/registration-requests" element={<AdminOnly><RegistrationRequests /></AdminOnly>} />
        <Route path="/analytics" element={<Analytics />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Layout>
  );
}

function AdminOnly({ children }) {
  const { user } = useAuth();
  return user?.role === 'Administrator' ? children : <Navigate to="/dashboard" replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <AppProvider>
        <BrowserRouter>
          <ApplicationRoutes />
        </BrowserRouter>
      </AppProvider>
    </AuthProvider>
  );
}