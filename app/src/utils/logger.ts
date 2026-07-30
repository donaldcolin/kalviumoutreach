import firestore from '@react-native-firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import auth from '@react-native-firebase/auth';

export type LogLevel = 'info' | 'warn' | 'error';

interface LogEntry {
  level: LogLevel;
  message: string;
  metadata?: unknown;
  timestamp: Date;
}

class RemoteLogger {
  private logBuffer: LogEntry[] = [];
  private flushInterval: ReturnType<typeof setInterval> | null = null;
  private readonly FLUSH_INTERVAL_MS = 120000; // Flush every 2 minutes

  constructor() {
    this.startFlushTimer();
  }

  private startFlushTimer() {
    if (this.flushInterval) return;
    this.flushInterval = setInterval(() => {
      this.flushLogs();
    }, this.FLUSH_INTERVAL_MS);
  }

  private async getUserId(): Promise<string> {
    try {
      const currentUser = auth().currentUser;
      if (currentUser) {
        return currentUser.uid;
      }
    } catch {
      // Ignore
    }
    return 'unknown_user';
  }

  private async flushLogs() {
    if (this.logBuffer.length === 0) return;

    // Take a snapshot of the current buffer and clear it
    const logsToFlush = [...this.logBuffer];
    this.logBuffer = [];

    try {
      const associateId = await this.getUserId();
      
      if (associateId === 'unknown_user') {
        return; // Discard logs if user is not authenticated
      }

      const db = firestore();
      const batch = db.batch();
      const systemLogsRef = db.collection('system_logs');
      
      // Limit to 500 logs per batch (Firestore's maximum batch size limit)
      const maxLogs = logsToFlush.slice(0, 500);

      for (const log of maxLogs) {
        const docRef = systemLogsRef.doc(); // Auto-generate ID
        batch.set(docRef, {
          associateId,
          level: log.level,
          message: log.message,
          metadata: log.metadata ? JSON.stringify(log.metadata) : null,
          timestamp: firestore.Timestamp.fromDate(log.timestamp),
          source: 'mobile',
        });
      }

      await batch.commit();
    } catch (e) {
      console.warn('[LOGGER] Failed to push remote log batch', e);
    }
  }

  private pushLog(level: LogLevel, message: string, metadata?: unknown) {
    // 1. Always console.log locally for debugging
    const logStr = `[${level.toUpperCase()}] ${message}`;
    if (level === 'error') console.error(logStr, metadata || '');
    else if (level === 'warn') console.warn(logStr, metadata || '');
    else console.log(logStr, metadata || '');

    // 2. Push to local memory buffer instead of Firestore
    this.logBuffer.push({
      level,
      message,
      metadata,
      timestamp: new Date() // Use local time for the batch
    });

    // 3. Prevent memory leaks: Flush immediately if buffer gets too large
    if (this.logBuffer.length >= 100) {
      this.flushLogs();
    }
  }

  // Optional helper to flush manually (e.g., when app goes to background)
  public forceFlush() {
    this.flushLogs();
  }

  public info(message: string, metadata?: unknown) {
    this.pushLog('info', message, metadata);
  }

  public warn(message: string, metadata?: unknown) {
    this.pushLog('warn', message, metadata);
  }

  public error(message: string, metadata?: unknown) {
    this.pushLog('error', message, metadata);
  }
}

export const logger = new RemoteLogger();
