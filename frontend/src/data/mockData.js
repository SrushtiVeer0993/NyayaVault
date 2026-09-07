// NyayaVault - Constants and System Enums
// All dynamic entity data is fetched directly from the backend API/database.

export const ROLES = {
  INVESTIGATING_OFFICER: 'Investigating Officer',
  FORENSIC_STAFF: 'Forensic Staff',
  SENIOR_OFFICER: 'Senior Officer',
  ADMINISTRATOR: 'Administrator',
};

export const DOCUMENT_TYPES = [
  'FIR',
  'Police Report',
  'Investigation Record',
  'Witness Statement',
  'Charge Sheet',
  'Court Filing',
  'Evidence Record',
  'Forensic Report',
  'Legal Notice',
  'Judgment',
];

export const CASE_TYPES = [
  'Cybercrime',
  'Cyber Financial Fraud',
  'Homicide',
  'Theft',
  'Fraud',
  'Domestic Violence',
  'Drug Trafficking',
  'Kidnapping',
  'Corruption',
  'Sexual Assault',
];

export const CASE_STATUSES = ['Active', 'Under Investigation', 'Closed', 'Pending Trial', 'Archived'];
export const CASE_PRIORITIES = ['Critical', 'High', 'Medium', 'Low'];

export const EVIDENCE_TYPES = [
  'Digital Evidence',
  'Digital',
  'Physical',
  'Documentary',
  'Forensic',
  'Witness',
  'Audio/Video',
  'Biological',
  'Ballistic',
  'Financial',
];

export const EVIDENCE_STATUSES = [
  'COLLECTED',
  'SECURED',
  'IN_TRANSIT',
  'TRANSFERRED',
  'COURT_SUBMITTED',
  'Collected',
  'In Analysis',
  'Verified',
  'Transferred',
  'Court Submitted',
];

export const INTEGRITY_STATUSES = {
  VERIFIED: 'VERIFIED',
  TAMPERED: 'MISMATCH',
  PENDING: 'PENDING',
  MISMATCH: 'MISMATCH',
};

// Initial/default user templates mapped to DB roles
export const USERS = [
  {
    id: 'usr_io_001',
    name: 'Inspector Vikram Shinde',
    role: ROLES.INVESTIGATING_OFFICER,
    employeeId: 'MH-CID-10842',
    department: 'Crime Investigation Department',
    clearanceLevel: 3,
    email: 'investigator@nyayavault.gov.in',
    avatar: 'VS',
  },
  {
    id: 'usr_forensic_001',
    name: 'Dr. Ananya Roy',
    role: ROLES.FORENSIC_STAFF,
    employeeId: 'CFSL-DEL-3381',
    department: 'Central Forensic Science Laboratory',
    clearanceLevel: 3,
    email: 'forensics@nyayavault.gov.in',
    avatar: 'AR',
  },
  {
    id: 'usr_senior_001',
    name: 'Kavita Deshmukh (SPS)',
    role: ROLES.SENIOR_OFFICER,
    employeeId: 'MH-POL-0042',
    department: 'State Police Headquarters',
    clearanceLevel: 4,
    email: 'senior@nyayavault.gov.in',
    avatar: 'KD',
  },
  {
    id: 'usr_admin_001',
    name: 'Rajesh Kumar (IPS)',
    role: ROLES.ADMINISTRATOR,
    employeeId: 'DL-NCRB-2024-001',
    department: 'National Crime Records Bureau',
    clearanceLevel: 4,
    email: 'admin@nyayavault.gov.in',
    avatar: 'RK',
  },
];

// RBAC Permissions Matrix
export const RBAC_PERMISSIONS = {
  [ROLES.INVESTIGATING_OFFICER]: {
    view: true,
    upload: true,
    edit: true,
    delete: false,
    download: true,
    verify: true,
    transfer: true,
    sign: true,
    generateCertificate: true,
    manageAccess: false,
    manageUsers: false,
    viewSecurityEvents: true,
    viewAuditLogs: false,
  },
  [ROLES.FORENSIC_STAFF]: {
    view: true,
    upload: true,
    edit: false,
    delete: false,
    download: true,
    verify: true,
    transfer: true,
    sign: true,
    generateCertificate: true,
    manageAccess: false,
    manageUsers: false,
    viewSecurityEvents: false,
    viewAuditLogs: false,
    assignCases: true,
  },
  [ROLES.SENIOR_OFFICER]: {
    view: true,
    upload: true,
    edit: true,
    delete: false,
    download: true,
    verify: true,
    transfer: true,
    sign: true,
    generateCertificate: true,
    manageAccess: false,
    manageUsers: false,
    viewSecurityEvents: true,
    viewAuditLogs: true,
  },
  [ROLES.ADMINISTRATOR]: {
    view: true,
    upload: true,
    edit: true,
    delete: true,
    download: true,
    verify: true,
    transfer: true,
    sign: true,
    generateCertificate: true,
    manageAccess: true,
    manageUsers: true,
    viewSecurityEvents: true,
    viewAuditLogs: true,
  },
};
