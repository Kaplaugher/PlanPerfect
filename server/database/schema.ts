import { randomUUID } from 'node:crypto'
import { sql, relations } from 'drizzle-orm'
import { sqliteTable, text, integer, index, unique, real } from 'drizzle-orm/sqlite-core'

export const users = sqliteTable('users', {
  id: text().primaryKey().$defaultFn(() => randomUUID()),
  email: text().notNull(),
  name: text().notNull(),
  avatar: text().notNull(),
  username: text().notNull(),
  provider: text({ enum: ['github'] }).notNull(),
  providerId: integer().notNull(),
  createdAt: integer({ mode: 'timestamp' }).notNull().default(sql`(unixepoch())`)
}, t => [
  unique().on(t.provider, t.providerId)
])

export const usersRelations = relations(users, ({ many }) => ({
  chats: many(chats),
  trips: many(trips)
}))

export const chats = sqliteTable('chats', {
  id: text().primaryKey().$defaultFn(() => randomUUID()),
  title: text(),
  userId: text().notNull(),
  createdAt: integer({ mode: 'timestamp' }).notNull().default(sql`(unixepoch())`)
}, t => [
  index('userIdIdx').on(t.userId)
])

export const chatsRelations = relations(chats, ({ one, many }) => ({
  user: one(users, {
    fields: [chats.userId],
    references: [users.id]
  }),
  messages: many(messages),
  trip: one(trips, {
    fields: [chats.id],
    references: [trips.chatId]
  }) // A chat can be associated with one trip
}))

export const messages = sqliteTable('messages', {
  id: text().primaryKey().$defaultFn(() => randomUUID()),
  chatId: text().notNull().references(() => chats.id, { onDelete: 'cascade' }),
  role: text({ enum: ['user', 'assistant'] }).notNull(),
  content: text().notNull(),
  createdAt: integer({ mode: 'timestamp' }).notNull().default(sql`(unixepoch())`)
}, t => [
  index('chatIdIdx').on(t.chatId)
])

export const messagesRelations = relations(messages, ({ one }) => ({
  chat: one(chats, {
    fields: [messages.chatId],
    references: [chats.id]
  })
}))

export const trips = sqliteTable('trips', {
  id: text().primaryKey().$defaultFn(() => randomUUID()),
  userId: text().notNull().references(() => users.id, { onDelete: 'cascade' }),
  chatId: text().notNull().unique().references(() => chats.id, { onDelete: 'cascade' }), // Each trip is linked to a unique chat session
  title: text(), // Allow null title
  status: text({ enum: ['planned', 'recorded', 'completed', 'booked', 'cancelled'] }).notNull().default('planned'), // Expand enum, keep notNull, provide default
  destination: text(),
  startDate: integer({ mode: 'timestamp' }), // Already nullable
  endDate: integer({ mode: 'timestamp' }), // Already nullable
  summary: text(),
  createdAt: integer({ mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer({ mode: 'timestamp' }).notNull().default(sql`(unixepoch())`).$onUpdate(() => sql`(unixepoch())`)
}, t => [
  index('tripUserIdIdx').on(t.userId),
  index('tripChatIdIdx').on(t.chatId)
])

export const tripsRelations = relations(trips, ({ one, many }) => ({
  user: one(users, {
    fields: [trips.userId],
    references: [users.id]
  }),
  chat: one(chats, {
    fields: [trips.chatId],
    references: [chats.id]
  }),
  activities: many(tripActivities)
}))

export const tripActivities = sqliteTable('trip_activities', {
  id: text().primaryKey().$defaultFn(() => randomUUID()),
  tripId: text().notNull().references(() => trips.id, { onDelete: 'cascade' }),
  name: text().notNull(),
  description: text(),
  date: integer({ mode: 'timestamp' }),
  locationName: text(),
  latitude: real(), // For map coordinates
  longitude: real(), // For map coordinates
  type: text({ enum: ['attraction', 'restaurant', 'activity', 'note', 'other'] }),
  order: integer(),
  createdAt: integer({ mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer({ mode: 'timestamp' }).notNull().default(sql`(unixepoch())`).$onUpdate(() => sql`(unixepoch())`)
}, t => [
  index('activityTripIdIdx').on(t.tripId)
])

export const tripActivitiesRelations = relations(tripActivities, ({ one }) => ({
  trip: one(trips, {
    fields: [tripActivities.tripId],
    references: [trips.id]
  })
}))
