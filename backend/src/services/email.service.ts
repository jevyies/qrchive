import nodemailer, { SendMailOptions } from 'nodemailer';
import fs from 'fs';
import path from 'path';
import dns from 'dns';

// Ensure Node uses IPv4 first to prevent ENETUNREACH on Windows/networks without IPv6 gateway
if (dns.setDefaultResultOrder) {
  dns.setDefaultResultOrder('ipv4first');
}

const GMAIL_USER = process.env.GMAIL_USER || 'ababafamily2024@gmail.com';
const GMAIL_APP_PASSWORD = (process.env.GMAIL_APP_PASSWORD || process.env.EMAIL_PASSWORD || '').replace(/\s+/g, '');

/**
 * Creates and returns the Google/Gmail Nodemailer transporter
 */
export const getEmailTransporter = () => {
  return nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
      user: GMAIL_USER,
      pass: GMAIL_APP_PASSWORD,
    },
    connectionTimeout: 5000,
    greetingTimeout: 5000,
    socketTimeout: 5000,
    // Force IPv4 socket resolution
    // @ts-ignore
    family: 4,
  });
};


/**
 * Resolves the verification email HTML template and injects dynamic variables
 */
export const renderVerificationEmailHtml = (code: string, name?: string): string => {
  // Check possible paths for template (development tsx vs compiled dist)
  const templateCandidates = [
    path.join(__dirname, '../templates/email-verification.html'),
    path.join(__dirname, '../../src/templates/email-verification.html'),
    path.join(process.cwd(), 'src/templates/email-verification.html'),
  ];

  let templateHtml = '';
  for (const p of templateCandidates) {
    if (fs.existsSync(p)) {
      templateHtml = fs.readFileSync(p, 'utf-8');
      break;
    }
  }

  if (!templateHtml) {
    // Fallback inline template if file could not be found
    return `
      <div style="font-family: Arial, sans-serif; background: #0b0f17; color: #f8fafc; padding: 40px; text-align: center;">
        <h1 style="color: #60a5fa;">QRchive</h1>
        <p>Your 6-digit verification code is:</p>
        <div style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #38bdf8; padding: 20px; background: #1e293b; border-radius: 8px; display: inline-block; margin: 20px 0;">
          ${code}
        </div>
        <p style="color: #94a3b8; font-size: 14px;">This code is valid for 10 minutes. Copy and paste it to the registration page.</p>
        <p style="color: #64748b; font-size: 12px; margin-top: 30px;">QRchive &copy; ${new Date().getFullYear()}</p>
      </div>
    `;
  }

  const greeting = name && name.trim() ? ` ${name.trim()}` : '';
  const currentYear = new Date().getFullYear().toString();

  return templateHtml
    .replace(/\{\{CODE\}\}/g, code)
    .replace(/\{\{NAME_GREETING\}\}/g, greeting)
    .replace(/\{\{YEAR\}\}/g, currentYear);
};

/**
 * Finds the QRchive logo file to attach via CID
 */
const getLogoAttachment = () => {
  const logoCandidates = [
    path.join(__dirname, '../assets/logo.svg'),
    path.join(__dirname, '../../src/assets/logo.svg'),
    path.join(process.cwd(), 'src/assets/logo.svg'),
    path.join(process.cwd(), '../ui/src/assets/logo/logo.svg'),
  ];

  for (const p of logoCandidates) {
    if (fs.existsSync(p)) {
      return {
        filename: 'logo.svg',
        path: p,
        cid: 'qrchive_logo',
      };
    }
  }
  return null;
};

export interface SendVerificationEmailParams {
  to: string;
  code: string;
  name?: string;
}

export interface SendCustomEmailParams {
  to: string;
  subject: string;
  message: string;
  replyTo?: string;
  html?: string;
}

export interface EmailSendResult {
  success: boolean;
  delivered: boolean;
  messageId?: string;
  error?: string;
  code?: string;
  message?: string;
  simulated?: boolean;
  queued?: boolean;
  jobId?: string;
}

/**
 * Direct verification email sender via Google SMTP (bypasses Redis queue)
 */
export const sendVerificationEmailDirect = async ({
  to,
  code,
  name,
}: SendVerificationEmailParams): Promise<EmailSendResult> => {
  const htmlContent = renderVerificationEmailHtml(code, name);
  const logoAttachment = getLogoAttachment();

  const mailOptions: SendMailOptions = {
    from: '"QRchive" <ababafamily2024@gmail.com>',
    to,
    subject: 'Your QRchive Verification Code',
    text: `Hello${name ? ` ${name}` : ''},\n\nYour 6-digit verification code for QRchive is: ${code}\n\nThis code expires in 10 minutes. Please copy and paste this code to the registration page to complete your account setup.\n\nReply to: ababafamily2024@gmail.com\n\n© ${new Date().getFullYear()} QRchive`,
    replyTo: 'ababafamily2024@gmail.com',
    html: htmlContent,
    attachments: logoAttachment ? [logoAttachment] : [],
  };

  console.log(`[EMAIL SERVICE] Preparing direct verification email for: ${to} (Code: ${code})`);

  // If App Password is not yet provided, log clearly to console so development is seamless
  if (!GMAIL_APP_PASSWORD) {
    console.warn(
      `[EMAIL SERVICE WARNING] GMAIL_APP_PASSWORD is not set in .env. ` +
      `Email was not sent to Google SMTP, but you can use this verification code to register: [ ${code} ]`
    );
    return {
      success: true,
      delivered: false,
      message: 'Verification code generated (simulated in development mode)',
      code,
      simulated: true,
    };
  }

  try {
    const transporter = getEmailTransporter();
    const info = await transporter.sendMail(mailOptions);
    console.log(`[EMAIL SERVICE] Verification email sent successfully to ${to}. MessageId: ${info.messageId}`);
    return {
      success: true,
      delivered: true,
      messageId: info.messageId,
    };
  } catch (error: any) {
    console.error(`[EMAIL SERVICE ERROR] Failed to send email via Google SMTP:`, error?.message || error);
    // In development or if SMTP credentials fail, still allow the code to be printed in console
    console.warn(`[EMAIL SERVICE BACKUP] Verification code for ${to} is: [ ${code} ]`);
    return {
      success: false,
      delivered: false,
      error: error?.message,
      code,
    };
  }
};

/**
 * Direct custom email sender via Google SMTP (bypasses Redis queue)
 */
export const sendCustomEmailDirect = async (
  options: SendCustomEmailParams
): Promise<EmailSendResult> => {
  const mailOptions: SendMailOptions = {
    from: '"QRchive" <ababafamily2024@gmail.com>',
    to: options.to,
    subject: options.subject,
    text: options.message,
    replyTo: options.replyTo || 'ababafamily2024@gmail.com',
    html: options.html,
  };

  if (!GMAIL_APP_PASSWORD) {
    console.warn(`[EMAIL SERVICE] GMAIL_APP_PASSWORD not set. Custom email to ${options.to}: "${options.subject}"`);
    return { success: true, delivered: false, simulated: true };
  }

  try {
    const transporter = getEmailTransporter();
    const info = await transporter.sendMail(mailOptions);
    console.log(`[EMAIL SERVICE] Custom email sent successfully to ${options.to}. MessageId: ${info.messageId}`);
    return { success: true, delivered: true, messageId: info.messageId };
  } catch (error: any) {
    console.error(`[EMAIL SERVICE ERROR] Failed to send custom email to ${options.to}:`, error?.message || error);
    return { success: false, delivered: false, error: error?.message };
  }
};

/**
 * Sends a 6-digit verification code email with QRchive branding.
 * Dispatches via BullMQ Redis queue with automatic retries and direct fallback.
 */
export const sendVerificationEmail = async (
  params: SendVerificationEmailParams
): Promise<EmailSendResult> => {
  try {
    const { enqueueVerificationEmail } = require('../queues/email.queue');
    return await enqueueVerificationEmail(params);
  } catch (err: any) {
    console.warn('[EMAIL SERVICE] Redis queue dispatch error, falling back to direct sending:', err.message);
    return await sendVerificationEmailDirect(params);
  }
};

/**
 * Generic email sender matching application needs.
 * Dispatches via BullMQ Redis queue with automatic retries and direct fallback.
 */
export const sendCustomEmail = async (
  options: SendCustomEmailParams
): Promise<EmailSendResult> => {
  try {
    const { enqueueCustomEmail } = require('../queues/email.queue');
    return await enqueueCustomEmail(options);
  } catch (err: any) {
    console.warn('[EMAIL SERVICE] Redis queue dispatch error, falling back to direct sending:', err.message);
    return await sendCustomEmailDirect(options);
  }
};

