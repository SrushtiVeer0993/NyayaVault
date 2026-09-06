import { createContext, useContext, useReducer, useEffect, useCallback, useState } from 'react';
import { api, setAuthToken } from '../api/apiClient';
import { USERS, ROLES, RBAC_PERMISSIONS } from '../data/mockData';
import { useAuth } from './AuthContext';

const AppContext = createContext(null);

const initialState = {
  loading: true,
  error: null,
  currentUser: USERS[0],
  currentRole: ROLES.INVESTIGATING_OFFICER,
  cases: [],
  documents: [],
  evidence: [],
  auditEvents: [],
  securityEvents: [],
  securityAlerts: [],
  notifications: [],
  certificates: [],
  permissions: RBAC_PERMISSIONS[ROLES.INVESTIGATING_OFFICER],
  analytics: null,
  abacAttributes: {
    role: ROLES.INVESTIGATING_OFFICER,
    caseAssignment: 'MH-PN-2026-01428',
    department: 'Crime Investigation Department',
    clearanceLevel: 3,
    documentClassification: 'Confidential',
    caseSensitivity: 'Standard',
    resourceType: 'Document',
    workflowState: 'Active',
  },
};

function normalizeCase(c) {
  return {
    ...c,
    id: c.id,
    caseNumber: c.case_number,
    title: c.title,
    type: c.case_type,
    status: c.status,
    priority: c.priority,
    sensitivity: c.sensitivity,
    assignedOfficer: c.assigned_officer || 'Unassigned',
    createdDate: c.created_at ? c.created_at.split('T')[0] : '',
    lastUpdated: c.updated_at ? c.updated_at.split('T')[0] : '',
    documentCount: 0,
    evidenceCount: 0,
  };
}

function normalizeDocument(d) {
  const latest = d.latest_version;
  return {
    ...d,
    id: d.id,
    name: d.title,
    title: d.title,
    caseId: d.case_id,
    type: d.document_type,
    classification: d.classification,
    status: d.status,
    uploadDate: d.created_at,
    versionId: d.current_version_id || latest?.id,
    version: latest ? `${latest.version_number}.0` : '1.0',
    sha256: latest?.sha256_hash || 'Pending',
    integrityStatus: 'Verified',
    blockchainStatus: 'Confirmed',
    blockchainTx: latest ? `0x${latest.sha256_hash.slice(0, 16)}...` : 'Pending',
    humanReviewRequired: d.status === 'Review Required',
    aiClassification: { type: d.document_type, confidence: 95 },
    versions: latest ? [{ version: `${latest.version_number}.0`, date: latest.created_at, sha256: latest.sha256_hash }] : [],
  };
}

function normalizeEvidence(e) {
  return {
    ...e,
    id: e.id,
    evidenceNumber: e.evidence_number,
    caseId: e.case_id,
    type: e.type,
    description: e.description,
    collectedBy: e.collected_by,
    currentCustodian: e.current_custodian,
    status: e.status,
    classification: e.classification,
    collectionDate: e.collected_at ? e.collected_at.split('T')[0] : '',
    custodyChain: (e.custody_events || []).map((c) => ({
      id: c.id,
      from: c.from_user,
      to: c.to_user,
      action: c.action,
      date: c.timestamp,
      notes: c.context,
      hash: c.event_hash,
      signature: c.signature_reference,
    })),
  };
}

function normalizeAuditEvent(a) {
  return {
    ...a,
    id: a.id,
    timestamp: a.timestamp,
    actor: a.actor_role || a.actor_id || 'System Officer',
    actorId: a.actor_id,
    role: a.actor_role,
    action: a.action,
    resource: a.resource_type,
    resourceId: a.resource_id,
    caseId: a.case_id,
    result: a.result,
    severity: a.severity,
    ipAddress: a.ip_address || '127.0.0.1',
    hash: a.event_hash,
    details: a.metadata_json ? JSON.stringify(a.metadata_json) : a.action,
  };
}

function normalizeSecurityEvent(s) {
  return {
    ...s,
    id: s.id,
    type: s.event_type,
    severity: s.severity,
    riskScore: s.risk_score,
    activity: s.description,
    timestamp: s.detected_at,
    status: s.status === 'NEW' ? 'Open' : s.status,
    actions: ['Investigate', 'View Audit Trail'],
  };
}

function normalizeNotification(n) {
  return {
    ...n,
    id: n.id,
    type: n.type,
    title: n.title,
    message: n.message,
    timestamp: n.created_at,
    read: n.is_read,
    severity: n.type.includes('ALERT') || n.type.includes('TAMPER') ? 'high' : 'low',
  };
}

function normalizeCertificate(c) {
  return {
    ...c,
    id: c.id,
    certificateNumber: c.certificate_number,
    caseId: c.case_id,
    documentId: c.document_id,
    generatedBy: c.generated_by,
    generatedAt: c.created_at,
    documentHash: c.verification_hash,
    documentName: 'Verified Legal Record',
    verificationStatus: 'Verified',
  };
}

function appReducer(state, action) {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.loading };
    case 'SET_AUTH_USER': {
      const user = action.user;
      const role = user.role || ROLES.INVESTIGATING_OFFICER;
      return {
        ...state,
        currentUser: {
          ...user,
          name: user.full_name,
          avatar: user.full_name?.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase(),
        },
        currentRole: role,
        permissions: RBAC_PERMISSIONS[role] || {},
        abacAttributes: {
          ...state.abacAttributes,
          role,
          department: user.department,
          clearanceLevel: Number.parseInt(user.clearance_level?.replace('Level ', ''), 10) || 1,
        },
      };
    }
    case 'SET_DATA':
      return {
        ...state,
        loading: false,
        cases: action.payload.cases,
        documents: action.payload.documents,
        evidence: action.payload.evidence,
        auditEvents: action.payload.auditEvents,
        securityEvents: action.payload.securityEvents,
        securityAlerts: action.payload.securityAlerts,
        notifications: action.payload.notifications,
        certificates: action.payload.certificates,
        analytics: action.payload.analytics,
      };
    case 'SWITCH_ROLE': {
      const user = USERS.find((u) => u.role === action.role) || USERS[0];
      return {
        ...state,
        currentUser: user,
        currentRole: action.role,
        permissions: RBAC_PERMISSIONS[action.role],
        abacAttributes: { ...state.abacAttributes, role: action.role },
      };
    }
    case 'SET_CASES':
      return { ...state, cases: action.cases };
    case 'SET_DOCUMENTS':
      return { ...state, documents: action.documents };
    case 'SET_EVIDENCE':
      return { ...state, evidence: action.evidence };
    case 'SET_AUDIT_EVENTS':
      return { ...state, auditEvents: action.auditEvents };
    case 'SET_SECURITY_EVENTS':
      return { ...state, securityEvents: action.securityEvents };
    case 'SET_NOTIFICATIONS':
      return { ...state, notifications: action.notifications };
    case 'SET_CERTIFICATES':
      return { ...state, certificates: action.certificates };
    case 'UPDATE_DOCUMENT_INTEGRITY':
      return {
        ...state,
        documents: state.documents.map((doc) =>
          doc.id === action.docId || doc.versionId === action.docId
            ? { ...doc, integrityStatus: action.status, sha256: action.hash || doc.sha256 }
            : doc
        ),
      };
    case 'MARK_NOTIFICATION_READ':
      return {
        ...state,
        notifications: state.notifications.map((n) =>
          n.id === action.id ? { ...n, read: true } : n
        ),
      };
    case 'MARK_ALL_NOTIFICATIONS_READ':
      return {
        ...state,
        notifications: state.notifications.map((n) => ({ ...n, read: true })),
      };
    case 'UPDATE_ABAC_ATTRIBUTE':
      return {
        ...state,
        abacAttributes: { ...state.abacAttributes, [action.key]: action.value },
      };
    case 'UPDATE_RBAC_PERMISSION':
      return {
        ...state,
        permissions: { ...state.permissions, [action.permission]: action.value },
      };
    default:
      return state;
  }
}

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(appReducer, initialState);
  const { user: authUser, loading: authLoading } = useAuth();

  const loadAllData = useCallback(async () => {
    dispatch({ type: 'SET_LOADING', loading: true });
    try {
      const [
        casesRaw,
        docsRaw,
        evRaw,
        auditRaw,
        secEventsRaw,
        alertsRaw,
        notifsRaw,
        certsRaw,
        analyticsRaw,
      ] = await Promise.all([
        api.getCases().catch(() => []),
        api.getDocuments().catch(() => []),
        api.getEvidence().catch(() => []),
        api.getAuditTrail().catch(() => []),
        api.getSecurityEvents().catch(() => []),
        api.getSecurityAlerts().catch(() => []),
        api.getNotifications().catch(() => []),
        api.getCertificates().catch(() => []),
        api.getDashboardAnalytics().catch(() => null),
      ]);

      const cases = (casesRaw || []).map(normalizeCase);
      const documents = (docsRaw || []).map(normalizeDocument);
      const evidence = (evRaw || []).map(normalizeEvidence);
      const auditEvents = (auditRaw || []).map(normalizeAuditEvent);
      const securityEvents = (secEventsRaw || []).map(normalizeSecurityEvent);
      const securityAlerts = alertsRaw || [];
      const notifications = (notifsRaw || []).map(normalizeNotification);
      const certificates = (certsRaw || []).map(normalizeCertificate);

      // Link case counts
      cases.forEach((c) => {
        c.documentCount = documents.filter((d) => d.caseId === c.id || d.case_id === c.id).length;
        c.evidenceCount = evidence.filter((e) => e.caseId === c.id || e.case_id === c.id).length;
      });

      dispatch({
        type: 'SET_DATA',
        payload: {
          cases,
          documents,
          evidence,
          auditEvents,
          securityEvents,
          securityAlerts,
          notifications,
          certificates,
          analytics: analyticsRaw,
        },
      });
    } catch (err) {
      console.error('Failed to load backend data:', err);
      dispatch({ type: 'SET_LOADING', loading: false });
    }
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (authUser) {
      dispatch({ type: 'SET_AUTH_USER', user: authUser });
      loadAllData();
    } else {
      dispatch({ type: 'SET_LOADING', loading: false });
    }
  }, [authLoading, authUser, loadAllData]);

  // Actions wired to Backend Endpoints

  async function switchRole(role) {
    dispatch({ type: 'SWITCH_ROLE', role });
  }

  async function addCase(caseData) {
    const payload = {
      case_number: caseData.caseNumber || caseData.id || `MH-PN-2026-${Math.floor(Math.random() * 9000 + 1000)}`,
      title: caseData.title,
      case_type: caseData.type || 'Cybercrime',
      description: caseData.description || 'Registered case in NyayaVault',
      priority: caseData.priority || 'High',
      sensitivity: caseData.sensitivity || 'Confidential',
      department: caseData.department || state.currentUser.department || 'Crime Investigation Department',
      assigned_officer: caseData.assignedOfficer || state.currentUser.name,
    };
    const created = await api.createCase(payload);
    await loadAllData();
    return normalizeCase(created);
  }

  async function addDocument(docData, fileObj = null) {
    const formData = new FormData();
    if (fileObj) {
      formData.append('file', fileObj);
    } else {
      const dummyBlob = new Blob([`NyayaVault Digital Document: ${docData.name || 'document'}`], { type: 'application/pdf' });
      formData.append('file', dummyBlob, docData.name || 'document.pdf');
    }
    formData.append('case_id', docData.caseId || state.cases[0]?.id || 'case_mh_01428');
    formData.append('document_type', docData.type || 'Investigation Record');
    formData.append('classification', docData.classification || 'Confidential');
    formData.append('title', docData.name || 'Uploaded Document');
    formData.append('description', docData.description || 'Uploaded via NyayaVault UI');

    const created = await api.uploadDocument(formData);
    await loadAllData();
    return normalizeDocument(created);
  }

  async function verifyIntegrity(docId) {
    const doc = state.documents.find((d) => d.id === docId || d.versionId === docId);
    const targetVerId = doc?.versionId || docId;
    const res = await api.verifyIntegrity(targetVerId);
    dispatch({
      type: 'UPDATE_DOCUMENT_INTEGRITY',
      docId: doc?.id || docId,
      status: res.status === 'VERIFIED' ? 'Verified' : 'Tampered',
      hash: res.calculated_hash,
    });
    await loadAllData();
    return res;
  }

  async function simulateTampering(docId) {
    const doc = state.documents.find((d) => d.id === docId || d.versionId === docId);
    const targetVerId = doc?.versionId || docId;
    const res = await api.simulateTamper(targetVerId);
    dispatch({
      type: 'UPDATE_DOCUMENT_INTEGRITY',
      docId: doc?.id || docId,
      status: 'Tampered',
      hash: res.calculated_hash,
    });
    await loadAllData();
    return res;
  }

  async function restoreOriginal(docId) {
    const doc = state.documents.find((d) => d.id === docId || d.versionId === docId);
    const targetVerId = doc?.versionId || docId;
    const res = await api.restoreIntegrity(targetVerId);
    dispatch({
      type: 'UPDATE_DOCUMENT_INTEGRITY',
      docId: doc?.id || docId,
      status: 'Verified',
      hash: res.canonical_hash,
    });
    await loadAllData();
    return res;
  }

  async function generateCertificate(certData) {
    const payload = {
      case_id: certData.caseId || state.cases[0]?.id || 'case_mh_01428',
      document_id: certData.documentId || state.documents[0]?.id,
    };
    const created = await api.generateCertificate(payload);
    await loadAllData();
    return normalizeCertificate(created);
  }

  async function transferEvidence(evidenceId, newCustodian, notes) {
    const res = await api.transferEvidence(evidenceId, {
      to_user: newCustodian,
      context: notes || 'Evidence transferred via NyayaVault UI',
    });
    await loadAllData();
    return normalizeEvidence(res);
  }

  async function markNotificationRead(id) {
    await api.markNotificationRead(id).catch(() => {});
    dispatch({ type: 'MARK_NOTIFICATION_READ', id });
  }

  async function markAllNotificationsRead() {
    await api.markAllNotificationsRead().catch(() => {});
    dispatch({ type: 'MARK_ALL_NOTIFICATIONS_READ' });
  }

  async function resolveSecurityEvent(id) {
    await api.resolveSecurityAlert(id, 'Resolved via Security Center').catch(() => {});
    await loadAllData();
  }

  function updateAbacAttribute(key, value) {
    dispatch({ type: 'UPDATE_ABAC_ATTRIBUTE', key, value });
  }

  function updateRbacPermission(permission, value) {
    dispatch({ type: 'UPDATE_RBAC_PERMISSION', permission, value });
  }

  function canAccess(permission) {
    return state.permissions[permission] === true;
  }

  async function addEvidence(evidenceData) {
    const payload = {
      case_id: evidenceData.caseId || (state.cases[0]?.id || 'case_mh_01428'),
      type: evidenceData.type || 'Digital Evidence',
      description: evidenceData.description || 'Evidence item',
      collected_by: evidenceData.collectedBy || state.currentUser.name,
      current_custodian: evidenceData.currentCustodian || state.currentUser.name,
      classification: evidenceData.classification || 'Digital Evidence',
      storage_location: evidenceData.storageLocation || 'Secure Evidence Locker A-1',
    };
    const created = await api.createEvidence(payload);
    await loadAllData();
    return normalizeEvidence(created);
  }

  async function addAuditEvent(eventData) {
    // Refresh state when UI-level audit actions occur
    await loadAllData();
  }

  const value = {
    state,
    dispatch,
    loadAllData,
    switchRole,
    addCase,
    addDocument,
    addEvidence,
    addAuditEvent,
    verifyIntegrity,
    simulateTampering,
    restoreOriginal,
    generateCertificate,
    transferEvidence,
    markNotificationRead,
    markAllNotificationsRead,
    updateAbacAttribute,
    updateRbacPermission,
    resolveSecurityEvent,
    canAccess,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
}
