import { defineEventHandler } from 'h3'
import { eq, desc } from 'drizzle-orm'
import { trips } from '../database/schema'

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)

  if (!session?.user?.id) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized: User session is required.'
    })
  }

  const userId = session.user.id

  try {
    const userTrips = await useDrizzle().query.trips.findMany({
      where: eq(trips.userId, userId),
      with: {
        chat: {
          columns: {
            id: true,
            title: true
          }
        }
      },
      orderBy: [desc(trips.createdAt)]
    })

    return userTrips
  } catch (e: unknown) {
    const errorMessage = e instanceof Error ? e.message : String(e)
    console.error('Error fetching trips:', errorMessage)
    throw createError({
      statusCode: 500,
      statusMessage: 'An error occurred while fetching trips. Please try again later.'
    })
  }
})
