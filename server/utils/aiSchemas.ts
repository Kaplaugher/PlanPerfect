import { z } from 'zod'

// Zod Schemas for structured trip data
export const tripActivitySchema = z.object({
  name: z.string().describe('Name of the activity, restaurant, or attraction.'),
  description: z.string().optional().describe('Brief description or notes about the activity.'),
  date: z.string().optional().describe('Date of the activity (e.g., YYYY-MM-DD or a general descriptor like \'Day 1\').'),
  locationName: z.string().optional().describe('Name of the location (e.g., \'Eiffel Tower\', \'Louvre Museum\').'),
  latitude: z.number().optional().describe('Latitude of the location. Omit if not known.'),
  longitude: z.number().optional().describe('Longitude of the location. Omit if not known.'),
  type: z.enum(['attraction', 'restaurant', 'activity', 'note', 'other']).optional().describe('Type of activity.'),
  order: z.number().optional().describe('Order of the activity for the day/trip.')
})

export const tripDetailsSchema = z.object({
  title: z.string().describe('A concise and descriptive title for the trip (e.g., \'Paris Adventure Spring 2024\', \'Kyoto Culinary Journey\').'),
  status: z.enum(['planned', 'recorded']).describe('Status of the trip: \'planned\' for future trips, \'recorded\' for past trips.'),
  destination: z.string().optional().describe('Main destination of the trip (e.g., \'Paris, France\', \'Tokyo, Japan\').'),
  startDate: z.string().optional().describe('Start date of the trip (e.g., YYYY-MM-DD). Omit if not specified.'),
  endDate: z.string().optional().describe('End date of the trip (e.g., YYYY-MM-DD). Omit if not specified.'),
  summary: z.string().optional().describe('A brief overall summary of the trip plan or journal.'),
  activities: z.array(tripActivitySchema).optional().describe('List of activities, attractions, or waypoints for the trip. Omit if no specific activities are detailed yet.')
})
