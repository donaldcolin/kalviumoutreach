// ─── Re-export Shared Domain Types ─────────────────────────────────────────────

export * from '@kalvium-outreach/shared';

// ─── React Navigation Types (App Only) ───────────────────────────────────────

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
  LeadDetail: { leadId: string; leadName: string };
  ActivityForm: { leadId: string; leadName: string; resumeWalkIn?: boolean; startLocation?: { lat: number; lng: number } | null; startTime?: string };
};

// Removed VisitStackParamList as visits are handled via CRM now
