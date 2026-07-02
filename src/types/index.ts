// ─── Enums & Literal Types ───────────────────────────────────────────────────

export type UserRole = 'executive' | 'teamLead' | 'regionalManager' | 'admin';

export type VisitStatus = 'inProgress' | 'completed';

export type AppointmentStatus =
  | 'Requested'
  | 'Tentative'
  | 'Confirmed'
  | 'Completed'
  | 'Cancelled'
  | 'Rescheduled';

export type AppointmentMode = 'offline' | 'online' | 'hybrid';

export type StopClassification = 'school' | 'teashop' | 'park' | 'break' | 'unclassified';

export type SyncStatus = 'synced' | 'pending' | 'failed';

export type ExecutiveStatus = 'idle' | 'inVisit' | 'inMeeting';

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
  managerId?: string; // Links associate to their TL/BDM
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

/** visits/{visitId} */
export interface Visit {
  id: string;
  executiveId: string;
  schoolId: string;
  schoolName: string; // denormalized for quick display
  checkInLat: number;
  checkInLng: number;
  gpsAccuracy: number;
  timestamp: number; // epoch ms
  deviceId: string;
  networkType: string;
  batteryPercent: number;
  mockLocationFlag: boolean;
  rootDetectedFlag: boolean;
  photoOriginalUrl: string;
  photoWatermarkedUrl: string;
  photoLocalUri: string; // local path before upload
  watermarkedLocalUri: string;
  status: VisitStatus;
  syncedToCrm: boolean;
  createdAt: number;
  updatedAt: number;
}

/** meetings/{meetingId} */
export interface Meeting {
  id: string;
  visitId: string;
  executiveId: string;
  sessionId: string;
  startTimestamp: number;
  endTimestamp: number;
  recordingUrl: string;
  recordingLocalUri: string;
  recordingHash?: string; // SHA-256 (deprecated)
  outcome: string;
  seminarInterest: boolean;
  interestedStudentCount: number;
  principalFeedback: string;
  followUpDate: string; // ISO date string
  remarks: string;
  syncedToCrm: boolean;
  createdAt: number;
  updatedAt: number;
}

/** appointments/{appointmentId} */
export interface Appointment {
  id: string;
  visitId: string;
  executiveId: string;
  schoolId: string;
  proposedDate: string; // ISO date string
  timeSlot: string;
  expectedStudentCount: number;
  grade: string;
  stream: string;
  mode: AppointmentMode;
  infrastructure: {
    projector: boolean;
    lab: boolean;
  };
  additionalRequirements: string;
  principalConfirmationStatus: string;
  status: AppointmentStatus;
  createdAt: number;
  updatedAt: number;
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

/** dailyTracks/{executiveId}_{yyyyMMdd} */
export interface DailyTrack {
  id: string;
  executiveId: string;
  date: string; // yyyyMMdd
  status?: 'active' | 'ended';
  pings: LocationPing[];
  stops: DetectedStop[];
}

// ─── Sync Queue Types ────────────────────────────────────────────────────────

export type SyncItemType = 'photo' | 'recording' | 'crmVisit' | 'crmMeeting' | 'crmAppointment';

export interface SyncQueueItem {
  id: string;
  type: SyncItemType;
  referenceId: string; // visit/meeting/appointment ID
  localUri?: string;
  remotePath?: string;
  attempts: number;
  maxAttempts: number;
  lastAttempt: number;
  status: SyncStatus;
  error?: string;
  createdAt: number;
}

// ─── CRM Types ───────────────────────────────────────────────────────────────

export interface CrmResponse {
  success: boolean;
  message: string;
  externalId?: string;
}

export const CRM_ACTIVITY_TYPES = {
  SCHOOL_VISIT: 'SchoolVisit',
  PRINCIPAL_MEETING: 'PrincipalMeeting',
  SEMINAR_APPOINTMENT: 'SeminarAppointment',
  FOLLOW_UP: 'FollowUp',
} as const;

// ─── Navigation Types ────────────────────────────────────────────────────────

export type AuthStackParamList = {
  Login: undefined;
  OTP: { phoneNumber: string; confirmation: unknown };
};

export type ExecutiveTabParamList = {
  Dashboard: undefined;
  Visits: undefined;
  SyncQueue: undefined;
  Profile: undefined;
};

export type VisitStackParamList = {
  SchoolSearch: undefined;
  AddSchool: undefined;
  CheckIn: { schoolId: string; schoolName: string };
  VisitDetail: { visitId: string };
  Meeting: { visitId: string };
  MeetingOutcome: { meetingId: string; visitId: string };
  Appointment: { visitId: string; schoolId: string };
};


