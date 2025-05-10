export default eventHandler(async (event) => {
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
      message: 'Unauthorized: User session is required'
    })
  }

  // Verify the trip exists and belongs to the user
  const db = useDrizzle()
  const trip = await db.query.trips.findFirst({
    where: (trip, { eq, and }) => and(
      eq(trip.id, tripId),
      eq(trip.userId, userId)
    )
  })

  if (!trip) {
    throw createError({
      statusCode: 404,
      message: 'Trip not found or you do not have permission to access it'
    })
  }

  // List blobs with prefix for this trip
  const { blobs } = await hubBlob().list({
    limit: 100,
    prefix: `trips/${tripId}/` // Organize files by trip ID
  })

  return blobs
})
