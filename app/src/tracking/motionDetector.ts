import { Accelerometer } from 'expo-sensors';
import { Subscription } from 'expo-sensors/build/DeviceSensor';

export type MotionState = 'STATIONARY' | 'POSSIBLY_STOPPED' | 'MOVING';

export type MotionStateListener = (state: MotionState) => void;

const MOVING_THRESHOLD = 1.3; // g-force
const STATIONARY_THRESHOLD = 1.1; // g-force
const POSSIBLY_STOPPED_DEBOUNCE_MS = 30000; // 30 seconds (reduced from 60s)

class MotionDetector {
  private currentState: MotionState = 'STATIONARY';
  private listeners: Set<MotionStateListener> = new Set();
  private subscription: Subscription | null = null;
  private possiblyStoppedTimeout: ReturnType<typeof setTimeout> | null = null;

  public subscribe(listener: MotionStateListener): () => void {
    this.listeners.add(listener);
    // Emit current state immediately
    listener(this.currentState);
    return () => {
      this.listeners.delete(listener);
    };
  }

  public start() {
    if (this.subscription) return;
    
    // Check every 1000ms (1 second) to save battery while still being responsive
    Accelerometer.setUpdateInterval(1000);

    this.subscription = Accelerometer.addListener(({ x, y, z }) => {
      // Calculate magnitude of acceleration vector (1g is resting gravity)
      const magnitude = Math.sqrt(x * x + y * y + z * z);
      
      if (magnitude >= MOVING_THRESHOLD) {
        this.handleMotionDetected();
      } else if (magnitude <= STATIONARY_THRESHOLD) {
        this.handleStationaryDetected();
      }
    });
  }

  public stop() {
    if (this.subscription) {
      this.subscription.remove();
      this.subscription = null;
    }
    this.clearTimeout();
    this.setState('STATIONARY');
  }

  private handleMotionDetected() {
    this.clearTimeout();
    
    if (this.currentState !== 'MOVING') {
      this.setState('MOVING');
    }
  }

  private handleStationaryDetected() {
    if (this.currentState === 'MOVING') {
      this.setState('POSSIBLY_STOPPED');
      
      this.possiblyStoppedTimeout = setTimeout(() => {
        if (this.currentState === 'POSSIBLY_STOPPED') {
          this.setState('STATIONARY');
        }
      }, POSSIBLY_STOPPED_DEBOUNCE_MS);
    }
  }

  private setState(newState: MotionState) {
    if (this.currentState !== newState) {
      this.currentState = newState;
      this.listeners.forEach(l => l(newState));
    }
  }

  private clearTimeout() {
    if (this.possiblyStoppedTimeout) {
      clearTimeout(this.possiblyStoppedTimeout);
      this.possiblyStoppedTimeout = null;
    }
  }
}

export const motionDetector = new MotionDetector();
