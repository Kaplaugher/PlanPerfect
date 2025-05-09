import { randomUUID } from 'node:crypto'
import type { z } from 'zod'
import type { tripActivitySchema } from '../../../utils/aiSchemas'
import { tripDetailsSchema } from '../../../utils/aiSchemas'

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

  // Verify user exists in the database
  const userId = session.user?.id || session.id
  const user = await db.query.users.findFirst({
    where: (user, { eq }) => eq(user.id, userId)
  })

  if (!user) {
    throw createError({
      statusCode: 400,
      message: 'User not found in database'
    })
  }

  try {
    // Setup AI to process the chat
    const gateway = process.env.CLOUDFLARE_AI_GATEWAY_ID
      ? {
          id: process.env.CLOUDFLARE_AI_GATEWAY_ID,
          cacheTtl: 60 * 60 * 24 // 24 hours
        }
      : undefined

    // Format chat messages for AI processing
    const aiMessages = [
      {
        role: 'system',
        content: `You are a trip planning assistant that analyzes conversations and extracts structured trip information.
        
Extract trip details and activities from the conversation. FORMAT YOUR RESPONSE AS VALID JSON ONLY, no explanation text, just the JSON object.

Follow this schema:
${JSON.stringify(tripDetailsSchema.shape, null, 2)}

Important guidance for the 'activities' field:
- Activities MUST be a flat array of objects, NOT a nested object with categories
- Each activity object should include at minimum a 'name' field
- Include description, location, and other available details when mentioned
- Classify activities using the 'type' field as one of: "attraction", "restaurant", "activity", "note", or "other"

Only include information that is explicitly mentioned in the conversation.
If information is not available, exclude those fields rather than making assumptions.

ALWAYS RETURN COMPLETE, VALID JSON. DO NOT TRUNCATE YOUR RESPONSE.
`
      },
      ...chat.messages.map(msg => ({
        role: msg.role,
        content: msg.content
      }))
    ]

    // Process with AI to extract structured trip data
    let tripDataJson
    try {
      // @ts-expect-error - response is not fully typed
      const { response } = await hubAI().run('@cf/meta/llama-3.1-8b-instruct-fast', {
        stream: false,
        messages: aiMessages
      }, { gateway })

      tripDataJson = response
    } catch (aiError) {
      console.error('Error calling AI service:', aiError)
      throw createError({
        statusCode: 500,
        message: 'Failed to process trip data with AI'
      })
    }

    // Added logging to see raw AI response
    console.log('Raw AI response:', tripDataJson)

    // Parse the AI response
    const tripData = parseTripDataFromAI(tripDataJson)

    // Log parsed data for debugging
    console.log('Parsed trip data:', JSON.stringify(tripData))

    // Create a new trip
    const tripId = randomUUID()
    await db.insert(tables.trips).values({
      id: tripId,
      userId: user.id,
      chatId: chat.id,
      title: tripData.title || chat.title || 'New Trip',
      status: tripData.status || 'planned',
      destination: tripData.destination,
      startDate: tripData.startDate ? new Date(tripData.startDate) : undefined,
      endDate: tripData.endDate ? new Date(tripData.endDate) : undefined,
      summary: tripData.summary,
      createdAt: new Date(),
      updatedAt: new Date()
    })

    // Add activities if available
    if (tripData.activities && Array.isArray(tripData.activities) && tripData.activities.length > 0) {
      console.log(`Adding ${tripData.activities.length} activities`)

      try {
        const activitiesValues = tripData.activities
          .filter((activity: Record<string, unknown>) => activity && typeof activity === 'object' && activity.name)
          .map((activity: z.infer<typeof tripActivitySchema>, index: number) => {
            // Log each activity being processed
            console.log('Processing activity:', activity)

            return {
              id: randomUUID(),
              tripId,
              name: activity.name || 'Untitled Activity',
              description: activity.description || null,
              date: activity.date ? new Date(activity.date) : null,
              locationName: activity.locationName || null,
              latitude: activity.latitude || null,
              longitude: activity.longitude || null,
              type: activity.type || 'other',
              order: activity.order || index,
              createdAt: new Date(),
              updatedAt: new Date()
            }
          })

        // Log the activities values before insertion
        console.log('Activities values for insertion:', JSON.stringify(activitiesValues))

        // Insert the activities one by one to pinpoint any issues
        for (const activityValue of activitiesValues) {
          try {
            await db.insert(tables.tripActivities).values(activityValue)
            console.log(`Successfully inserted activity: ${activityValue.name}`)
          } catch (err) {
            console.error(`Error inserting activity ${activityValue.name}:`, err)
          }
        }
      } catch (activityError) {
        console.error('Error processing activities:', activityError)
      }
    } else {
      console.log('No activities to add. Activities data:', tripData.activities)
    }

    // Fetch and return the created trip with activities
    const createdTrip = await db.query.trips.findFirst({
      where: (trip, { eq }) => eq(trip.id, tripId),
      with: {
        activities: true
      }
    })

    return createdTrip
  } catch (error: unknown) {
    console.error('Error creating trip:', error)
    throw createError({
      statusCode: 500,
      message: error instanceof Error ? error.message : 'Failed to create trip'
    })
  }
})

// Helper function to parse the AI response and handle potential JSON parsing errors
function parseTripDataFromAI(aiResponse: string): z.infer<typeof tripDetailsSchema> {
  try {
    // Try to extract JSON from the response (in case AI wraps it with text)
    const jsonMatch = aiResponse.match(/```json\s*([\s\S]*?)\s*```/)
      || aiResponse.match(/```\s*([\s\S]*?)\s*```/)
      || aiResponse.match(/\{[\s\S]*\}/)

    // If no valid JSON pattern was found, return default values
    if (!jsonMatch) {
      console.error('No valid JSON pattern found in AI response')
      return { title: 'New Trip', status: 'planned' }
    }

    let jsonStr = jsonMatch[0]

    // Clean up the JSON string
    jsonStr = jsonStr.replace(/```json|```/g, '').trim()

    // Try to fix truncated JSON by adding missing closing braces
    try {
      JSON.parse(jsonStr)
    } catch (parseError) {
      console.warn('Initial JSON parsing failed, attempting to fix truncated JSON', parseError)

      // Check if it looks like a truncated JSON object or array
      if (jsonStr.includes('{') && !jsonStr.endsWith('}')) {
        // Count opening and closing braces to determine how many to add
        const openBraces = (jsonStr.match(/\{/g) || []).length
        const closeBraces = (jsonStr.match(/\}/g) || []).length
        const missingBraces = openBraces - closeBraces

        if (missingBraces > 0) {
          jsonStr += '}'.repeat(missingBraces)
        }
      }

      // Check for truncated activities array
      if (jsonStr.includes('"activities": [') && !jsonStr.includes('"]')) {
        // Add closing bracket for activities array if missing
        if (!jsonStr.includes(']}')) {
          jsonStr += ']}'
        }
      }
    }

    // Attempt to parse the potentially fixed JSON
    let parsedData
    try {
      parsedData = JSON.parse(jsonStr)
    } catch (finalParseError) {
      console.error('Failed to parse JSON even after attempting fixes:', finalParseError)
      console.log('Final JSON string attempt:', jsonStr)
      return { title: 'New Trip', status: 'planned' }
    }

    // Handle nested activities structure if present
    if (parsedData.activities && typeof parsedData.activities === 'object' && !Array.isArray(parsedData.activities)) {
      console.log('Found nested activities structure, flattening...')
      const flattenedActivities: z.infer<typeof tripActivitySchema>[] = []

      // Iterate through each category and its activities
      Object.entries(parsedData.activities).forEach(([category, categoryActivities]: [string, unknown]) => {
        if (Array.isArray(categoryActivities)) {
          // Add each activity with the category as context
          categoryActivities.forEach((activity: Record<string, unknown>) => {
            if (activity && typeof activity === 'object' && activity.name) {
              flattenedActivities.push({
                name: activity.name as string,
                description: activity.description as string || `${category}: ${activity.name as string}`,
                type: determineActivityType(activity.name as string, category),
                locationName: activity.locationName as string,
                date: activity.date as string,
                latitude: activity.latitude as number,
                longitude: activity.longitude as number,
                order: activity.order as number
              })
            }
          })
        }
      })

      // Replace the nested structure with the flattened array
      parsedData.activities = flattenedActivities
      console.log(`Flattened ${flattenedActivities.length} activities`)
    }

    // Validate against the schema
    const result = tripDetailsSchema.safeParse(parsedData)

    if (!result.success) {
      console.error('Trip data validation error:', result.error)

      // Extract whatever valid data we can
      const partialData = {
        title: parsedData.title || 'New Trip',
        status: parsedData.status || 'planned',
        destination: parsedData.destination,
        startDate: parsedData.startDate,
        endDate: parsedData.endDate,
        summary: parsedData.summary,
        activities: Array.isArray(parsedData.activities) ? parsedData.activities : []
      }

      return partialData
    }

    return result.data
  } catch (error) {
    console.error('Error parsing AI response:', error)
    console.log('Raw AI response:', aiResponse)
    // Return minimal valid data
    return { title: 'New Trip', status: 'planned' }
  }
}

// Helper function to determine activity type based on name and category
function determineActivityType(name: string, category: string): 'attraction' | 'restaurant' | 'activity' | 'note' | 'other' {
  const lowerName = name.toLowerCase()
  const lowerCategory = category.toLowerCase()

  if (
    lowerName.includes('restaurant')
    || lowerName.includes('cafe')
    || lowerName.includes('dining')
    || lowerName.includes('eat')
    || lowerName.includes('food')
    || lowerName.includes('tasting')
  ) {
    return 'restaurant'
  }

  if (
    lowerName.includes('museum')
    || lowerName.includes('monument')
    || lowerName.includes('park')
    || lowerName.includes('zoo')
    || lowerName.includes('aquarium')
    || lowerName.includes('landmark')
    || lowerCategory.includes('sight')
    || lowerCategory.includes('attraction')
  ) {
    return 'attraction'
  }

  if (
    lowerName.includes('lesson')
    || lowerName.includes('tour')
    || lowerName.includes('adventure')
    || lowerName.includes('experience')
    || lowerCategory.includes('activities')
    || lowerCategory.includes('standout')
  ) {
    return 'activity'
  }

  // Default
  return 'other'
}
