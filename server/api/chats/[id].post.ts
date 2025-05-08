import { streamText } from 'ai'
import { createWorkersAI } from 'workers-ai-provider'
import { z } from 'zod'

defineRouteMeta({
  openAPI: {
    description: 'Chat with AI.',
    tags: ['ai']
  }
})

// Zod Schemas for structured trip data
const tripActivitySchema = z.object({
  name: z.string().describe('Name of the activity, restaurant, or attraction.'),
  description: z.string().optional().describe('Brief description or notes about the activity.'),
  date: z.string().optional().describe('Date of the activity (e.g., YYYY-MM-DD or a general descriptor like \'Day 1\').'),
  locationName: z.string().optional().describe('Name of the location (e.g., \'Eiffel Tower\', \'Louvre Museum\').'),
  latitude: z.number().optional().describe('Latitude of the location. Omit if not known.'),
  longitude: z.number().optional().describe('Longitude of the location. Omit if not known.'),
  type: z.enum(['attraction', 'restaurant', 'activity', 'note', 'other']).optional().describe('Type of activity.'),
  order: z.number().optional().describe('Order of the activity for the day/trip.')
})

const tripDetailsSchema = z.object({
  title: z.string().describe('A concise and descriptive title for the trip (e.g., \'Paris Adventure Spring 2024\', \'Kyoto Culinary Journey\').'),
  status: z.enum(['planned', 'recorded']).describe('Status of the trip: \'planned\' for future trips, \'recorded\' for past trips.'),
  destination: z.string().optional().describe('Main destination of the trip (e.g., \'Paris, France\', \'Tokyo, Japan\').'),
  startDate: z.string().optional().describe('Start date of the trip (e.g., YYYY-MM-DD). Omit if not specified.'),
  endDate: z.string().optional().describe('End date of the trip (e.g., YYYY-MM-DD). Omit if not specified.'),
  summary: z.string().optional().describe('A brief overall summary of the trip plan or journal.'),
  activities: z.array(tripActivitySchema).optional().describe('List of activities, attractions, or waypoints for the trip. Omit if no specific activities are detailed yet.')
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
      // Save the assistant's final text response (if any)
      if (response.text) {
        await db.insert(tables.messages).values({
          chatId: chat.id,
          role: 'assistant',
          content: response.text // This might be a confirmation like "Okay, I've processed the trip details!"
        })
      }
    }
  }).toDataStreamResponse()
})
