import firestore from '@react-native-firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type LogLevel = 'info' | 'warn' | 'error';

class RemoteLogger {
  private async getUserId(): Promise<string> {
    try {
      const authStr = await AsyncStorage.getItem('auth-storage');
      if (authStr) {
        const authData = JSON.parse(authStr);
        return authData?.state?.user?.id || 'unknown_user';
      }
    } catch {
      // Ignore
    }
    return 'unknown_user';
  }

  private async pushLog(level: LogLevel, message: string, metadata?: any) {
    // 1. Always console.log locally for debugging
    const logStr = `[${level.toUpperCase()}] ${message}`;
    if (level === 'error') console.error(logStr, metadata || '');
    else if (level === 'warn') console.warn(logStr, metadata || '');
    else console.log(logStr, metadata || '');

    // 2. Push to Firestore
    try {
      const associateId = await this.getUserId();
      await firestore().collection('system_logs').add({
        associateId,
        level,
        message,
        metadata: metadata ? JSON.stringify(metadata) : null,
        timestamp: firestore.FieldValue.serverTimestamp(),
        source: 'mobile',
      });
    } catch (e) {
      // Do not use logger here to avoid infinite loops if Firestore fails
      console.error('[LOGGER] Failed to push remote log', e);
    }
  }

  public info(message: string, metadata?: any) {
    this.pushLog('info', message, metadata);
  }

  public warn(message: string, metadata?: any) {
    this.pushLog('warn', message, metadata);
  }

  public error(message: string, metadata?: any) {
    this.pushLog('error', message, metadata);
  }
}

export const logger = new RemoteLogger();
