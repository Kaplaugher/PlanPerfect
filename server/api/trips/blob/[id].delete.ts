import { eq } from 'drizzle-orm'

export default eventHandler(async (event) => {
  try {
    const tripId = getRouterParam(event, 'id')
    const session = await getUserSession(event)
    const userId = session.user?.id || session.id

    if (!tripId) {
      throw createError({
        statusCode: 400,
        message: 'Trip ID is required'
      })
    }

    if (!userId) {
      throw createError({
        statusCode: 401,
        message: 'Unauthorized'
      })
    }

    // Verify trip exists and belongs to user
    const trip = await useDrizzle().query.trips.findFirst({
      where: eq(tables.trips.id, tripId)
    })

    if (!trip || trip.userId !== userId) {
      throw createError({
        statusCode: 404,
        message: 'Trip not found or you do not have permission'
      })
    }

    // List all blobs for this trip
    const blobs = await hubBlob().list({
      prefix: `trips/${tripId}/`,
      limit: 100
    })

    // Delete each blob
    if (blobs.blobs?.length) {
      await Promise.all(blobs.blobs.map((blob: { pathname: string }) => hubBlob().del(blob.pathname)))
    }

    return { success: true }
  } catch (error) {
    console.error('Error deleting trip images:', error)
    throw createError({
      statusCode: 500,
      message: 'Failed to delete trip images'
    })
  }
})
