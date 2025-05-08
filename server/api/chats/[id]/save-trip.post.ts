import { randomUUID } from 'node:crypto'

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  const chatId = getRouterParam(event, 'id')

  if (!chatId) {
    throw createError({
      statusCode: 400,
      message: 'Chat ID is required'
    })
  }

  const db = useDrizzle()

  // Get the chat and its messages
  const chat = await db.query.chats.findFirst({
    where: (chat, { eq }) => and(
      eq(chat.id, chatId),
      eq(chat.userId, session.user?.id || session.id)
    ),
    with: {
      messages: true
    }
  })

  if (!chat) {
    throw createError({
      statusCode: 404,
      message: 'Chat not found or you do not have permission to access it'
    })
  }

  // Check if a trip already exists for this chat
  const existingTrip = await db.query.trips.findFirst({
    where: (trip, { eq }) => eq(trip.chatId, chatId)
  })

  if (existingTrip) {
    throw createError({
      statusCode: 400,
      message: 'A trip already exists for this chat'
    })
  }

  try {
    // Create a new trip
    await db.insert(tables.trips).values({
      id: randomUUID(),
      userId: session.user?.id || session.id,
      chatId: chat.id,
      title: chat.title || 'New Trip',
      status: 'planned',
      createdAt: new Date(),
      updatedAt: new Date()
    }).returning()
  } catch (error: unknown) {
    console.error('Error creating trip:', error)
    throw createError({
      statusCode: 500,
      message: error instanceof Error ? error.message : 'Failed to create trip'
    })
  }
})
