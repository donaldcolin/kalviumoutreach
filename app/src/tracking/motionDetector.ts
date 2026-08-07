import { Accelerometer, Pedometer } from 'expo-sensors';
import { Subscription } from 'expo-sensors/build/DeviceSensor';

export type MotionState = 'STATIONARY' | 'POSSIBLY_STOPPED' | 'MOVING';

export type MotionStateListener = (state: MotionState) => void;

// ─── Motion Detection Thresholds ─────────────────────────────────────────────
// Accelerometer magnitude at rest (phone flat on table) ≈ 1.0g (pure gravity).
// Walking produces ~1.1–1.3g; running ~1.5g+; smooth car ride ~1.0–1.05g.
//
// We want to detect walking as MOVING (it's a field sales tracking app),
// so the threshold is set just above resting gravity.
const MOVING_THRESHOLD = 1.12; // g-force — catches walking, running, auto/car
const STATIONARY_THRESHOLD = 1.03; // g-force — only truly still triggers this
const POSSIBLY_STOPPED_DEBOUNCE_MS = 60000; // 60 seconds — don't drop to stationary too quickly (traffic lights, brief stops)

// ─── Tiered Accelerometer Polling Intervals ──────────────────────────────────
// Battery optimization: reduce CPU wakeups when we don't need fast detection.
// MOVING: 1s — need responsive detection for walk/stop transitions
// POSSIBLY_STOPPED: 3s — moderate check rate during the 60s grace period
// STATIONARY: only used briefly before switching to pedometer wake gate
const ACCEL_INTERVAL_MOVING_MS = 5000;
const ACCEL_INTERVAL_POSSIBLY_STOPPED_MS = 5000;
const ACCEL_INTERVAL_STATIONARY_MS = 10000;

// ─── Pedometer Wake Gate ─────────────────────────────────────────────────────
// When STATIONARY, we stop the accelerometer entirely and use the Pedometer
// as a hardware-accelerated wake trigger. Pedometer uses near-zero battery
// because it runs on the device's motion coprocessor (Apple M-series, Android
// step counter HAL). When steps are detected, we restart the accelerometer
// for fine-grained motion classification.
const PEDOMETER_ENGAGE_DELAY_MS = 30000; // 30s after entering STATIONARY, switch to pedometer

class MotionDetector {
  private currentState: MotionState = 'STATIONARY';
  private listeners: Set<MotionStateListener> = new Set();
  private subscription: Subscription | null = null;
  private possiblyStoppedTimeout: ReturnType<typeof setTimeout> | null = null;

  // Pedometer wake gate state
  private pedometerSubscription: Subscription | null = null;
  private pedometerEngageTimeout: ReturnType<typeof setTimeout> | null = null;
  private isPedometerGateActive: boolean = false;
  private isRunning: boolean = false;

  public subscribe(listener: MotionStateListener): () => void {
    this.listeners.add(listener);
    // Emit current state immediately
    listener(this.currentState);
    return () => {
      this.listeners.delete(listener);
    };
  }

  public start() {
    if (this.isRunning) return;
    this.isRunning = true;
    
    // Start with the accelerometer — it will switch to pedometer gate
    // once STATIONARY is confirmed.
    this.startAccelerometer();
  }

  public stop() {
    this.isRunning = false;
    this.stopAccelerometer();
    this.disengagePedometerGate();
    this.clearPossiblyStoppedTimeout();
    this.setState('STATIONARY');
  }

  // ─── Accelerometer Lifecycle ──────────────────────────────────────────────
  private startAccelerometer() {
    if (this.subscription) return;
    
    this.applyAccelInterval();

    this.subscription = Accelerometer.addListener(({ x, y, z }) => {
      const magnitude = Math.sqrt(x * x + y * y + z * z);
      
      if (magnitude >= MOVING_THRESHOLD) {
        this.handleMotionDetected();
      } else if (magnitude <= STATIONARY_THRESHOLD) {
        this.handleStationaryDetected();
      }
    });
  }

  private stopAccelerometer() {
    if (this.subscription) {
      this.subscription.remove();
      this.subscription = null;
    }
  }

  // ─── Pedometer Wake Gate ──────────────────────────────────────────────────
  // Instead of polling the accelerometer at 5s intervals when stationary,
  // we stop the accelerometer completely and use the pedometer as a
  // hardware-level wake trigger. This drops sensor CPU to near-zero.
  private async engagePedometerGate() {
    if (this.isPedometerGateActive) return;

    try {
      // Check if pedometer is available on this device
      const available = await Pedometer.isAvailableAsync();
      if (!available) {
        // Fallback: keep accelerometer running at slow interval
        return;
      }

      this.isPedometerGateActive = true;
      this.stopAccelerometer(); // Stop the CPU-heavy accelerometer

      // Watch for step events — any step means movement started
      this.pedometerSubscription = Pedometer.watchStepCount((_result) => {
        // Steps detected! User is moving. Disengage pedometer and restart
        // accelerometer for fine-grained motion classification.
        this.disengagePedometerGate();
        this.startAccelerometer();
        this.handleMotionDetected();
      });
    } catch (error) {
      // Fallback: keep accelerometer running if pedometer crashes natively
      this.isPedometerGateActive = false;
      return;
    }
  }

  private disengagePedometerGate() {
    if (this.pedometerEngageTimeout) {
      clearTimeout(this.pedometerEngageTimeout);
      this.pedometerEngageTimeout = null;
    }
    if (this.pedometerSubscription) {
      this.pedometerSubscription.remove();
      this.pedometerSubscription = null;
    }
    this.isPedometerGateActive = false;
  }

  private schedulePedometerGate() {
    // Don't schedule if already engaged or pending
    if (this.isPedometerGateActive || this.pedometerEngageTimeout) return;

    this.pedometerEngageTimeout = setTimeout(() => {
      this.pedometerEngageTimeout = null;
      if (this.currentState === 'STATIONARY' && this.isRunning) {
        this.engagePedometerGate();
      }
    }, PEDOMETER_ENGAGE_DELAY_MS);
  }

  // ─── Motion State Handlers ────────────────────────────────────────────────
  private handleMotionDetected() {
    this.clearPossiblyStoppedTimeout();
    this.disengagePedometerGate();
    
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
      // Adjust accelerometer polling rate for the new state
      this.applyAccelInterval();

      // When entering STATIONARY, schedule the pedometer wake gate
      // to replace the accelerometer after 30s of confirmed stillness.
      if (newState === 'STATIONARY') {
        this.schedulePedometerGate();
      }

      this.listeners.forEach(l => l(newState));
    }
  }

  // ─── Tiered Polling ────────────────────────────────────────────────────────
  private applyAccelInterval() {
    // Only apply if accelerometer is actually running
    if (!this.subscription) return;

    let interval: number;
    switch (this.currentState) {
      case 'MOVING':
        interval = ACCEL_INTERVAL_MOVING_MS;
        break;
      case 'POSSIBLY_STOPPED':
        interval = ACCEL_INTERVAL_POSSIBLY_STOPPED_MS;
        break;
      case 'STATIONARY':
      default:
        interval = ACCEL_INTERVAL_STATIONARY_MS;
        break;
    }
    Accelerometer.setUpdateInterval(interval);
  }

  private clearPossiblyStoppedTimeout() {
    if (this.possiblyStoppedTimeout) {
      clearTimeout(this.possiblyStoppedTimeout);
      this.possiblyStoppedTimeout = null;
    }
  }
}

export const motionDetector = new MotionDetector();

