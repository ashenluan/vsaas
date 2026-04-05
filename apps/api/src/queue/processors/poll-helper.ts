import { Logger } from '@nestjs/common';
import { WsGateway } from '../../ws/ws.gateway';

export interface PollOptions {
  /** Milliseconds between polls */
  interval: number;
  /** Maximum number of poll attempts */
  maxAttempts: number;
  /** Function to check task status */
  checkStatus: (taskId: string) => Promise<any>;
  /** Normalize status string from provider response */
  normalizeStatus: (status: any) => string;
  /** Extract result from successful status response */
  extractResult: (status: any) => any;
  /** Extract error message from failed status response */
  extractError: (status: any) => string;
  /** WebSocket gateway for progress updates */
  ws?: WsGateway;
  /** User ID for WebSocket targeting */
  userId?: string;
  /** Job ID for WebSocket messages */
  jobId?: string;
  /** WebSocket event name */
  wsEvent?: string;
  /** Interval (in attempts) between progress notifications */
  progressInterval?: number;
  /** Build progress message for WS notification */
  buildProgressMessage?: (attempt: number, maxAttempts: number) => { message: string; progress?: number };
  /** Logger instance */
  logger?: Logger;
  /** Task description for timeout error */
  timeoutMessage?: string;
}

/**
 * Shared polling utility for async provider tasks.
 * Replaces duplicate for-loop+setTimeout patterns across processors.
 */
export async function pollTaskStatus(taskId: string, options: PollOptions): Promise<any> {
  const {
    interval,
    maxAttempts,
    checkStatus,
    normalizeStatus,
    extractResult,
    extractError,
    ws,
    userId,
    jobId,
    wsEvent = 'job:update',
    progressInterval = 6,
    buildProgressMessage,
    logger,
    timeoutMessage = 'Task timed out',
  } = options;

  for (let i = 0; i < maxAttempts; i++) {
    await new Promise((r) => setTimeout(r, interval));

    try {
      const status = await checkStatus(taskId);
      const normalized = normalizeStatus(status);

      if (normalized === 'SUCCEEDED' || normalized === 'COMPLETED') {
        return extractResult(status);
      }
      if (normalized === 'FAILED') {
        throw new Error(extractError(status));
      }
      if (normalized === 'CANCELED' || normalized === 'CANCELLED') {
        throw new Error('任务已被取消');
      }
      if (normalized === 'UNKNOWN') {
        throw new Error('任务已过期或不存在，请重新提交');
      }

      // Send progress updates
      if (ws && userId && jobId && i > 0 && i % progressInterval === 0) {
        const progressData = buildProgressMessage
          ? buildProgressMessage(i, maxAttempts)
          : { message: `处理中... (${Math.round((i * interval) / 60000)}分钟)` };

        ws.sendToUser(userId, wsEvent, {
          jobId,
          status: 'PROCESSING',
          ...progressData,
        });
      }
    } catch (error: any) {
      // Re-throw known errors (from status checks above)
      if (error.message.includes('失败') || error.message.includes('取消') || error.message.includes('过期')) {
        throw error;
      }
      // Log and continue for transient network errors
      if (logger) {
        logger.warn(`Poll attempt ${i + 1} failed for task ${taskId}: ${error.message}`);
      }
    }
  }

  throw new Error(timeoutMessage);
}
