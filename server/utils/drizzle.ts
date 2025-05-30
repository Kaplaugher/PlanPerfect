import { drizzle } from 'drizzle-orm/d1'

import * as schema from '../database/schema'

export { sql, eq, and, or } from 'drizzle-orm'

export const tables = schema

export function useDrizzle() {
  return drizzle(hubDatabase(), { schema })
}

export type Chat = typeof schema.chats.$inferSelect
export type Message = typeof schema.messages.$inferSelect
export type Trip = typeof schema.trips.$inferSelect
export type TripActivity = typeof schema.tripActivities.$inferSelect
export type User = typeof schema.users.$inferSelect
