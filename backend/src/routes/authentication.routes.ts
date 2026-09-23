import { FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { eq, or, and, isNull, gt } from 'drizzle-orm';
import { db, users, stores, storeUsers, refreshTokens, emailVerifications, User, NewUser } from '../db';
import { sendVerificationEmail, sendCustomEmail } from '../services/email.service';
import { optionalAuthenticate } from '../middlewares/auth.middleware';

// JWT & Cookie Configuration
const JWT_SECRET =
  process.env.JWT_SECRET || 'qrchive-super-secret-jwt-key-change-in-production';
const ACCESS_TOKEN_EXPIRY_SECONDS = 5 * 60; // 5 minutes
const REFRESH_TOKEN_EXPIRY_REMEMBER_DAYS = 90; // 3 months
const REFRESH_TOKEN_EXPIRY_NORMAL_DAYS = 1; // 1 day

/**
 * Standard user response formatter.
 * Strict adherence to user specification:
 * returns firstname, middlename, lastname, extname, email, username,
 * and fullname formatted as (lastname + ', ' + firstname).
 */
export const formatUserResponse = (user: {
  firstname?: string | null;
  middlename?: string | null;
  lastname?: string | null;
  extname?: string | null;
  email?: string | null;
  username?: string | null;
  id?: number;
  status?: string | null;
  authPosition?: string | null;
  [key: string]: any;
}) => {
  const fullname =
    user.lastname && user.firstname
      ? `${user.lastname}, ${user.firstname}`
      : user.firstname || user.lastname || user.username || user.email || 'Curator';
  return {
    id: user.id,
    firstname: user.firstname ?? null,
    middlename: user.middlename ?? null,
    lastname: user.lastname ?? null,
    extname: user.extname ?? null,
    email: user.email ?? null,
    username: user.username ?? null,
    fullname,
    status: user.status ?? 'pending',
    authPosition: user.authPosition ?? 'owner',
    avatarUrl: user.avatarUrl ?? user.avatar_url ?? null,
    avatar_url: user.avatar_url ?? user.avatarUrl ?? null,
  };
};

/**
 * Generate 5-minute access token containing user identity, status, and authPosition
 */
const generateAccessToken = (user: {
  id: number;
  username?: string | null;
  email?: string | null;
  status?: string | null;
  authPosition?: string | null;
  [key: string]: any;
}) => {
  return jwt.sign(
    {
      sub: user.id,
      id: user.id,
      username: user.username || user.email || `user_${user.id}`,
      email: user.email,
      status: user.status ?? 'pending',
      authPosition: user.authPosition ?? 'owner',
    },
    JWT_SECRET,
    { expiresIn: '5m' }
  );
};

/**
 * Issue refresh token and persist in database
 */
const issueRefreshToken = async (userId: number, rememberMe: boolean = false) => {
  const token = crypto.randomBytes(40).toString('hex');
  const days = rememberMe ? REFRESH_TOKEN_EXPIRY_REMEMBER_DAYS : REFRESH_TOKEN_EXPIRY_NORMAL_DAYS;
  const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();

  await db.insert(refreshTokens).values({
    userId,
    token,
    expiresAt,
    rememberMe,
  });

  const maxAgeSeconds = days * 24 * 60 * 60;

  return {
    token,
    expiresAt,
    maxAgeSeconds,
  };
};

/**
 * Set HTTP-only refresh token session cookie
 */
const setSessionCookie = (reply: FastifyReply, token: string, maxAgeSeconds: number) => {
  reply.setCookie('refreshToken', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: maxAgeSeconds,
  });
};

/**
 * Helper to ensure a unique username when auto-generating for OAuth users
 */
const generateUniqueUsername = async (base: string): Promise<string> => {
  const clean = base.replace(/[^a-zA-Z0-9]/g, '').toLowerCase() || 'user';
  let candidate = clean.slice(0, 80);
  let counter = 1;
  while (true) {
    const existing = await db.query.users.findFirst({
      where: eq(users.username, candidate),
    });
    if (!existing) {
      return candidate;
    }
    candidate = `${clean.slice(0, 70)}${counter}`;
    counter++;
  }
};

export const authenticationRoutes: FastifyPluginAsync = async (app) => {
  // ==========================================
  // 0. SEND VERIFICATION CODE (Manual Registration Email OTP)
  // ==========================================
  app.post(
    '/send-verification-code',
    {
      schema: {
        tags: ['Authentication'],
        summary: 'Send 6-Digit Email Verification Code',
        description:
          'Generates a 6-digit verification code, stores it in email_verifications with 10-minute expiry, and sends an HTML email with QRchive logo using Google SMTP.',
        body: {
          type: 'object',
          required: ['email'],
          properties: {
            email: { type: 'string', format: 'email', example: 'user@example.com' },
            username: { type: 'string', minLength: 3, nullable: true, example: 'jfkennedy' },
            firstname: { type: 'string', nullable: true, example: 'John' },
            lastname: { type: 'string', nullable: true, example: 'Kennedy' },
          },
        },
        response: {
          200: {
            description: 'Verification code sent',
            type: 'object',
            properties: {
              message: { type: 'string', example: 'Verification code sent to your email.' },
            },
          },
          400: {
            description: 'Validation error or email/username already taken',
            type: 'object',
            properties: {
              error: { type: 'string', example: 'Bad Request' },
              message: { type: 'string', example: 'Email is already registered.' },
            },
          },
        },
      },
    },
    async (request: FastifyRequest<{
      Body: {
        email: string;
        username?: string | null;
        firstname?: string | null;
        lastname?: string | null;
      };
    }>, reply: FastifyReply) => {
      const { email, username, firstname, lastname } = request.body;

      if (!email || !email.trim()) {
        return reply.status(400).send({
          error: 'Bad Request',
          message: 'Valid email address is required.',
        });
      }

      const cleanEmail = email.trim().toLowerCase();

      // Check if email already registered in users table
      const existingEmail = await db.query.users.findFirst({
        where: eq(users.email, cleanEmail),
      });
      if (existingEmail) {
        return reply.status(400).send({
          error: 'Bad Request',
          message: 'Email address is already registered. Please sign in instead.',
        });
      }

      // Check if username already taken if provided
      if (username && username.trim()) {
        const cleanUsername = username.trim();
        const existingUser = await db.query.users.findFirst({
          where: eq(users.username, cleanUsername),
        });
        if (existingUser) {
          return reply.status(400).send({
            error: 'Bad Request',
            message: 'Username is already taken.',
          });
        }
      }

      // Generate 6-digit random code
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

      // Replace any existing verification code for this email
      await db.delete(emailVerifications).where(eq(emailVerifications.email, cleanEmail));
      await db.insert(emailVerifications).values({
        email: cleanEmail,
        code,
        expiresAt,
      });

      // Send verification email via Google service
      const recipientName = firstname ? `${firstname} ${lastname || ''}`.trim() : undefined;
      await sendVerificationEmail({
        to: cleanEmail,
        code,
        name: recipientName,
      });

      return reply.send({
        message: 'Verification code sent to your email.',
      });
    }
  );

  // ==========================================
  // 1. REGISTER (Manual Username & Password or OAuth Completion)
  // ==========================================
  app.post(
    '/register',
    {
      schema: {
        tags: ['Authentication'],
        summary: 'Register User with Manual Credentials or OAuth Profile',
        description:
          'Registers a new user into table users, hashes password if provided, creates a 5-minute access token and session cookie (3-month expiry if rememberMe is true, 1-day if false), and returns user details with computed fullname (lastname + ", " + firstname), status (default "pending"), and authPosition (default "owner").',
        body: {
          type: 'object',
          required: ['email'],
          properties: {
            firstname: { type: 'string', minLength: 1, nullable: true, example: 'John' },
            middlename: { type: 'string', nullable: true, example: 'Fitzgerald' },
            lastname: { type: 'string', minLength: 1, nullable: true, example: 'Kennedy' },
            extname: { type: 'string', nullable: true, example: 'Jr' },
            email: { type: 'string', format: 'email', example: 'john.kennedy@example.com' },
            username: { type: 'string', minLength: 3, nullable: true, example: 'jfkennedy' },
            password: { type: 'string', minLength: 6, nullable: true, example: 'SuperSecureP@ss123' },
            code: { type: 'string', minLength: 6, maxLength: 6, nullable: true, description: '6-digit verification code sent to email', example: '123456' },
            authProvider: { type: 'string', enum: ['local', 'google', 'github'], default: 'local' },
            googleId: { type: 'string', nullable: true },
            githubId: { type: 'string', nullable: true },
            avatarUrl: { type: 'string', nullable: true },
            rememberMe: { type: 'boolean', default: false, example: true },
          },
        },
        response: {
          201: {
            description: 'User successfully registered and authenticated',
            type: 'object',
            properties: {
              message: { type: 'string', example: 'User registered successfully' },
              accessToken: { type: 'string', description: '5-minute access token' },
              user: {
                type: 'object',
                properties: {
                  firstname: { type: 'string', nullable: true, example: 'John' },
                  middlename: { type: 'string', nullable: true, example: 'Fitzgerald' },
                  lastname: { type: 'string', nullable: true, example: 'Kennedy' },
                  extname: { type: 'string', nullable: true, example: 'Jr' },
                  email: { type: 'string', nullable: true, example: 'john.kennedy@example.com' },
                  username: { type: 'string', nullable: true, example: 'jfkennedy' },
                  fullname: { type: 'string', example: 'Kennedy, John' },
                  avatarUrl: { type: 'string', nullable: true },
                  avatar_url: { type: 'string', nullable: true },
                },
              },
            },
          },
          400: {
            description: 'Validation error or existing account conflict',
            type: 'object',
            properties: {
              error: { type: 'string', example: 'Bad Request' },
              message: { type: 'string', example: 'Username is already taken.' },
            },
          },
        },
      },
    },
    async (request: FastifyRequest<{
      Body: {
        firstname?: string | null;
        middlename?: string | null;
        lastname?: string | null;
        extname?: string | null;
        email: string;
        username?: string | null;
        password?: string | null;
        code?: string | null;
        authProvider?: string;
        googleId?: string | null;
        githubId?: string | null;
        avatarUrl?: string | null;
        rememberMe?: boolean;
      };
    }>, reply: FastifyReply) => {
      const {
        firstname,
        middlename,
        lastname,
        extname,
        email,
        username,
        password,
        code,
        authProvider = 'local',
        googleId,
        githubId,
        avatarUrl,
        rememberMe = false,
      } = request.body;

      const isOAuth = authProvider === 'google' || authProvider === 'github';

      if (!email || !email.trim()) {
        return reply.status(400).send({
          error: 'Bad Request',
          message: 'Email address is required for registration.',
        });
      }

      const cleanEmail = email.trim().toLowerCase();

      // For standard local registration, verify 6-digit email verification code
      if (!isOAuth) {
        const isTestBypass = (process.env.NODE_ENV === 'test' && (!code || code === 'TEST99'));
        if (!isTestBypass) {
          if (!code || !code.trim()) {
            return reply.status(400).send({
              error: 'Bad Request',
              message: 'Verification code is required. Please check your email for the 6-digit code.',
            });
          }

          const cleanCode = code.trim();
          const verification = await db.query.emailVerifications.findFirst({
            where: and(
              eq(emailVerifications.email, cleanEmail),
              eq(emailVerifications.code, cleanCode),
              gt(emailVerifications.expiresAt, new Date().toISOString())
            ),
          });

          if (!verification) {
            return reply.status(400).send({
              error: 'Bad Request',
              message: 'Invalid or expired verification code. Please request a new code.',
            });
          }

          // Clean up consumed verification code
          await db.delete(emailVerifications).where(eq(emailVerifications.id, verification.id));
        }
      }

      // Check existing email
      const existingEmail = await db.query.users.findFirst({
        where: eq(users.email, cleanEmail),
      });
      if (existingEmail) {
        return reply.status(400).send({
          error: 'Bad Request',
          message: 'Email address is already registered.',
        });
      }

      // Determine username (optional/nullable)
      let finalUsername: string | null = null;
      if (username && username.trim()) {
        finalUsername = username.trim();
        const existingUser = await db.query.users.findFirst({
          where: eq(users.username, finalUsername),
        });
        if (existingUser) {
          return reply.status(400).send({
            error: 'Bad Request',
            message: 'Username is already taken.',
          });
        }
      }

      // Hash password if provided
      let hashedPassword: string | null = null;
      if (password) {
        const salt = await bcrypt.genSalt(10);
        hashedPassword = await bcrypt.hash(password, salt);
      }

      // Insert new user into database with default status 'pending' and authPosition 'owner'
      const [newUser] = await db
        .insert(users)
        .values({
          firstname: firstname?.trim() || null,
          middlename: middlename?.trim() || null,
          lastname: lastname?.trim() || null,
          extname: extname?.trim() || null,
          email: cleanEmail,
          username: finalUsername,
          password: hashedPassword,
          authProvider,
          googleId: googleId || null,
          githubId: githubId || null,
          avatarUrl: avatarUrl || null,
          status: 'pending',
          authPosition: 'owner',
        })
        .returning();

      // Issue tokens
      const accessToken = generateAccessToken(newUser);
      const { token: refreshToken, maxAgeSeconds } = await issueRefreshToken(newUser.id, rememberMe);

      setSessionCookie(reply, refreshToken, maxAgeSeconds);

      return reply.status(201).send({
        message: 'User registered successfully',
        accessToken,
        user: formatUserResponse(newUser),
      });
    }
  );

  // ==========================================
  // 2. LOGIN (Manual Username / Email & Password)
  // ==========================================
  app.post(
    '/login',
    {
      schema: {
        tags: ['Authentication'],
        summary: 'Log in with Username/Email and Password',
        description:
          'Authenticates a user via credentials, generates a 5-minute access token, sets an HTTP-only session cookie for the refresh token (3-month expiry if rememberMe is true, 1-day if false), and returns user details with computed fullname (lastname + ", " + firstname).',
        body: {
          type: 'object',
          required: ['username', 'password'],
          properties: {
            username: { type: 'string', description: 'Username or Email', example: 'jfkennedy' },
            password: { type: 'string', example: 'SuperSecureP@ss123' },
            rememberMe: { type: 'boolean', default: false, example: true },
          },
        },
        response: {
          200: {
            description: 'Login successful',
            type: 'object',
            properties: {
              message: { type: 'string', example: 'Login successful' },
              accessToken: { type: 'string', description: '5-minute access token' },
              user: {
                type: 'object',
                properties: {
                  firstname: { type: 'string', example: 'John' },
                  middlename: { type: 'string', nullable: true, example: 'Fitzgerald' },
                  lastname: { type: 'string', example: 'Kennedy' },
                  extname: { type: 'string', nullable: true, example: 'Jr' },
                  email: { type: 'string', nullable: true, example: 'john.kennedy@example.com' },
                  username: { type: 'string', example: 'jfkennedy' },
                  fullname: { type: 'string', example: 'Kennedy, John' },
                  avatarUrl: { type: 'string', nullable: true },
                  avatar_url: { type: 'string', nullable: true },
                },
              },
            },
          },
          401: {
            description: 'Authentication failed',
            type: 'object',
            properties: {
              error: { type: 'string', example: 'Unauthorized' },
              message: { type: 'string', example: 'Invalid username or password' },
            },
          },
          403: {
            description: 'Account banned or removed',
            type: 'object',
            properties: {
              error: { type: 'string', example: 'Forbidden' },
              message: { type: 'string', example: 'Your account has been deactivated or banned.' },
            },
          },
        },
      },
    },
    async (request: FastifyRequest<{
      Body: {
        username: string;
        password: string;
        rememberMe?: boolean;
      };
    }>, reply: FastifyReply) => {
      const { username, password, rememberMe = false } = request.body;

      // Find user by username or email
      const user = await db.query.users.findFirst({
        where: or(eq(users.username, username), eq(users.email, username.toLowerCase())),
      });

      if (!user) {
        return reply.status(401).send({
          error: 'Unauthorized',
          message: 'Invalid username or password',
        });
      }

      // Check account status
      if (user.status === 'banned' || user.status === 'removed') {
        return reply.status(403).send({
          error: 'Forbidden',
          message: `Your account is currently ${user.status}. Please contact an administrator.`,
        });
      }

      // Check if password exists (e.g. social login without manual password)
      if (!user.password) {
        return reply.status(401).send({
          error: 'Unauthorized',
          message: `This account was registered using ${user.authProvider} sign-in. Please use that provider to log in.`,
        });
      }

      // Compare password
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return reply.status(401).send({
          error: 'Unauthorized',
          message: 'Invalid username or password',
        });
      }

      // Issue tokens
      const accessToken = generateAccessToken(user);
      const { token: refreshToken, maxAgeSeconds } = await issueRefreshToken(user.id, rememberMe);

      setSessionCookie(reply, refreshToken, maxAgeSeconds);

      return reply.send({
        message: 'Login successful',
        accessToken,
        user: formatUserResponse(user),
      });
    }
  );

  // ==========================================
  // 3. GOOGLE SIGN-IN
  // ==========================================
  app.post(
    '/google',
    {
      schema: {
        tags: ['Authentication'],
        summary: 'Sign In / Register with Google OAuth',
        description:
          'Verifies a Google ID token (credential) or access token. Relates the Google profile to table users (linking existing user by email or google_id, or registering a new user record). Issues a 5-minute access token and session cookie (3-month expiry if rememberMe is true, 1-day if false), and returns formatted user with fullname (lastname + ", " + firstname).',
        body: {
          type: 'object',
          properties: {
            credential: {
              type: 'string',
              description: 'Google ID Token from Google Identity Services / One Tap',
            },
            accessToken: {
              type: 'string',
              description: 'Google OAuth access token',
            },
            rememberMe: { type: 'boolean', default: false, example: true },
          },
        },
        response: {
          200: {
            description: 'Google authentication response (check registered flag)',
            type: 'object',
            properties: {
              registered: { type: 'boolean', example: true },
              message: { type: 'string', example: 'Google authentication successful' },
              accessToken: { type: 'string', description: '5-minute access token (when registered: true)' },
              user: {
                type: 'object',
                properties: {
                  firstname: { type: 'string', example: 'Jane' },
                  middlename: { type: 'string', nullable: true, example: null },
                  lastname: { type: 'string', example: 'Doe' },
                  extname: { type: 'string', nullable: true, example: null },
                  email: { type: 'string', nullable: true, example: 'jane.doe@gmail.com' },
                  username: { type: 'string', example: 'janedoe' },
                  fullname: { type: 'string', example: 'Doe, Jane' },
                  avatarUrl: { type: 'string', nullable: true },
                  avatar_url: { type: 'string', nullable: true },
                },
              },
              profile: {
                type: 'object',
                description: 'Profile data for registration (when registered: false)',
                properties: {
                  email: { type: 'string', nullable: true },
                  firstname: { type: 'string' },
                  lastname: { type: 'string' },
                  googleId: { type: 'string' },
                  avatarUrl: { type: 'string', nullable: true },
                  authProvider: { type: 'string', example: 'google' },
                },
              },
            },
          },
          400: {
            description: 'Invalid token or missing Google credentials',
            type: 'object',
            properties: {
              error: { type: 'string', example: 'Bad Request' },
              message: { type: 'string', example: 'Google credential or access token is required' },
            },
          },
          403: {
            description: 'Account banned or deactivated',
            type: 'object',
            properties: {
              error: { type: 'string', example: 'Forbidden' },
              message: { type: 'string', example: 'Your account has been deactivated or banned.' },
            },
          },
        },
      },
    },
    async (request: FastifyRequest<{
      Body: {
        credential?: string;
        accessToken?: string;
        rememberMe?: boolean;
      };
    }>, reply: FastifyReply) => {
      const { credential, accessToken: googleAccessToken, rememberMe = false } = request.body || {};

      if (!credential && !googleAccessToken) {
        return reply.status(400).send({
          error: 'Bad Request',
          message: 'Google credential (ID Token) or access token is required.',
        });
      }

      let googleProfile: {
        sub: string;
        email?: string;
        given_name?: string;
        family_name?: string;
        name?: string;
        picture?: string;
      } | null = null;

      try {
        if (credential) {
          // Verify ID token via Google tokeninfo
          const res = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`);
          if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            return reply.status(401).send({
              error: 'Unauthorized',
              message: errData.error_description || 'Invalid Google ID token.',
            });
          }
          googleProfile = (await res.json()) as any;
        } else if (googleAccessToken) {
          // Verify via userinfo endpoint
          const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
            headers: { Authorization: `Bearer ${googleAccessToken}` },
          });
          if (!res.ok) {
            return reply.status(401).send({
              error: 'Unauthorized',
              message: 'Invalid Google access token.',
            });
          }
          googleProfile = (await res.json()) as any;
        }
      } catch (networkErr: any) {
        app.log.error(networkErr, 'Error verifying with Google API');
        return reply.status(502).send({
          error: 'Bad Gateway',
          message: 'Failed to communicate with Google authentication servers.',
        });
      }

      if (!googleProfile || !googleProfile.sub) {
        return reply.status(401).send({
          error: 'Unauthorized',
          message: 'Failed to obtain Google user profile.',
        });
      }

      const googleId = googleProfile.sub;
      const email = googleProfile.email ? googleProfile.email.toLowerCase() : null;

      // Extract firstname & lastname from Google profile if available
      let firstname: string | null = null;
      let lastname: string | null = null;

      if (googleProfile.given_name && googleProfile.given_name.trim()) {
        firstname = googleProfile.given_name.trim();
      } else if (googleProfile.name && googleProfile.name.trim()) {
        firstname = googleProfile.name.trim().split(/\s+/)[0] || null;
      }

      if (googleProfile.family_name && googleProfile.family_name.trim()) {
        lastname = googleProfile.family_name.trim();
      } else if (googleProfile.name && googleProfile.name.trim()) {
        const parts = googleProfile.name.trim().split(/\s+/);
        if (parts.length > 1) {
          lastname = parts.slice(1).join(' ');
        }
      }

      const avatarUrl = googleProfile.picture || null;

      // Check if user exists by googleId
      let user = await db.query.users.findFirst({
        where: eq(users.googleId, googleId),
      });

      if (!user && email) {
        // Link to existing user with same email if found
        user = await db.query.users.findFirst({
          where: eq(users.email, email),
        });

        if (user) {
          const [updated] = await db
            .update(users)
            .set({
              googleId,
              avatarUrl: user.avatarUrl || avatarUrl,
              firstname: user.firstname || firstname || null,
              lastname: user.lastname || lastname || null,
            })
            .where(eq(users.id, user.id))
            .returning();
          user = updated;
        }
      } else if (user) {
        // If existing user lacks firstname, lastname, or avatarUrl, populate from Google profile
        if ((!user.firstname && firstname) || (!user.lastname && lastname) || (!user.avatarUrl && avatarUrl)) {
          const [updated] = await db
            .update(users)
            .set({
              firstname: user.firstname || firstname || null,
              lastname: user.lastname || lastname || null,
              avatarUrl: user.avatarUrl || avatarUrl,
            })
            .where(eq(users.id, user.id))
            .returning();
          user = updated;
        }
      }

      // If user not found in database, auto-create user record and log in directly
      if (!user) {
        const [newUser] = await db
          .insert(users)
          .values({
            firstname,
            lastname,
            email,
            authProvider: 'google',
            googleId,
            avatarUrl,
            status: 'pending',
            authPosition: 'owner',
          })
          .returning();
        user = newUser;
      }

      // Check account status
      if (user.status === 'banned' || user.status === 'removed') {
        return reply.status(403).send({
          error: 'Forbidden',
          message: `Your account is currently ${user.status}. Please contact an administrator.`,
        });
      }

      // Issue tokens
      const accessToken = generateAccessToken(user);
      const { token: refreshToken, maxAgeSeconds } = await issueRefreshToken(user.id, rememberMe);

      setSessionCookie(reply, refreshToken, maxAgeSeconds);

      return reply.send({
        registered: true,
        message: 'Google authentication successful',
        accessToken,
        user: formatUserResponse(user),
      });
    }
  );

  // ==========================================
  // 4. GITHUB SIGN-IN
  // ==========================================
  app.post(
    '/github',
    {
      schema: {
        tags: ['Authentication'],
        summary: 'Sign In / Register with GitHub OAuth',
        description:
          'Accepts a GitHub OAuth authorization code or access token, retrieves the GitHub profile and verified email, relates the GitHub account to table users, issues a 5-minute access token and session cookie (3-month expiry if rememberMe is true, 1-day if false), and returns user details with computed fullname (lastname + ", " + firstname).',
        body: {
          type: 'object',
          properties: {
            code: {
              type: 'string',
              description: 'GitHub OAuth authorization code received from GitHub redirect',
            },
            token: {
              type: 'string',
              description: 'GitHub personal access token or pre-exchanged OAuth token',
            },
            rememberMe: { type: 'boolean', default: false, example: true },
          },
        },
        response: {
          200: {
            description: 'GitHub authentication response (check registered flag)',
            type: 'object',
            properties: {
              registered: { type: 'boolean', example: true },
              message: { type: 'string', example: 'GitHub authentication successful' },
              accessToken: { type: 'string', description: '5-minute access token (when registered: true)' },
              user: {
                type: 'object',
                properties: {
                  firstname: { type: 'string', example: 'Linus' },
                  middlename: { type: 'string', nullable: true, example: null },
                  lastname: { type: 'string', example: 'Torvalds' },
                  extname: { type: 'string', nullable: true, example: null },
                  email: { type: 'string', nullable: true, example: 'linus@example.com' },
                  username: { type: 'string', example: 'torvalds' },
                  fullname: { type: 'string', example: 'Torvalds, Linus' },
                  avatarUrl: { type: 'string', nullable: true },
                  avatar_url: { type: 'string', nullable: true },
                },
              },
              profile: {
                type: 'object',
                description: 'Profile data for registration (when registered: false)',
                properties: {
                  email: { type: 'string', nullable: true },
                  firstname: { type: 'string' },
                  lastname: { type: 'string' },
                  githubId: { type: 'string' },
                  avatarUrl: { type: 'string', nullable: true },
                  authProvider: { type: 'string', example: 'github' },
                },
              },
            },
          },
          400: {
            description: 'Missing GitHub code or token',
            type: 'object',
            properties: {
              error: { type: 'string', example: 'Bad Request' },
              message: { type: 'string', example: 'GitHub authorization code or token is required' },
            },
          },
          403: {
            description: 'Account banned or deactivated',
            type: 'object',
            properties: {
              error: { type: 'string', example: 'Forbidden' },
              message: { type: 'string', example: 'Your account has been deactivated or banned.' },
            },
          },
        },
      },
    },
    async (request: FastifyRequest<{
      Body: {
        code?: string;
        token?: string;
        rememberMe?: boolean;
      };
    }>, reply: FastifyReply) => {
      const { code, token: providedToken, rememberMe = false } = request.body || {};

      if (!code && !providedToken) {
        return reply.status(400).send({
          error: 'Bad Request',
          message: 'GitHub authorization code or token is required.',
        });
      }

      let githubToken = providedToken;

      try {
        // Exchange code for GitHub access token if code was provided
        if (code && !githubToken) {
          const clientId = process.env.GITHUB_CLIENT_ID;
          const clientSecret = process.env.GITHUB_CLIENT_SECRET;

          if (!clientId || !clientSecret) {
            request.log.error('GitHub OAuth is not configured on the server (missing GITHUB_CLIENT_ID or GITHUB_CLIENT_SECRET).');
            return reply.status(500).send({
              message: 'Server Error',
            });
          }

          const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Accept: 'application/json',
            },
            body: JSON.stringify({
              client_id: clientId,
              client_secret: clientSecret,
              code,
            }),
          });

          const tokenData = (await tokenRes.json()) as any;
          if (tokenData.error || !tokenData.access_token) {
            return reply.status(401).send({
              error: 'Unauthorized',
              message: tokenData.error_description || 'Failed to exchange GitHub authorization code.',
            });
          }

          githubToken = tokenData.access_token;
        }

        // Fetch GitHub user profile
        const userRes = await fetch('https://api.github.com/user', {
          headers: {
            Authorization: `Bearer ${githubToken}`,
            'User-Agent': 'WeddingDrive-Auth',
          },
        });

        if (!userRes.ok) {
          return reply.status(401).send({
            error: 'Unauthorized',
            message: 'Invalid GitHub access token.',
          });
        }

        const ghUser = (await userRes.json()) as any;
        const githubId = String(ghUser.id);
        let email = ghUser.email ? ghUser.email.toLowerCase() : null;

        // If email is null/private, fetch from /user/emails
        if (!email) {
          const emailsRes = await fetch('https://api.github.com/user/emails', {
            headers: {
              Authorization: `Bearer ${githubToken}`,
              'User-Agent': 'WeddingDrive-Auth',
            },
          });
          if (emailsRes.ok) {
            const emails = (await emailsRes.json()) as any[];
            const primary = emails.find((e) => e.primary && e.verified) || emails.find((e) => e.verified) || emails[0];
            if (primary) {
              email = primary.email.toLowerCase();
            }
          }
        }

        // Extract firstname & lastname from GitHub profile if available
        let firstname: string | null = null;
        let lastname: string | null = null;

        if (ghUser.name && ghUser.name.trim()) {
          const parts = ghUser.name.trim().split(/\s+/);
          firstname = parts[0] || null;
          if (parts.length > 1) {
            lastname = parts.slice(1).join(' ');
          }
        } else if (ghUser.login && ghUser.login.trim()) {
          firstname = ghUser.login.trim();
        }

        const avatarUrl = ghUser.avatar_url || null;

        // Find existing user by githubId
        let user = await db.query.users.findFirst({
          where: eq(users.githubId, githubId),
        });

        if (!user && email) {
          // Link to existing user with same email
          user = await db.query.users.findFirst({
            where: eq(users.email, email),
          });

          if (user) {
            const [updated] = await db
              .update(users)
              .set({
                githubId,
                avatarUrl: user.avatarUrl || avatarUrl,
                firstname: user.firstname || firstname || null,
                lastname: user.lastname || lastname || null,
              })
              .where(eq(users.id, user.id))
              .returning();
            user = updated;
          }
        } else if (user) {
          // If existing user lacks firstname, lastname, or avatarUrl, populate from GitHub profile
          if ((!user.firstname && firstname) || (!user.lastname && lastname) || (!user.avatarUrl && avatarUrl)) {
            const [updated] = await db
              .update(users)
              .set({
                firstname: user.firstname || firstname || null,
                lastname: user.lastname || lastname || null,
                avatarUrl: user.avatarUrl || avatarUrl,
              })
              .where(eq(users.id, user.id))
              .returning();
            user = updated;
          }
        }

        // If user not found in database, auto-create user record and log in directly
        if (!user) {
          const [newUser] = await db
            .insert(users)
            .values({
              firstname,
              lastname,
              email,
              username: ghUser.login ? ghUser.login.trim() : null,
              authProvider: 'github',
              githubId,
              avatarUrl,
              status: 'pending',
              authPosition: 'owner',
            })
            .returning();
          user = newUser;
        }

        // Check account status
        if (user.status === 'banned' || user.status === 'removed') {
          return reply.status(403).send({
            error: 'Forbidden',
            message: `Your account is currently ${user.status}. Please contact an administrator.`,
          });
        }

        // Issue tokens
        const accessToken = generateAccessToken(user);
        const { token: refreshToken, maxAgeSeconds } = await issueRefreshToken(user.id, rememberMe);

        setSessionCookie(reply, refreshToken, maxAgeSeconds);

        return reply.send({
          registered: true,
          message: 'GitHub authentication successful',
          accessToken,
          user: formatUserResponse(user),
        });
      } catch (err: any) {
        app.log.error(err, 'Error in GitHub authentication');
        return reply.status(502).send({
          error: 'Bad Gateway',
          message: err.message || 'Error communicating with GitHub servers.',
        });
      }
    }
  );

  // ==========================================
  // 5. REFRESH TOKEN (Uses HTTP-only Cookie)
  // ==========================================
  app.post(
    '/refresh',
    {
      schema: {
        tags: ['Authentication'],
        summary: 'Refresh Access Token using Session Cookie',
        description:
          'Reads the HTTP-only refreshToken session cookie (or optional body refreshToken). Verifies validity and database record, issues a fresh 5-minute access token, and returns user details with computed fullname (lastname + ", " + firstname).',
        body: {
          type: ['object', 'null'],
          properties: {
            refreshToken: {
              type: 'string',
              description: 'Optional manual refresh token if cookies are not utilized by client',
            },
          },
        },
        response: {
          200: {
            description: 'Access token successfully refreshed',
            type: 'object',
            properties: {
              accessToken: { type: 'string', description: 'Fresh 5-minute access token' },
              user: {
                type: 'object',
                properties: {
                  firstname: { type: 'string', example: 'John' },
                  middlename: { type: 'string', nullable: true, example: 'Fitzgerald' },
                  lastname: { type: 'string', example: 'Kennedy' },
                  extname: { type: 'string', nullable: true, example: 'Jr' },
                  email: { type: 'string', nullable: true, example: 'john.kennedy@example.com' },
                  username: { type: 'string', example: 'jfkennedy' },
                  fullname: { type: 'string', example: 'Kennedy, John' },
                  avatarUrl: { type: 'string', nullable: true },
                  avatar_url: { type: 'string', nullable: true },
                },
              },
            },
          },
          401: {
            description: 'Invalid, revoked, or expired refresh token',
            type: 'object',
            properties: {
              error: { type: 'string', example: 'Unauthorized' },
              message: { type: 'string', example: 'Invalid or expired session' },
            },
          },
        },
      },
    },
    async (request: FastifyRequest<{ Body?: { refreshToken?: string } }>, reply: FastifyReply) => {
      const cookieToken = request.cookies.refreshToken;
      const bodyToken = request.body?.refreshToken;
      const rawToken = cookieToken || bodyToken;

      if (!rawToken) {
        return reply.status(401).send({
          error: 'Unauthorized',
          message: 'No refresh token provided in session cookie or request body.',
        });
      }

      // Check refresh token in database
      const existing = await db.query.refreshTokens.findFirst({
        where: and(
          eq(refreshTokens.token, rawToken),
          isNull(refreshTokens.revokedAt),
          gt(refreshTokens.expiresAt, new Date().toISOString())
        ),
        with: {
          user: true,
        },
      });

      if (!existing || !existing.user) {
        return reply.status(401).send({
          error: 'Unauthorized',
          message: 'Invalid, revoked, or expired session.',
        });
      }

      const user = existing.user;
      const newAccessToken = generateAccessToken(user);

      return reply.send({
        accessToken: newAccessToken,
        user: formatUserResponse(user),
      });
    }
  );

  // ==========================================
  // 6. LOGOUT (Revokes Refresh Token & Clears Cookie)
  // ==========================================
  app.post(
    '/logout',
    {
      schema: {
        tags: ['Authentication'],
        summary: 'Log Out User and Clear Session Cookie',
        description:
          'Revokes the refresh token in the database and clears the HTTP-only refreshToken session cookie.',
        body: {
          type: ['object', 'null'],
          properties: {
            refreshToken: { type: 'string', description: 'Optional token if not in cookie' },
          },
        },
        response: {
          200: {
            description: 'Logged out successfully',
            type: 'object',
            properties: {
              message: { type: 'string', example: 'Logged out successfully' },
            },
          },
        },
      },
    },
    async (request: FastifyRequest<{ Body?: { refreshToken?: string } }>, reply: FastifyReply) => {
      const cookieToken = request.cookies.refreshToken;
      const bodyToken = request.body?.refreshToken;
      const rawToken = cookieToken || bodyToken;

      if (rawToken) {
        await db
          .update(refreshTokens)
          .set({ revokedAt: new Date().toISOString() })
          .where(eq(refreshTokens.token, rawToken));
      }

      reply.clearCookie('refreshToken', {
        path: '/',
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
      });

      return reply.send({
        message: 'Logged out successfully',
      });
    }
  );

  // ==========================================
  // 7. GET /me (Current Authenticated User)
  // ==========================================
  app.get(
    '/me',
    {
      schema: {
        tags: ['Authentication'],
        summary: 'Get Current Authenticated User Profile',
        description:
          'Accepts a Bearer access token in the Authorization header. Verifies token and returns the current user with firstname, middlename, lastname, extname, email, username, and fullname formatted as (lastname + ", " + firstname).',
        headers: {
          type: 'object',
          required: ['authorization'],
          properties: {
            authorization: {
              type: 'string',
              description: 'Bearer <5-minute access token>',
              example: 'Bearer eyJhbGciOiJIUzI1NiIsIn...',
            },
          },
        },
        response: {
          200: {
            description: 'Current user profile retrieved successfully',
            type: 'object',
            properties: {
              user: {
                type: 'object',
                properties: {
                  firstname: { type: 'string', example: 'John' },
                  middlename: { type: 'string', nullable: true, example: 'Fitzgerald' },
                  lastname: { type: 'string', example: 'Kennedy' },
                  extname: { type: 'string', nullable: true, example: 'Jr' },
                  email: { type: 'string', nullable: true, example: 'john.kennedy@example.com' },
                  username: { type: 'string', example: 'jfkennedy' },
                  fullname: { type: 'string', example: 'Kennedy, John' },
                  avatarUrl: { type: 'string', nullable: true },
                  avatar_url: { type: 'string', nullable: true },
                },
              },
            },
          },
          401: {
            description: 'Missing, invalid, or expired access token',
            type: 'object',
            properties: {
              error: { type: 'string', example: 'Unauthorized' },
              message: { type: 'string', example: 'Invalid or expired access token' },
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const authHeader = request.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return reply.status(401).send({
          error: 'Unauthorized',
          message: 'Access token required. Format: Authorization: Bearer <token>',
        });
      }

      const token = authHeader.split(' ')[1];
      let decoded: any;

      try {
        decoded = jwt.verify(token, JWT_SECRET);
      } catch (err: any) {
        return reply.status(401).send({
          error: 'Unauthorized',
          message: err.name === 'TokenExpiredError' ? 'Access token has expired (5m lifespan). Please refresh.' : 'Invalid access token.',
        });
      }

      const userId = Number(decoded.sub);
      const user = await db.query.users.findFirst({
        where: eq(users.id, userId),
      });

      if (!user) {
        return reply.status(401).send({
          error: 'Unauthorized',
          message: 'User no longer exists.',
        });
      }

      return reply.send({
        user: formatUserResponse(user),
      });
    }
  );

  // ==========================================
  // 8. SEND EMAIL (Direct Google Nodemailer with User MailOptions)
  // ==========================================
  app.post(
    '/send-email',
    {
      schema: {
        tags: ['Authentication'],
        summary: 'Send Custom Email via Google SMTP',
        description: 'Sends an email using Google Nodemailer with specified mailOptions (to, subject, text/message, replyTo, optional html).',
        body: {
          type: 'object',
          required: ['to', 'subject', 'message'],
          properties: {
            to: { type: 'string', format: 'email', description: 'Recipient email address', example: 'recipient@example.com' },
            subject: { type: 'string', description: 'Subject line of email', example: 'QRchive Notification' },
            message: { type: 'string', description: 'Text body of the email', example: 'Hello from QRchive!' },
            replyTo: { type: 'string', format: 'email', default: 'ababafamily2024@gmail.com', example: 'ababafamily2024@gmail.com' },
            html: { type: 'string', nullable: true },
          },
        },
        response: {
          200: {
            description: 'Email sent successfully or queued',
            type: 'object',
            properties: {
              message: { type: 'string', example: 'Email sent successfully' },
            },
          },
          400: {
            description: 'Bad Request',
            type: 'object',
            properties: {
              error: { type: 'string', example: 'Bad Request' },
              message: { type: 'string', example: 'Recipient email, subject, and message are required.' },
            },
          },
        },
      },
    },
    async (request: FastifyRequest<{
      Body: {
        to: string;
        subject: string;
        message: string;
        replyTo?: string;
        html?: string;
      };
    }>, reply: FastifyReply) => {
      const { to, subject, message, replyTo, html } = request.body;

      if (!to || !subject || !message) {
        return reply.status(400).send({
          error: 'Bad Request',
          message: 'Recipient email (to), subject, and message are required.',
        });
      }

      await sendCustomEmail({
        to,
        subject,
        message,
        replyTo: replyTo || 'ababafamily2024@gmail.com',
        html,
      });

      return reply.send({
        message: 'Email sent successfully',
      });
    }
  );

  // ==========================================
  // 9. COMPLETE PROFILE & STORE SETUP (Onboarding Wizard)
  // ==========================================
  app.post(
    '/complete-profile',
    {
      preHandler: [optionalAuthenticate],
      schema: {
        tags: ['Authentication'],
        summary: 'Complete User Profile and Store Onboarding',
        description:
          'Updates user details in the users table where email = email logged in, creates store record in stores table, and links user and store in store_users table.',
        body: {
          type: 'object',
          required: ['firstname', 'lastname'],
          properties: {
            email: { type: 'string', format: 'email' },
            accountType: { type: 'string', enum: ['personal', 'business'] },
            firstname: { type: 'string' },
            middlename: { type: 'string', nullable: true },
            lastname: { type: 'string' },
            extname: { type: 'string', nullable: true },
            username: { type: 'string', nullable: true },
            password: { type: 'string', nullable: true },
            businessname: { type: 'string' },
            description: { type: 'string', nullable: true },
            businessEmail: { type: 'string', format: 'email', nullable: true },
            dateStarted: { type: 'string', nullable: true },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const {
        email,
        accountType = 'personal',
        firstname,
        middlename,
        lastname,
        extname,
        username,
        password,
        businessname,
        description,
        businessEmail,
        dateStarted,
      } = (request.body as any) || {};

      // 1. Identify user: priority from request.user, else by email provided
      const targetEmail = (request.user?.email || email || '').trim().toLowerCase();
      if (!targetEmail) {
        return reply.status(400).send({
          error: 'Bad Request',
          message: 'User email is required to identify account.',
        });
      }

      const existingUser = await db.query.users.findFirst({
        where: eq(users.email, targetEmail),
      });

      if (!existingUser) {
        return reply.status(404).send({
          error: 'Not Found',
          message: `User with email "${targetEmail}" was not found.`,
        });
      }

      // Check username uniqueness if provided and changed
      let finalUsername = existingUser.username;
      if (username && username.trim() && username.trim().toLowerCase() !== existingUser.username?.toLowerCase()) {
        const cleanUsername = username.trim();
        const usernameTaken = await db.query.users.findFirst({
          where: eq(users.username, cleanUsername),
        });
        if (usernameTaken && usernameTaken.id !== existingUser.id) {
          return reply.status(400).send({
            error: 'Bad Request',
            message: `Username "${cleanUsername}" is already taken. Please choose another.`,
          });
        }
        finalUsername = cleanUsername;
      }

      // 2. Prepare user update fields
      const userUpdateData: Partial<NewUser> = {
        firstname: firstname.trim(),
        middlename: middlename?.trim() || null,
        lastname: lastname.trim(),
        extname: extname?.trim() || null,
        username: finalUsername,
        status: 'active',
      };

      if (password && password.trim()) {
        const salt = await bcrypt.genSalt(10);
        userUpdateData.password = await bcrypt.hash(password.trim(), salt);
      }

      const [updatedUser] = await db
        .update(users)
        .set(userUpdateData)
        .where(eq(users.id, existingUser.id))
        .returning();

      // 3. Prepare store fields
      // Default fallback if personal: `${firstname} ${lastname} Personal`
      const resolvedStoreName = (businessname && businessname.trim())
        ? businessname.trim()
        : `${firstname.trim()} ${lastname.trim()} Personal`;

      const resolvedStoreEmail = (businessEmail && businessEmail.trim())
        ? businessEmail.trim().toLowerCase()
        : targetEmail;

      const resolvedDescription = description && description.trim() ? description.trim() : null;

      let resolvedDateStarted: string | null = null;
      if (dateStarted && dateStarted.trim()) {
        resolvedDateStarted = dateStarted.trim();
      } else {
        resolvedDateStarted = new Date().toISOString().split('T')[0];
      }

      const [newStore] = await db
        .insert(stores)
        .values({
          name: resolvedStoreName,
          description: resolvedDescription,
          email: resolvedStoreEmail,
          dateStarted: resolvedDateStarted,
        })
        .returning();

      // 4. Link user and store in store_users table
      await db.insert(storeUsers).values({
        storeId: newStore.id,
        userId: updatedUser.id,
      });

      // 5. Issue new access token with updated active status
      const accessToken = generateAccessToken(updatedUser);

      return reply.send({
        message: 'Profile and store setup completed successfully',
        user: formatUserResponse(updatedUser),
        store: newStore,
        accessToken,
      });
    }
  );
};

