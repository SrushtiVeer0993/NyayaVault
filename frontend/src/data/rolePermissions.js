// Role permission definitions — matches README "Default User Accounts & Clearances" table
export const ROLE_PROFILES = {
  'Administrator': {
    clearance: 'Level 4 (Top Secret)',
    clearanceLevel: 4,
    color: '#DC2626',
    badge: 'AD',
    tagline: 'Full system authority — user management, audit oversight, and unrestricted access.',
    operations: [
      'Full System Access',
      'User Administration',
      'Audit Logs & Security Oversight',
      'Manage Access Policies (RBAC / ABAC)',
      'Edit & Delete Records',
      'Upload & Download Documents',
      'Verify Document Integrity',
      'Generate Section 65B Certificates',
      'Digitally Sign Documents',
    ],
  },
  'Investigating Officer': {
    clearance: 'Level 3 (Secret)',
    clearanceLevel: 3,
    color: '#2563EB',
    badge: 'IO',
    tagline: 'Owns case files end-to-end — from FIR registration to evidence ingestion and certification.',
    operations: [
      'Case File Management',
      'Evidence Ingestion',
      'Upload & Download Documents',
      'Verify Document Integrity',
      'Transfer Evidence Custody',
      'Digitally Sign Documents',
      'Generate Section 65B Certificates',
    ],
  },
  'Forensic Staff': {
    clearance: 'Level 3 (Secret)',
    clearanceLevel: 3,
    color: '#7C3AED',
    badge: 'FS',
    tagline: 'Handles chain-of-custody integrity, hash verification, and forensic lab documentation.',
    operations: [
      'Chain of Custody Management',
      'Hash / Integrity Verification',
      'Lab Notes & Forensic Reports',
      'Upload & Download Documents',
      'Digitally Sign Documents',
      'Generate Section 65B Certificates',
    ],
  },
  'Senior Officer': {
    clearance: 'Level 4 (Top Secret)',
    clearanceLevel: 4,
    color: '#D97706',
    badge: 'SO',
    tagline: 'Oversight role — dossier sign-offs, security monitoring, and case-level analytics.',
    operations: [
      'Dossier Sign-offs',
      'Security Overrides',
      'Analytics & Reporting',
      'View Security Events',
      'View Full Audit Trail',
      'Upload & Download Documents',
      'Verify Document Integrity',
      'Transfer Evidence Custody',
      'Digitally Sign Documents',
      'Generate Section 65B Certificates',
    ],
  },
};

export function getRoleProfile(role) {
  return ROLE_PROFILES[role] || ROLE_PROFILES['Investigating Officer'];
}