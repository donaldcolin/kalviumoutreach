/**
 * LeadSquared CRM Service — stubbed behind an interface.
 * Real integration credentials come later; app logic won't need to change.
 */
import type { Visit, Meeting, Appointment, School, CrmResponse } from '../types';
import { CRM_ACTIVITY_TYPES } from '../types';

// ─── Interface ───────────────────────────────────────────────────────────────

export interface ICrmService {
  /** Push a school visit activity to the CRM. */
  pushVisitActivity(visit: Visit): Promise<CrmResponse>;

  /** Push a principal meeting activity to the CRM. */
  pushMeetingActivity(meeting: Meeting): Promise<CrmResponse>;

  /** Push a seminar appointment to the CRM. */
  pushAppointment(appointment: Appointment): Promise<CrmResponse>;

  /** Sync a school as a lead/prospect in the CRM. */
  syncLead(school: School): Promise<CrmResponse>;

  /** Check if the CRM service is configured (has valid credentials). */
  isConfigured(): boolean;
}

// ─── Stub Implementation ─────────────────────────────────────────────────────

/**
 * Stub CRM service that logs calls and returns success.
 * Replace with LeadSquaredCrmService when credentials are available.
 */
class StubCrmService implements ICrmService {
  async pushVisitActivity(visit: Visit): Promise<CrmResponse> {
    console.log(
      `[CRM Stub] pushVisitActivity: ${CRM_ACTIVITY_TYPES.SCHOOL_VISIT}`,
      { visitId: visit.id, schoolId: visit.schoolId },
    );
    return { success: true, message: 'Stub: visit activity logged' };
  }

  async pushMeetingActivity(meeting: Meeting): Promise<CrmResponse> {
    console.log(
      `[CRM Stub] pushMeetingActivity: ${CRM_ACTIVITY_TYPES.PRINCIPAL_MEETING}`,
      { meetingId: meeting.id, visitId: meeting.visitId },
    );
    return { success: true, message: 'Stub: meeting activity logged' };
  }

  async pushAppointment(appointment: Appointment): Promise<CrmResponse> {
    console.log(
      `[CRM Stub] pushAppointment: ${CRM_ACTIVITY_TYPES.SEMINAR_APPOINTMENT}`,
      { appointmentId: appointment.id, schoolId: appointment.schoolId },
    );
    return { success: true, message: 'Stub: appointment logged' };
  }

  async syncLead(school: School): Promise<CrmResponse> {
    console.log('[CRM Stub] syncLead', {
      schoolId: school.id,
      name: school.name,
    });
    return { success: true, message: 'Stub: lead synced' };
  }

  isConfigured(): boolean {
    return false; // Stub is never "configured" — signals to UI that CRM is in stub mode
  }
}

// ─── LeadSquared Implementation (skeleton) ───────────────────────────────────

/**
 * Real LeadSquared REST API v2 implementation.
 * Uncomment and configure when credentials are available.
 */
class LeadSquaredCrmService implements ICrmService {
  private host: string;
  private accessKey: string;
  private secretKey: string;

  constructor(host: string, accessKey: string, secretKey: string) {
    this.host = host;
    this.accessKey = accessKey;
    this.secretKey = secretKey;
  }

  private get baseUrl(): string {
    return `https://${this.host}/v2`;
  }

  private get authParams(): string {
    return `accessKey=${this.accessKey}&secretKey=${this.secretKey}`;
  }

  private async apiCall(
    endpoint: string,
    method: 'GET' | 'POST',
    body?: unknown,
  ): Promise<unknown> {
    const url = `${this.baseUrl}${endpoint}?${this.authParams}`;
    const response = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    });
    return response.json();
  }

  async pushVisitActivity(visit: Visit): Promise<CrmResponse> {
    try {
      const payload = {
        RelatedProspectId: visit.schoolId,
        ActivityEvent: 201, // School Visit
        ActivityNote: `Visit to ${visit.schoolName}`,
        Fields: [
          { SchemaName: 'mx_CheckInLat', Value: String(visit.checkInLat) },
          { SchemaName: 'mx_CheckInLng', Value: String(visit.checkInLng) },
          { SchemaName: 'mx_GPSAccuracy', Value: String(visit.gpsAccuracy) },
          { SchemaName: 'mx_MockLocation', Value: String(visit.mockLocationFlag) },
        ],
      };
      await this.apiCall('/ProspectActivity.svc/Create', 'POST', payload);
      return { success: true, message: 'Visit synced to LeadSquared' };
    } catch (err) {
      return {
        success: false,
        message: `CRM sync failed: ${err instanceof Error ? err.message : 'Unknown error'}`,
      };
    }
  }

  async pushMeetingActivity(meeting: Meeting): Promise<CrmResponse> {
    try {
      const payload = {
        ActivityEvent: 202, // Principal Meeting
        ActivityNote: `Meeting outcome: ${meeting.outcome}`,
        Fields: [
          { SchemaName: 'mx_SeminarInterest', Value: String(meeting.seminarInterest) },
          { SchemaName: 'mx_StudentCount', Value: String(meeting.interestedStudentCount) },
          { SchemaName: 'mx_FollowUpDate', Value: meeting.followUpDate },
        ],
      };
      await this.apiCall('/ProspectActivity.svc/Create', 'POST', payload);
      return { success: true, message: 'Meeting synced to LeadSquared' };
    } catch (err) {
      return {
        success: false,
        message: `CRM sync failed: ${err instanceof Error ? err.message : 'Unknown error'}`,
      };
    }
  }

  async pushAppointment(appointment: Appointment): Promise<CrmResponse> {
    try {
      const payload = {
        ActivityEvent: 203, // Seminar Appointment
        Fields: [
          { SchemaName: 'mx_ProposedDate', Value: appointment.proposedDate },
          { SchemaName: 'mx_TimeSlot', Value: appointment.timeSlot },
          { SchemaName: 'mx_ExpectedStudents', Value: String(appointment.expectedStudentCount) },
          { SchemaName: 'mx_Mode', Value: appointment.mode },
        ],
      };
      await this.apiCall('/ProspectActivity.svc/Create', 'POST', payload);
      return { success: true, message: 'Appointment synced to LeadSquared' };
    } catch (err) {
      return {
        success: false,
        message: `CRM sync failed: ${err instanceof Error ? err.message : 'Unknown error'}`,
      };
    }
  }

  async syncLead(school: School): Promise<CrmResponse> {
    try {
      const payload = [
        { Attribute: 'Company', Value: school.name },
        { Attribute: 'mx_City', Value: school.city },
        { Attribute: 'mx_State', Value: school.state },
        { Attribute: 'Phone', Value: school.principalPhone },
        { Attribute: 'mx_PrincipalName', Value: school.principalName },
      ];
      await this.apiCall('/LeadManagement.svc/Lead.Create', 'POST', payload);
      return { success: true, message: 'Lead synced to LeadSquared' };
    } catch (err) {
      return {
        success: false,
        message: `CRM sync failed: ${err instanceof Error ? err.message : 'Unknown error'}`,
      };
    }
  }

  isConfigured(): boolean {
    return !!(this.host && this.accessKey && this.secretKey);
  }
}

// ─── Factory ─────────────────────────────────────────────────────────────────

/**
 * Create a CRM service instance.
 * Returns the real LeadSquared client if credentials are configured,
 * otherwise returns the stub.
 */
export function createCrmService(): ICrmService {
  const host = process.env.EXPO_PUBLIC_LEADSQUARED_HOST;
  const accessKey = process.env.EXPO_PUBLIC_LEADSQUARED_ACCESS_KEY;
  const secretKey = process.env.EXPO_PUBLIC_LEADSQUARED_SECRET_KEY;

  if (host && accessKey && secretKey) {
    return new LeadSquaredCrmService(host, accessKey, secretKey);
  }

  console.log('[CRM] No credentials configured — using stub service');
  return new StubCrmService();
}

/** Singleton CRM service instance. */
export const crmService: ICrmService = createCrmService();
