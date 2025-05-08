import { defineEventHandler, getRouterParam } from 'h3'

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  const tripId = getRouterParam(event, 'id')

  if (!session?.user?.id) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized: User session is required.'
    })
  }

  if (!tripId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Bad Request: Trip ID is required.'
    })
  }

  const userId = session.user.id

  try {
    const tripDetails = await useDrizzle().query.trips.findFirst({
      where: (tripsTable, { eq, and }) =>
        and(eq(tripsTable.id, tripId), eq(tripsTable.userId, userId)),
      with: {
        chat: {
          with: {
            messages: {
              orderBy: (messagesTable, { asc }) => [asc(messagesTable.createdAt)]
            }
          }
        },
        activities: {
          orderBy: (activitiesSchema, { asc }) =>
            [asc(activitiesSchema.date), asc(activitiesSchema.createdAt)]
        }
      }
    })

    if (!tripDetails) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Trip not found or you do not have permission to view it.'
      })
    }

    return tripDetails
  } catch (e: unknown) {
    if (typeof e === 'object' && e !== null && 'statusCode' in e) {
      const errorWithStatusCode = e as { statusCode: number, statusMessage?: string, [key: string]: unknown }
      if (errorWithStatusCode.statusCode) {
        throw e
      }
    }
    const errorMessage = e instanceof Error ? e.message : String(e)
    console.error(`Error fetching trip ${tripId}:`, errorMessage)
    throw createError({
      statusCode: 500,
      statusMessage: 'An error occurred while fetching the trip details. Please try again later.'
    })
  }
})
