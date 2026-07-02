import { motionDetector } from './motionDetector';
import { locationTracker, LocationPoint } from './locationTracker';
import { School, StopClassification } from '../types';
import { haversineDistance } from '../services/firestore'; // Reusing this

export interface VisitEvent {
  type: StopClassification;
  schoolId?: string;
  schoolName?: string;
  location: { lat: number; lng: number };
  arrivedAt: number;
  departedAt: number;
  durationMinutes: number;
  manuallyTagged: boolean;
  notes?: string;
}

type ClassificationPromptCallback = (event: VisitEvent, resolve: (result: { type: StopClassification, notes?: string }) => void) => void;
type SchoolMatchCallback = (school: School | null) => void;

class VisitTracker {
  private schools: School[] = [];
  private unsubscribeMotion: (() => void) | null = null;
  private unsubscribeLocation: (() => void) | null = null;
  
  private lastMovingPoint: LocationPoint | null = null;
  private stopStartTime: number | null = null;
  private stopLocation: { lat: number; lng: number } | null = null;
  
  private promptCallback: ClassificationPromptCallback | null = null;
  private schoolMatchCallback: SchoolMatchCallback | null = null;
  
  private visitListeners: Set<(visit: VisitEvent) => void> = new Set();
  
  private activeSchoolMatch: School | null = null;
  private isTracking: boolean = false;

  public setSchools(schools: School[]) {
    this.schools = schools;
  }

  public setPromptCallback(callback: ClassificationPromptCallback) {
    this.promptCallback = callback;
  }

  public setSchoolMatchCallback(callback: SchoolMatchCallback) {
    this.schoolMatchCallback = callback;
  }

  public subscribeToVisits(listener: (visit: VisitEvent) => void): () => void {
    this.visitListeners.add(listener);
    return () => this.visitListeners.delete(listener);
  }

  public start() {
    if (this.isTracking) return;
    this.isTracking = true;

    this.unsubscribeLocation = locationTracker.subscribe((points) => {
      if (points.length > 0) {
        this.lastMovingPoint = points[points.length - 1];
        
        // If we are currently stopped, update stop location with the latest accurate point
        if (this.stopStartTime && this.stopLocation === null) {
          this.stopLocation = { lat: this.lastMovingPoint.lat, lng: this.lastMovingPoint.lng };
          this.checkGeofences(this.stopLocation);
        }
      }
    });

    this.unsubscribeMotion = motionDetector.subscribe((state) => {
      if (state === 'STATIONARY') {
        if (!this.stopStartTime) {
          this.stopStartTime = Date.now();
          if (this.lastMovingPoint) {
            this.stopLocation = { lat: this.lastMovingPoint.lat, lng: this.lastMovingPoint.lng };
            this.checkGeofences(this.stopLocation);
          }
        }
      } else if (state === 'MOVING') {
        if (this.stopStartTime) {
          this.evaluateStop(this.stopStartTime, Date.now());
          this.stopStartTime = null;
          this.stopLocation = null;
          this.setActiveSchoolMatch(null);
        }
      }
    });
  }

  public stop() {
    if (!this.isTracking) return;
    this.isTracking = false;

    if (this.unsubscribeMotion) {
      this.unsubscribeMotion();
      this.unsubscribeMotion = null;
    }
    if (this.unsubscribeLocation) {
      this.unsubscribeLocation();
      this.unsubscribeLocation = null;
    }
    this.stopStartTime = null;
    this.stopLocation = null;
    this.setActiveSchoolMatch(null);
  }

  private checkGeofences(loc: { lat: number; lng: number }) {
    // Basic geofencing: 200m radius
    const RADIUS_METERS = 200;
    
    for (const school of this.schools) {
      const dist = haversineDistance(loc.lat, loc.lng, school.lat, school.lng);
      if (dist <= RADIUS_METERS) {
        this.setActiveSchoolMatch(school);
        return;
      }
    }
    
    this.setActiveSchoolMatch(null);
  }
  
  private setActiveSchoolMatch(school: School | null) {
    if (this.activeSchoolMatch?.id !== school?.id) {
      this.activeSchoolMatch = school;
      if (this.schoolMatchCallback) {
        this.schoolMatchCallback(school);
      }
    }
  }

  private async evaluateStop(arrivedAt: number, departedAt: number) {
    if (!this.stopLocation) return;

    const durationMinutes = (departedAt - arrivedAt) / 60000;
    const isShortStop = durationMinutes < 1.5; // ~90 seconds

    const baseEvent: VisitEvent = {
      type: 'unclassified',
      location: this.stopLocation,
      arrivedAt,
      departedAt,
      durationMinutes,
      manuallyTagged: false,
    };

    if (this.activeSchoolMatch) {
      // Auto-tag as school visit
      const visit: VisitEvent = {
        ...baseEvent,
        type: 'school',
        schoolId: this.activeSchoolMatch.id,
        schoolName: this.activeSchoolMatch.name,
      };
      this.emitVisit(visit);
    } else if (isShortStop) {
      // Silently auto-tag as break
      const visit: VisitEvent = {
        ...baseEvent,
        type: 'break',
      };
      this.emitVisit(visit);
    } else {
      // Long unclassified stop -> prompt user
      if (this.promptCallback) {
        this.promptCallback(baseEvent, (result) => {
          const visit: VisitEvent = {
            ...baseEvent,
            type: result.type,
            notes: result.notes,
            manuallyTagged: true,
          };
          this.emitVisit(visit);
        });
      } else {
        this.emitVisit(baseEvent);
      }
    }
  }

  private emitVisit(visit: VisitEvent) {
    this.visitListeners.forEach(l => l(visit));
  }
}

export const visitTracker = new VisitTracker();
