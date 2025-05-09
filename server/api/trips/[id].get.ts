import { defineEventHandler } from 'h3'

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  const tripId = getRouterParam(event, 'id')

  if (!tripId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Trip ID is required'
    })
  }

  const userId = session.user?.id || session.id

  if (!userId) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized: User session is required.'
    })
  }

  try {
    const trip = await useDrizzle().query.trips.findFirst({
      where: (trip, { eq, and }) => and(
        eq(trip.id, tripId),
        eq(trip.userId, userId)
      ),
      with: {
        activities: {
          orderBy: (activities, { asc }) => [asc(activities.order)]
        }
      }
    })

    if (!trip) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Trip not found or you do not have permission to access it'
      })
    }

    return trip
  } catch (e: unknown) {
    const errorMessage = e instanceof Error ? e.message : String(e)
    console.error('Error fetching trip details:', errorMessage)

    // Check if it's already a H3 error
    if (typeof e === 'object' && e !== null && 'statusCode' in e) {
      throw e
    }

    throw createError({
      statusCode: 500,
      statusMessage: 'An error occurred while fetching trip details. Please try again later.'
    })
  }
})
