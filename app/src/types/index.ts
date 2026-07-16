// ─── Enums & Literal Types ───────────────────────────────────────────────────

export type UserRole = 'executive' | 'teamLead' | 'regionalManager' | 'admin';

export type StopClassification = 'school' | 'teashop' | 'park' | 'break' | 'unclassified';



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

// ─── Sync Queue Types Removed ────────────────────────────────────────────────
// ─── CRM Types Removed ───────────────────────────────────────────────────────

// ─── Navigation Types ────────────────────────────────────────────────────────

export type AuthStackParamList = {
  Login: undefined;
  OTP: { phoneNumber: string; confirmation: unknown };
};

export type ExecutiveTabParamList = {
  Dashboard: undefined;
  Tasks: undefined;
  Notes: undefined;
  Profile: undefined;
  Leads: undefined;
};

export type ExecutiveStackParamList = {
  ExecutiveTabs: undefined;
  Profile: undefined;
  ActivityForm: { leadId: string; leadName: string };
};

// Removed VisitStackParamList as visits are handled via CRM now


