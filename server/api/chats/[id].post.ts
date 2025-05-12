import { streamText, generateText } from 'ai'
import { google } from '@ai-sdk/google' // Assuming this is the correct import

defineRouteMeta({
  openAPI: {
    description: 'Chat with AI.',
    tags: ['ai']
  }
})

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)

  const { id } = getRouterParams(event)
  // TODO: Use readValidatedBody
  const { messages } = await readBody(event) // We might want to remove 'model' from body if it's always Gemini Flash

  const db = useDrizzle()

  // Define the Gemini Flash model instance
  // Ensure GOOGLE_API_KEY is set in your environment variables
  const geminiModel = google('models/gemini-2.0-flash-lite')

  const chat = await db.query.chats.findFirst({
    where: (chat, { eq }) => and(eq(chat.id, id as string), eq(chat.userId, session.user?.id || session.id)),
    with: {
      messages: true
    }
  })
  if (!chat) {
    throw createError({ statusCode: 404, statusMessage: 'Chat not found' })
  }

  if (!chat.title) {
    const { text: title } = await generateText({
      model: geminiModel,
      system: `You are a title generator for a chat:
        - Generate a short title based on the first user's message
        - The title should be less than 30 characters long
        - The title should be a summary of the user's message
        - Do not use quotes (' or ") or colons (:) or any other punctuation
        - Do not use markdown, just plain text`,
      prompt: chat.messages[0]!.content
    })
    setHeader(event, 'X-Chat-Title', title.replace(/:/g, '').split('\n')[0])
    await db.update(tables.chats).set({ title }).where(eq(tables.chats.id, id as string))
  }

  const lastMessage = messages[messages.length - 1]
  if (lastMessage.role === 'user' && messages.length > 1) {
    // Ensure we only insert the actual last user message if it's new
    // This logic might need adjustment based on how messages are passed from the client
    const existingLastUserMessage = await db.query.messages.findFirst({
      where: (msg, { eq, and }) => and(
        eq(msg.chatId, id as string),
        eq(msg.role, 'user'),
        eq(msg.content, lastMessage.content)
      ),
      orderBy: (msg, { desc }) => desc(msg.createdAt)
    })

    if (!existingLastUserMessage) {
      await db.insert(tables.messages).values({
        chatId: id as string,
        role: 'user',
        content: lastMessage.content
      })
    }
  }

  return streamText({
    model: geminiModel, // Use the configured Gemini model
    system: `You are an AI assistant specialized in trip planning and journaling.

If the user wants to PLAN a new trip:
- Ask for the destination, length of the trip in days, and their main interests (e.g., restaurants, museums, outdoor activities, specific types of food).
- Based on this, provide a suggested itinerary with specific place recommendations.
- You should aim to eventually provide a structured summary including: destination, duration, overall summary, and a list of waypoints with names and ideally, general locations.

If the user wants to RECORD a past trip:
- Ask for the destination, approximate dates or duration of the trip.
- Encourage them to share highlights, places they visited, activities they did, and any memorable experiences or restaurants.
- You should aim to eventually provide a structured summary including: destination, dates/duration, overall summary, and a list of recorded activities/places with names and general locations.

For both planning and recording, be conversational and helpful. Clarify details as needed.`,
    messages,
    async onFinish(response) {
      // Save the assistant's final text response (if any)
      if (response.text) {
        await db.insert(tables.messages).values({
          chatId: chat.id,
          role: 'assistant',
          content: response.text
        })
      }
    }
  }).toDataStreamResponse()
})
