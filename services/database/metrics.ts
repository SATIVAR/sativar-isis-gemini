import databaseService from './index';
import { fallbackManager } from './fallbackManager';
import logger from '../../utils/logger';
import type { SystemMetrics } from './types';

class MetricsCollector {
  private static instance: MetricsCollector;
  private lastSyncTime?: Date;
  private rollingErrors: number[] = [];
  private rollingResponseTimes: number[] = [];

  static getInstance(): MetricsCollector {
    if (!MetricsCollector.instance) {
      MetricsCollector.instance = new MetricsCollector();
    }
    return MetricsCollector.instance;
  }

  markSyncCompleted(): void {
    this.lastSyncTime = new Date();
  }

  markError(): void {
    const now = Date.now();
    this.rollingErrors.push(now);
    // keep last 15 minutes
    const cutoff = now - 15 * 60 * 1000;
    this.rollingErrors = this.rollingErrors.filter(ts => ts >= cutoff);
  }

  markResponseTime(durationMs: number): void {
    this.rollingResponseTimes.push(durationMs);
    if (this.rollingResponseTimes.length > 1000) {
      this.rollingResponseTimes.shift();
    }
  }

  getMetrics(): SystemMetrics {
    const queueSize = fallbackManager.getOperationQueue().length;
    const averageResponseTimeMs = this.rollingResponseTimes.length
      ? Math.round(this.rollingResponseTimes.reduce((a, b) => a + b, 0) / this.rollingResponseTimes.length)
      : undefined;

    // best-effort database connection count via internal service if available
    let databaseConnections = 0;
    try {
      // @ts-expect-error access pool internals if present
      databaseConnections = databaseService['pool']?.totalCount ?? 0;
    } catch (e) {
      logger.debug('Pool totalCount not available');
    }

    const errorRate = this.rollingErrors.length / (15 * 60); // approx errors per second over last 15 min

    return {
      databaseConnections,
      syncQueueSize: queueSize,
      lastSyncTime: this.lastSyncTime,
      errorRate,
      averageResponseTimeMs,
    };
  }
}

export const metrics = MetricsCollector.getInstance();


