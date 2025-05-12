import { randomUUID } from 'node:crypto'
import { and, eq } from 'drizzle-orm'
import type { z } from 'zod'
import { google } from '@ai-sdk/google'
import { generateText } from 'ai'
import { tripDetailsSchema, type tripActivitySchema } from '../../../utils/aiSchemas'

// Define allowed status values based on DB schema
// Note: Keep this in sync with server/database/schema.ts trips.status enum
const allowedStatuses = ['planned', 'recorded', 'completed', 'booked', 'cancelled'] as const

// Helper to convert string dates (YYYY-MM-DD or other formats) to Date or null
function parseOptionalDate(dateString: string | null | undefined): Date | null {
  if (!dateString) return null
  try {
    const date = new Date(dateString)
    // Basic validation: Check if the date is valid
    return isNaN(date.getTime()) ? null : date
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (_e) { // Mark unused catch variable
    return null
  }
}

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  const chatId = getRouterParam(event, 'id')
  const userId = session.user?.id || session.id

  if (!chatId) {
    throw createError({ statusCode: 400, message: 'Chat ID is required' })
  }
  if (!userId) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const db = useDrizzle()

  // 1. Fetch Chat and User, check permissions and existing trip
  const [chat, user, existingTrip] = await Promise.all([
    db.query.chats.findFirst({
      where: and(eq(tables.chats.id, chatId), eq(tables.chats.userId, userId)),
      with: { messages: { orderBy: (msg, { asc }) => asc(msg.createdAt), limit: 50 } } // Get messages for AI
    }),
    db.query.users.findFirst({ where: eq(tables.users.id, userId) }),
    db.query.trips.findFirst({ where: eq(tables.trips.chatId, chatId) })
  ])

  if (!chat) {
    throw createError({ statusCode: 404, message: 'Chat not found or permission denied' })
  }
  if (!user) {
    // This case should be rare if session is valid, but good to check
    throw createError({ statusCode: 400, message: 'User not found in database' })
  }
  if (existingTrip) {
    throw createError({ statusCode: 400, message: 'A trip already exists for this chat' })
  }
  if (!chat.messages || chat.messages.length === 0) {
    throw createError({ statusCode: 400, message: 'Chat has no messages to process' })
  }

  // 2. Prepare and run AI processing using Gemini via AI SDK
  const systemPrompt = `Your task is to analyze the provided user messages and extract structured trip information into a JSON object.

RESPONSE REQUIREMENTS:
- Your entire response MUST be a single, valid JSON object.
- Do NOT include any text before or after the JSON object.
- Do NOT use markdown formatting (like \`\`\`json).
- Structure the JSON according to the following schema. Use 'null' for any optional field where the information is not explicitly mentioned in the messages.

JSON Schema:
{
  "title": "string | null",
  "status": "string | null (one of: ${allowedStatuses.join(', ')})",
  "destination": "string | null",
  "startDate": "string | null (ISO 8601 format YYYY-MM-DD)",
  "endDate": "string | null (ISO 8601 format YYYY-MM-DD)",
  "summary": "string | null",
  "activities": [
    {
      "name": "string (required)",
      "description": "string | null",
      "locationName": "string | null",
      "date": "string | null (ISO 8601 format YYYY-MM-DD)",
      "latitude": "number | null",
      "longitude": "number | null",
      "type": "string | null ('attraction', 'restaurant', 'activity', 'note', 'other')",
      "order": "number | null"
    }
  ]
}

Carefully review the messages and extract the relevant details into this JSON format. If a detail for an optional field (like startDate, endDate, description, locationName, etc.) is not found, use null as its value. Ensure the final output is only the complete JSON object.`

  // Filter for user messages ONLY for this extraction task
  const userMessagesOnly = chat.messages
    .filter(msg => msg.role === 'user')
    .map(msg => ({ role: msg.role, content: msg.content }))

  // Check if there are any user messages to process
  if (userMessagesOnly.length === 0) {
    console.warn('No user messages found in the chat to process for trip saving.')
    // Handle this case - perhaps create a default trip or throw an error
    throw createError({ statusCode: 400, message: 'No user content available to create a trip.' })
  }

  let rawAiResponse: string | undefined
  try {
    // Instantiate the Gemini model
    // Ensure GOOGLE_API_KEY is available in the environment
    const geminiModel = google('models/gemini-2.0-flash-lite')

    console.log('Sending request to Gemini model for trip extraction...')
    // Log the messages being sent (USER MESSAGES ONLY)
    console.log('System Prompt:', systemPrompt)
    console.log('Messages (User Only):', JSON.stringify(userMessagesOnly, null, 2))

    // Capture the full response object
    const aiResponse = await generateText({
      model: geminiModel,
      system: systemPrompt,
      messages: userMessagesOnly // Pass only user messages
    })

    // Log the full AI response
    console.log('Full AI Response Object:', JSON.stringify(aiResponse, null, 2))

    rawAiResponse = aiResponse.text // Extract text after logging
    console.log('Received text from Gemini model:', rawAiResponse)

    if (!rawAiResponse) {
      // Add more context to the error log
      console.error('AI text response is empty. Finish Reason:', aiResponse.finishReason, 'Usage:', aiResponse.usage)
      throw new Error('AI returned an empty response.') // Keep original error message for consistency
    }

    // 3. Parse and Validate AI Response
    let parsedJson: unknown
    let stringToParse = rawAiResponse

    // First, try to strip markdown fences if they exist
    const markdownMatch = rawAiResponse.match(/```(?:json)?\s*([\s\S]*?)\s*```/)
    if (markdownMatch && markdownMatch[1]) {
      console.log('Markdown fences detected, extracting JSON content.')
      stringToParse = markdownMatch[1].trim()
    } else {
      console.log('No markdown fences detected.')
      // Use raw response directly if no fences
      stringToParse = rawAiResponse.trim()
    }

    try {
      // Attempt to parse the potentially cleaned string
      parsedJson = JSON.parse(stringToParse)
      console.log('Successfully parsed initial/cleaned JSON.')
    } catch (parseError: unknown) {
      console.warn('Initial/Cleaned JSON parsing failed:', parseError instanceof Error ? parseError.message : parseError)
      console.log('Attempting truncation fix for string:', stringToParse)
      parsedJson = null // Default to null if fix fails

      // Attempt to fix truncation if it looks like an incomplete object
      if (stringToParse && stringToParse.startsWith('{') && !stringToParse.endsWith('}')) {
        let fixedJsonStr = stringToParse
        const openBraces = (fixedJsonStr.match(/\{/g) || []).length
        const closeBraces = (fixedJsonStr.match(/\}/g) || []).length
        const openBrackets = (fixedJsonStr.match(/\[/g) || []).length
        const closeBrackets = (fixedJsonStr.match(/]/g) || []).length

        if (fixedJsonStr.includes('"activities": [') && openBrackets > closeBrackets) {
          fixedJsonStr += ']'.repeat(openBrackets - closeBrackets)
        }
        if (openBraces > closeBraces) {
          fixedJsonStr += '}'.repeat(openBraces - closeBraces)
        }

        console.log('Attempting to parse fixed JSON:', fixedJsonStr)
        try {
          parsedJson = JSON.parse(fixedJsonStr) // Try parsing the fixed string
          console.log('Successfully parsed after truncation fix.')
        } catch (fixParseError: unknown) {
          console.error('Failed to parse JSON even after truncation fix:', fixParseError instanceof Error ? fixParseError.message : fixParseError)
          // Keep parsedJson as null
        }
      } else {
        console.log('String does not appear to be a truncated object, skipping fix.')
      }
      // If fix wasn't attempted or failed, parsedJson remains null
      if (parsedJson === null) {
        console.log('String causing parse error (final):\n', stringToParse) // Log the string that failed
        console.log('Original Raw AI Response was:\n', rawAiResponse) // Also log original raw response
      }
    }

    const validationResult = tripDetailsSchema.safeParse(parsedJson)

    let finalTripData: z.infer<typeof tripDetailsSchema>

    if (!validationResult.success) {
      console.error('AI response validation failed:', validationResult.error.flatten())
      console.log('Parsed JSON causing validation error:\n', JSON.stringify(parsedJson, null, 2))
      console.log('Original Raw AI response:\n', rawAiResponse)
      // Fallback: Create a minimal trip
      finalTripData = {
        title: chat.title || 'New Trip', // Use chat title as fallback
        status: 'planned', // Default status
        destination: undefined, // Use undefined for optional fields
        startDate: undefined,
        endDate: undefined,
        summary: 'Trip details could not be automatically extracted.', // Or undefined
        activities: []
      }
    } else {
      finalTripData = validationResult.data
      console.log('Successfully parsed and validated trip data.')
    }

    // Determine the final title for the database
    let dbTripTitle: string | null
    if (finalTripData.title && finalTripData.title.trim() !== '') {
      dbTripTitle = finalTripData.title.trim()
    } else if (finalTripData.destination && finalTripData.destination.trim() !== '') {
      dbTripTitle = `Trip to ${finalTripData.destination.trim()}`
    } else if (chat.title && chat.title.trim() !== '') {
      dbTripTitle = chat.title.trim()
    } else {
      dbTripTitle = 'New Trip' // Final fallback
    }
    // Ensure title isn't excessively long if generated
    if (dbTripTitle.length > 100) {
      dbTripTitle = dbTripTitle.substring(0, 97) + '...'
    }

    // 4. Save Trip and Activities to Database
    const tripId = randomUUID()

    await db.insert(tables.trips).values({
      id: tripId,
      userId: user.id,
      chatId: chat.id,
      title: dbTripTitle, // Use the determined title
      // Use default 'planned' if status is null or invalid, otherwise use validated status
      status: (finalTripData.status && allowedStatuses.includes(finalTripData.status)) ? finalTripData.status : 'planned',
      destination: finalTripData.destination, // Already optional/nullable
      startDate: parseOptionalDate(finalTripData.startDate), // Convert string to Date or null
      endDate: parseOptionalDate(finalTripData.endDate), // Convert string to Date or null
      summary: finalTripData.summary, // Already optional/nullable
      createdAt: new Date(),
      updatedAt: new Date()
    })

    // Insert activities if present and valid
    if (finalTripData.activities && finalTripData.activities.length > 0) {
      console.log(`Inserting ${finalTripData.activities.length} activities...`)
      const activitiesValues = finalTripData.activities
        .filter((activity: z.infer<typeof tripActivitySchema> | null | undefined): activity is z.infer<typeof tripActivitySchema> & { name: string } => !!activity?.name)
        .map((activity: z.infer<typeof tripActivitySchema> & { name: string }, index: number) => ({
          id: randomUUID(),
          tripId,
          name: activity.name,
          description: activity.description,
          date: parseOptionalDate(activity.date), // Convert string to Date or null
          locationName: activity.locationName,
          latitude: activity.latitude,
          longitude: activity.longitude,
          type: activity.type,
          order: activity.order ?? index, // Use provided order or fallback to index
          createdAt: new Date(),
          updatedAt: new Date()
        }))

      // Insert activities (consider batching for large numbers if needed)
      for (const activityValue of activitiesValues) {
        try {
          await db.insert(tables.tripActivities).values(activityValue)
        } catch (activityInsertError) {
          console.error(`Failed to insert activity '${activityValue.name}':`, activityInsertError)
          // Decide whether to continue or throw/rollback
        }
      }
      console.log('Finished inserting activities.')
    } else {
      console.log('No valid activities found in AI response to insert.')
    }

    // 5. Return the created trip
    const createdTrip = await db.query.trips.findFirst({
      where: eq(tables.trips.id, tripId),
      with: { activities: true } // Include activities in the response
    })

    return createdTrip
  } catch (error: unknown) {
    console.error('Error processing save-trip request:', error)
    // Log the raw AI response if available and an error occurred during its processing phase
    if (rawAiResponse !== undefined) {
      console.log('Raw AI Response at time of error:\n', rawAiResponse)
    }
    const message = error instanceof Error ? error.message : 'An unexpected error occurred'
    const statusCode = error instanceof Error && 'statusCode' in error ? error.statusCode as number : 500
    throw createError({ statusCode, message })
  }
})
