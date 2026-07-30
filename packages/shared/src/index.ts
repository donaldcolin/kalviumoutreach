// ─── @kalvium-outreach/shared ────────────────────────────────────────────────
// Single source of truth for all domain types shared between app, website,
// and webhook-server. Platform-specific types (React Navigation, RN Firebase)
// must NOT be defined here.
// ─────────────────────────────────────────────────────────────────────────────

// ─── Enums & Literal Types ───────────────────────────────────────────────────

export type UserRole = 'executive' | 'teamLead' | 'regionalManager' | 'admin';

export type StopClassification = 'school' | 'teashop' | 'park' | 'break' | 'unclassified';

// ─── LeadSquared CRM Types ──────────────────────────────────────────────────

/** A single field in an LSQ activity push payload */
export interface LsqActivityField {
  SchemaName: string;
  Value: string;
}

/** A lead from the LeadSquared API (My Leads / Global Search) */
export interface Lead {
  ProspectID: string;
  FirstName?: string;
  LastName?: string;
  mx_City?: string;
  ProspectStage?: string;
  OwnerIdEmailAddress?: string;
}

/** A CRM activity record stored in Firestore `crmActivities` collection */
export interface CrmActivity {
  id: string;
  executiveId?: string;
  executiveEmail?: string;
  lsqLeadId?: string;
  lsqActivityId?: string | null;
  schoolName?: string;
  leadName?: string;
  walkInDateTime?: string;
  lsqCreatedOn?: string;
  typeOfWalkIn?: string;
  walkInStatus?: string;
  statusFrontDesk?: string;
  statusPIC?: string;
  statusPrincipal?: string;
  refusedEntryReason?: string;
  picName?: string;
  picPhone?: string;
  picDesignation?: string;
  picEmail?: string;
  picAppointmentDate?: string;
  principalName?: string;
  principalPhone?: string;
  principalEmail?: string;
  principalAppointmentDate?: string;
  seminarAppointmentDate?: string;
  boardOfSchool?: string;
  studentStrength?: string;
  schoolFees?: string;
  followUpDate?: string;
  notes?: string;
  recordingUrl?: string | null;
  source?: string;
  lat?: number | null;
  lng?: number | null;
  startLocation?: { lat: number; lng: number } | null;
  endLocation?: { lat: number; lng: number } | null;
  distanceMeters?: number | null;
  isValidWalkIn?: boolean | null;
  // Website-specific fields that also appear in Firestore docs
  activityType?: string;
  remarks?: string;
  livePhotoUrl?: string;
  proposalSentToSchool?: string;
  createdAt?: unknown;
}

/** Extra data written alongside CRM activities for timeline display */
export interface WalkInExtraData {
  typeOfWalkIn: string;
  walkInStatus: string;
  activityType: string;
  followUpDate: string;
  notes: string;
  refusedEntryReason?: string;
  statusFrontDesk?: string;
  studentStrength?: string;
  schoolFees?: string;
  boardOfSchool?: string;
  proposalSentToSchool?: string;
  picName?: string;
  picDesignation?: string;
  picPhone?: string;
  picEmail?: string;
  picAppointmentDate?: string;
  statusPIC?: string;
  proposalSentToPIC?: string;
  principalAppointmentDate?: string;
  seminarAppointmentDate?: string;
  statusPrincipal?: string;
  principalName?: string;
  principalPhone?: string;
  proposalSentToPrincipal?: string;
}

/** A meeting recording stored in Firestore `meetingRecordings` */
export interface MeetingRecording {
  id: string;
  executiveId: string;
  storageUrl: string;
  duration: number;
  timestamp?: { toDate: () => Date };
  pushedToLS?: boolean;
  mappedActivityId?: string;
  mappedSchoolName?: string;
}

// ─── Firestore Documents ─────────────────────────────────────────────────────

/** users/{userId} */
export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  employeeId?: string;
  regionId: string;
  managerId?: string;
  active: boolean;
}

/** schools/{schoolId} */
export interface School {
  id: string;
  name: string;
  type: string;
  address: string;
  district: string;
  city: string;
  state: string;
  lat: number;
  lng: number;
  principalName: string;
  principalPhone: string;
  alternateContact: string;
  grade12Count: number;
  totalStrength: number;
  streamsOffered: string[];
}

/** A single GPS ping in dailyTracks */
export interface LocationPing {
  lat: number;
  lng: number;
  accuracy: number;
  timestamp: number;
}

/** A detected stop in dailyTracks */
export interface DetectedStop {
  lat: number;
  lng: number;
  arrivedAt: number;
  departedAt: number;
  classification: StopClassification;
  matchedSchoolId?: string;
  matchedSchoolName?: string;
}

/** dailyTracks/{userId}_{yyyyMMdd}
 *  Pings are stored in a subcollection: dailyTracks/{docId}/locations/{timestamp}
 *  NOT as a top-level array on this document.
 *  `lastPing` is a Firestore ServerTimestamp — typed as `unknown` here to avoid
 *  platform-specific Firebase SDK imports. Consumers should cast as needed. */
export interface DailyTrack {
  id: string;
  userId: string;
  date: string;
  status?: 'active' | 'ended';
  startTime?: number;
  endTime?: number;
  lastPing?: unknown;
}

// ─── Task / Appointment Types ────────────────────────────────────────────────

/** `completedAt` is a Firestore ServerTimestamp — typed as `unknown` here.
 *  Consumers should cast to their SDK's Timestamp type. */
export interface Task {
  id: string;
  executiveId: string;
  status: 'pending' | 'completed';
  date?: string;
  type?: 'seminar' | 'follow-up';
  schoolName?: string;
  completedAt?: unknown;
}

// ─── Pipeline Types ──────────────────────────────────────────────────────────

export const STAGES = [
  { key: 'Refused Entry - RE', short: 'RE', label: 'Refused Entry', color: 'bg-red-500', lightColor: 'bg-red-50 border-red-200', textColor: 'text-red-700', cardBorder: 'border-l-red-500' },
  { key: 'Front Desk Interaction - FDI', short: 'FDI', label: 'Front Desk', color: 'bg-amber-500', lightColor: 'bg-amber-50 border-amber-200', textColor: 'text-amber-700', cardBorder: 'border-l-amber-500' },
  { key: 'PIC Interaction - PCI', short: 'PCI', label: 'PIC Interaction', color: 'bg-blue-500', lightColor: 'bg-blue-50 border-blue-200', textColor: 'text-blue-700', cardBorder: 'border-l-blue-500' },
  { key: 'Principal Interaction - PI', short: 'PI', label: 'Principal', color: 'bg-indigo-500', lightColor: 'bg-indigo-50 border-indigo-200', textColor: 'text-indigo-700', cardBorder: 'border-l-indigo-500' },
  { key: 'Seminar Confirmed', short: 'SC', label: 'Seminar', color: 'bg-emerald-500', lightColor: 'bg-emerald-50 border-emerald-200', textColor: 'text-emerald-700', cardBorder: 'border-l-emerald-500' },
] as const;

export type Stage = typeof STAGES[number];

export function getStageIndex(walkInStatus: string): number {
  if (!walkInStatus) return -1;
  return STAGES.findIndex(s => walkInStatus.includes(s.short) || walkInStatus.includes(s.key));
}

export interface SchoolPipelineEntry {
  schoolName: string;
  lsqLeadId: string;
  latestActivity: CrmActivity | null;
  stageIndex: number;
  visitCount: number;
  lastVisitDate: string;
  executiveName: string;
  executiveEmail: string;
  seminarDate?: string;
  followUpDate?: string;
  prospectStage?: string;
  source?: string;
  modifiedOn?: string;
}
