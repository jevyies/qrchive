import { Queue, Worker, Job } from 'bullmq';
import { bullMqConnectionOptions } from '../config/redis';
import {
  sendVerificationEmailDirect,
  sendCustomEmailDirect,
  SendVerificationEmailParams,
  SendCustomEmailParams,
  EmailSendResult,
} from '../services/email.service';

export const EMAIL_QUEUE_NAME = 'email-delivery';

export interface VerificationEmailJobData {
  type: 'verification';
  params: SendVerificationEmailParams;
}

export interface CustomEmailJobData {
  type: 'custom';
  params: SendCustomEmailParams;
}

export type EmailJobData = VerificationEmailJobData | CustomEmailJobData;
export type EmailJobName = 'verification-email' | 'custom-email';

// 1. BullMQ Email Queue Instance
export const emailQueue = new Queue<EmailJobData, any, EmailJobName>(
  EMAIL_QUEUE_NAME,
  {
    connection: bullMqConnectionOptions,
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000, // 2s, 4s, 8s backoff
      },
      removeOnComplete: {
        count: 1000,
      },
      removeOnFail: {
        count: 500,
      },
    },
  }
);

// 2. BullMQ Email Worker Instance (Processes emails in background with concurrency of 5)
export const emailWorker = new Worker<EmailJobData, any, EmailJobName>(
  EMAIL_QUEUE_NAME,
  async (job: Job<EmailJobData>) => {
    const { type, params } = job.data;
    job.log(`[EmailWorker] Processing job ${job.id} (type: ${type}) for ${params.to}`);

    if (type === 'verification') {
      const result = await sendVerificationEmailDirect(params);
      if (!result.success && !result.simulated) {
        throw new Error(result.error || 'Failed to send verification email');
      }
      return result;
    }

    if (type === 'custom') {
      const result = await sendCustomEmailDirect(params);
      if (!result.success && !result.simulated) {
        throw new Error(result.error || 'Failed to send custom email');
      }
      return result;
    }

    throw new Error(`Unknown email job type: ${(job.data as any)?.type}`);
  },
  {
    connection: bullMqConnectionOptions,
    concurrency: 5,
  }
);

emailWorker.on('completed', (job: Job<EmailJobData>) => {
  console.log(`✓ [EmailWorker] Email sent to ${job.data.params.to} (Job ${job.id}, Type: ${job.data.type})`);
});

emailWorker.on('failed', (job: Job<EmailJobData> | undefined, err: Error) => {
  const target = job?.data?.params?.to || 'unknown';
  console.error(`✗ [EmailWorker] Job ${job?.id} to ${target} failed (Attempt ${job?.attemptsMade}):`, err.message);
});

/**
 * Enqueue a verification email job into the Redis BullMQ queue.
 * Falls back to direct SMTP delivery if Redis is unavailable.
 */
export async function enqueueVerificationEmail(
  params: SendVerificationEmailParams
): Promise<EmailSendResult> {
  try {
    const job = await emailQueue.add(
      'verification-email',
      {
        type: 'verification',
        params,
      },
      {
        priority: 1, // High priority for time-sensitive registration/login codes
      }
    );

    console.log(`[EmailQueue] Enqueued verification email for ${params.to} (Job ID: ${job.id})`);
    return {
      success: true,
      delivered: false,
      queued: true,
      jobId: job.id,
      code: params.code,
    };
  } catch (err: any) {
    console.warn(`[EmailQueue] Redis enqueue failed (${err.message}). Falling back to direct SMTP delivery...`);
    return await sendVerificationEmailDirect(params);
  }
}

/**
 * Enqueue a custom email job into the Redis BullMQ queue.
 * Falls back to direct SMTP delivery if Redis is unavailable.
 */
export async function enqueueCustomEmail(
  params: SendCustomEmailParams
): Promise<EmailSendResult> {
  try {
    const job = await emailQueue.add('custom-email', {
      type: 'custom',
      params,
    });

    console.log(`[EmailQueue] Enqueued custom email for ${params.to} (Job ID: ${job.id})`);
    return {
      success: true,
      delivered: false,
      queued: true,
      jobId: job.id,
    };
  } catch (err: any) {
    console.warn(`[EmailQueue] Redis enqueue failed (${err.message}). Falling back to direct SMTP delivery...`);
    return await sendCustomEmailDirect(params);
  }
}
