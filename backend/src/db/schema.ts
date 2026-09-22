import {
  pgTable,
  bigserial,
  varchar,
  text,
  jsonb,
  date,
  timestamp,
  bigint,
  boolean,
} from 'drizzle-orm/pg-core';
import { sql, relations, type InferSelectModel, type InferInsertModel } from 'drizzle-orm';

// ==========================================
// 1. STORES
// ==========================================
export const stores = pgTable('stores', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  email: varchar('email', { length: 255 }).notNull(),
  driveDetails: jsonb('drive_details'),
  defaultPassword: varchar('default_password', { length: 255 }),
  dateStarted: date('date_started'),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
});

// ==========================================
// 2. USERS
// ==========================================
export const users = pgTable('users', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  firstname: varchar('firstname', { length: 100 }).notNull(),
  middlename: varchar('middlename', { length: 100 }),
  lastname: varchar('lastname', { length: 100 }).notNull(),
  extname: varchar('extname', { length: 20 }),
  email: varchar('email', { length: 255 }),
  username: varchar('username', { length: 100 }).notNull().unique(),
  password: varchar('password', { length: 255 }), // nullable for OAuth-only users
  googleId: varchar('google_id', { length: 255 }).unique(),
  githubId: varchar('github_id', { length: 255 }).unique(),
  avatarUrl: varchar('avatar_url', { length: 500 }),
  authProvider: varchar('auth_provider', { length: 50 }).default('local').notNull(),
  status: varchar('status', { length: 50 }).default('pending').notNull(),
  authPosition: varchar('auth_position', { length: 50 }).default('owner').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
});

export type UserStatus = 'pending' | 'active' | 'banned' | 'removed';
export type UserAuthPosition = 'admin' | 'owner' | 'ordinary';

// ==========================================
// 3. STORE_USERS (Junction)
// ==========================================
export const storeUsers = pgTable('store_users', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  storeId: bigint('store_id', { mode: 'number' })
    .notNull()
    .references(() => stores.id, { onDelete: 'cascade' }),
  userId: bigint('user_id', { mode: 'number' })
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
});

// ==========================================
// 4. EVENTS
// ==========================================
export const events = pgTable('events', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  name: varchar('name', { length: 200 }).notNull(),
  brideFirstname: varchar('bride_firstname', { length: 100 }),
  brideLastname: varchar('bride_lastname', { length: 100 }),
  groomFirstname: varchar('groom_firstname', { length: 100 }),
  groomLastname: varchar('groom_lastname', { length: 100 }),
  invitationDeadline: timestamp('invitation_deadline', { withTimezone: true, mode: 'string' }),
  eventDate: timestamp('event_date', { withTimezone: true, mode: 'string' }),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
});

// ==========================================
// 5. EVENT_USERS (Junction)
// ==========================================
export const eventUsers = pgTable('event_users', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  eventId: bigint('event_id', { mode: 'number' })
    .notNull()
    .references(() => events.id, { onDelete: 'cascade' }),
  userId: bigint('user_id', { mode: 'number' })
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
});

// ==========================================
// 6. GUEST_TABLES
// ==========================================
export const guestTables = pgTable('guest_tables', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  description: text('description'),
});

// ==========================================
// 7. INVITATIONS
// ==========================================
export const invitations = pgTable('invitations', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  eventId: bigint('event_id', { mode: 'number' })
    .notNull()
    .references(() => events.id, { onDelete: 'cascade' }),
  templateDetails: jsonb('template_details'),
});

// ==========================================
// 8. GUESTS
// ==========================================
export const guests = pgTable('guests', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  eventId: bigint('event_id', { mode: 'number' })
    .notNull()
    .references(() => events.id, { onDelete: 'cascade' }),
  firstname: varchar('firstname', { length: 100 }).notNull(),
  lastname: varchar('lastname', { length: 100 }).notNull(),
  linkId: varchar('link_id', { length: 100 }),
  status: varchar('status', { length: 50 }).default('pending'),
  tableId: bigint('table_id', { mode: 'number' }).references(() => guestTables.id, {
    onDelete: 'set null',
  }),
});

// ==========================================
// 9. REFRESH_TOKENS (Session & Auth Management)
// ==========================================
export const refreshTokens = pgTable('refresh_tokens', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  userId: bigint('user_id', { mode: 'number' })
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  token: varchar('token', { length: 500 }).notNull().unique(),
  expiresAt: timestamp('expires_at', { withTimezone: true, mode: 'string' }).notNull(),
  rememberMe: boolean('remember_me').default(false).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
  revokedAt: timestamp('revoked_at', { withTimezone: true, mode: 'string' }),
});

// ==========================================
// 10. EMAIL_VERIFICATIONS (Email Verification OTP)
// ==========================================
export const emailVerifications = pgTable('email_verifications', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  email: varchar('email', { length: 255 }).notNull(),
  code: varchar('code', { length: 10 }).notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true, mode: 'string' }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
});

// ==========================================
// DRIZZLE RELATIONS (For query API)
// ==========================================

export const storesRelations = relations(stores, ({ many }) => ({
  storeUsers: many(storeUsers),
}));

export const usersRelations = relations(users, ({ many }) => ({
  storeUsers: many(storeUsers),
  eventUsers: many(eventUsers),
  refreshTokens: many(refreshTokens),
}));

export const refreshTokensRelations = relations(refreshTokens, ({ one }) => ({
  user: one(users, {
    fields: [refreshTokens.userId],
    references: [users.id],
  }),
}));

export const storeUsersRelations = relations(storeUsers, ({ one }) => ({
  store: one(stores, {
    fields: [storeUsers.storeId],
    references: [stores.id],
  }),
  user: one(users, {
    fields: [storeUsers.userId],
    references: [users.id],
  }),
}));

export const eventsRelations = relations(events, ({ many }) => ({
  eventUsers: many(eventUsers),
  guests: many(guests),
  invitations: many(invitations),
}));

export const eventUsersRelations = relations(eventUsers, ({ one }) => ({
  event: one(events, {
    fields: [eventUsers.eventId],
    references: [events.id],
  }),
  user: one(users, {
    fields: [eventUsers.userId],
    references: [users.id],
  }),
}));

export const invitationsRelations = relations(invitations, ({ one }) => ({
  event: one(events, {
    fields: [invitations.eventId],
    references: [events.id],
  }),
}));

export const guestTablesRelations = relations(guestTables, ({ many }) => ({
  guests: many(guests),
}));

export const guestsRelations = relations(guests, ({ one }) => ({
  event: one(events, {
    fields: [guests.eventId],
    references: [events.id],
  }),
  table: one(guestTables, {
    fields: [guests.tableId],
    references: [guestTables.id],
  }),
}));

// ==========================================
// TYPE EXPORTS
// ==========================================
export type Store = InferSelectModel<typeof stores>;
export type NewStore = InferInsertModel<typeof stores>;

export type User = InferSelectModel<typeof users>;
export type NewUser = InferInsertModel<typeof users>;

export type StoreUser = InferSelectModel<typeof storeUsers>;
export type NewStoreUser = InferInsertModel<typeof storeUsers>;

export type Event = InferSelectModel<typeof events>;
export type NewEvent = InferInsertModel<typeof events>;

export type EventUser = InferSelectModel<typeof eventUsers>;
export type NewEventUser = InferInsertModel<typeof eventUsers>;

export type GuestTable = InferSelectModel<typeof guestTables>;
export type NewGuestTable = InferInsertModel<typeof guestTables>;

export type Invitation = InferSelectModel<typeof invitations>;
export type NewInvitation = InferInsertModel<typeof invitations>;

export type Guest = InferSelectModel<typeof guests>;
export type NewGuest = InferInsertModel<typeof guests>;

export type RefreshToken = InferSelectModel<typeof refreshTokens>;
export type NewRefreshToken = InferInsertModel<typeof refreshTokens>;

export type EmailVerification = InferSelectModel<typeof emailVerifications>;
export type NewEmailVerification = InferInsertModel<typeof emailVerifications>;

