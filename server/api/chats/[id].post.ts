import { streamText } from 'ai'
import { createWorkersAI } from 'workers-ai-provider'

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
  const { model, messages } = await readBody(event)

  const db = useDrizzle()
  // Enable AI Gateway if defined in environment variables
  const gateway = process.env.CLOUDFLARE_AI_GATEWAY_ID
    ? {
        id: process.env.CLOUDFLARE_AI_GATEWAY_ID,
        cacheTtl: 60 * 60 * 24 // 24 hours
      }
    : undefined
  const workersAI = createWorkersAI({ binding: hubAI(), gateway })

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
    // @ts-expect-error - response is not typed
    const { response: title } = await hubAI().run('@cf/meta/llama-3.1-8b-instruct-fast', {
      stream: false,
      messages: [{
        role: 'system',
        content: `You are a title generator for a chat:
        - Generate a short title based on the first user's message
        - The title should be less than 30 characters long
        - The title should be a summary of the user's message
        - Do not use quotes (' or ") or colons (:) or any other punctuation
        - Do not use markdown, just plain text`
      }, {
        role: 'user',
        content: chat.messages[0]!.content
      }]
    }, {
      gateway
    })
    setHeader(event, 'X-Chat-Title', title.replace(/:/g, '').split('\n')[0])
    await db.update(tables.chats).set({ title }).where(eq(tables.chats.id, id as string))
  }

  const lastMessage = messages[messages.length - 1]
  if (lastMessage.role === 'user' && messages.length > 1) {
    await db.insert(tables.messages).values({
      chatId: id as string,
      role: 'user',
      content: lastMessage.content
    })
  }

  return streamText({
    model: workersAI(model),
    maxTokens: 10000,
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
      await db.insert(tables.messages).values({
        chatId: chat.id,
        role: 'assistant',
        content: response.text
      })
    }
  }).toDataStreamResponse()
})
