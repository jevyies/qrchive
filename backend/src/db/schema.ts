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
  firstname: varchar('firstname', { length: 100 }),
  middlename: varchar('middlename', { length: 100 }),
  lastname: varchar('lastname', { length: 100 }),
  extname: varchar('extname', { length: 20 }),
  email: varchar('email', { length: 255 }).unique(),
  username: varchar('username', { length: 100 }).unique(),
  password: varchar('password', { length: 255 }), // nullable for OAuth-only users or email-only users
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
  userId: bigint('user_id', { mode: 'number' })
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  token: varchar('token', { length: 255 }).unique(),
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
// 5. GUEST_TABLES
// ==========================================
export const guestTables = pgTable('guest_tables', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  description: text('description'),
});

// ==========================================
// 6. INVITATIONS
// ==========================================
export const invitations = pgTable('invitations', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  eventId: bigint('event_id', { mode: 'number' })
    .notNull()
    .references(() => events.id, { onDelete: 'cascade' }),
  templateDetails: jsonb('template_details'),
});

// ==========================================
// 7. GUESTS
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
// 8. REFRESH_TOKENS (Session & Auth Management)
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
// 9. EMAIL_VERIFICATIONS (Email Verification OTP)
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
// 10. SNAP_GUESTS (Event Snap Guests & Devices)
// ==========================================
export const snapGuests = pgTable('snap_guests', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  guestCode: varchar('guest_code', { length: 255 }).unique(),
  eventId: bigint('event_id', { mode: 'number' })
    .notNull()
    .references(() => events.id, { onDelete: 'cascade' }),
  deviceSerial: varchar('device_serial', { length: 255 }),
  deviceName: varchar('device_name', { length: 255 }),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
});

// ==========================================
// 11. SNAP_CHECKLIST (Event Photo Scavenger Hunt / Capture Checklist)
// ==========================================
export const snapChecklist = pgTable('snap_checklist', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  eventId: bigint('event_id', { mode: 'number' })
    .notNull()
    .references(() => events.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
});

// Backward-compatibility alias
export const snapChecklists = snapChecklist;

// ==========================================
// 12. SNAP_PHOTOS (Event Photos with R2 Storage & Chunking)
// ==========================================
export const snapPhotos = pgTable('snap_photos', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  uploadedBy: bigint('uploaded_by', { mode: 'number' })
    .references(() => snapGuests.id, { onDelete: 'set null' }),
  checklistId: bigint('checklist_id', { mode: 'number' })
    .references(() => snapChecklist.id, { onDelete: 'set null' }),
  url: text('url').default('').notNull(),
  fileName: varchar('file_name', { length: 255 }),
  fileSize: bigint('file_size', { mode: 'number' }),
  mimeType: varchar('mime_type', { length: 100 }),
  storageKey: text('storage_key'),
  totalChunks: bigint('total_chunks', { mode: 'number' }).default(1),
  status: varchar('status', { length: 50 }).default('pending').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
});

// Backward-compatibility alias
export const photos = snapPhotos;

// ==========================================
// 13. EVENT_PHOTOS (Event Photos directly linked to Events)
// ==========================================
export const eventPhotos = pgTable('event_photos', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  eventId: bigint('event_id', { mode: 'number' })
    .notNull()
    .references(() => events.id, { onDelete: 'cascade' }),
  url: text('url').default('').notNull(),
  fileName: varchar('file_name', { length: 255 }),
  fileSize: bigint('file_size', { mode: 'number' }),
  mimeType: varchar('mime_type', { length: 100 }),
  storageKey: text('storage_key'),
  totalChunks: bigint('total_chunks', { mode: 'number' }).default(1),
  status: varchar('status', { length: 50 }).default('pending').notNull(),
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
  events: many(events),
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

export const eventsRelations = relations(events, ({ one, many }) => ({
  user: one(users, {
    fields: [events.userId],
    references: [users.id],
  }),
  guests: many(guests),
  invitations: many(invitations),
  snapGuests: many(snapGuests),
  snapChecklists: many(snapChecklist),
  eventPhotos: many(eventPhotos),
}));

export const snapGuestsRelations = relations(snapGuests, ({ one, many }) => ({
  event: one(events, {
    fields: [snapGuests.eventId],
    references: [events.id],
  }),
  photos: many(snapPhotos),
}));

export const snapChecklistRelations = relations(snapChecklist, ({ one, many }) => ({
  event: one(events, {
    fields: [snapChecklist.eventId],
    references: [events.id],
  }),
  photos: many(snapPhotos),
}));

// Backward-compatibility alias
export const snapChecklistsRelations = snapChecklistRelations;

export const snapPhotosRelations = relations(snapPhotos, ({ one }) => ({
  guest: one(snapGuests, {
    fields: [snapPhotos.uploadedBy],
    references: [snapGuests.id],
  }),
  checklist: one(snapChecklist, {
    fields: [snapPhotos.checklistId],
    references: [snapChecklist.id],
  }),
}));

export const eventPhotosRelations = relations(eventPhotos, ({ one }) => ({
  event: one(events, {
    fields: [eventPhotos.eventId],
    references: [events.id],
  }),
}));

// Backward-compatibility alias
export const photosRelations = snapPhotosRelations;

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

export type SnapGuest = InferSelectModel<typeof snapGuests>;
export type NewSnapGuest = InferInsertModel<typeof snapGuests>;

export type SnapChecklist = InferSelectModel<typeof snapChecklist>;
export type NewSnapChecklist = InferInsertModel<typeof snapChecklist>;

export type SnapPhoto = InferSelectModel<typeof snapPhotos>;
export type NewSnapPhoto = InferInsertModel<typeof snapPhotos>;

export type EventPhoto = InferSelectModel<typeof eventPhotos>;
export type NewEventPhoto = InferInsertModel<typeof eventPhotos>;

export type Photo = SnapPhoto;
export type NewPhoto = NewSnapPhoto;

