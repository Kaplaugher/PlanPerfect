<template>
  <UDashboardPanel id="trips-list" class="relative">
    <template #header>
      <DashboardNavbar title="My Trips" />
    </template>

    <template #body>
      <UContainer class="p-4 sm:p-6">
        <div v-if="pending" class="flex items-center justify-center py-12">
          <div class="text-center">
            <UIcon name="i-lucide-map" class="text-4xl mb-4 text-primary" />
            <p class="text-gray-500 dark:text-gray-400">
              Loading your trips...
            </p>
          </div>
        </div>

        <div v-else-if="error" class="mx-auto max-w-md text-center py-12">
          <UIcon name="i-lucide-alert-triangle" class="text-5xl mb-4 text-amber-500" />
          <h3 class="text-xl font-medium mb-2">
            Unable to load trips
          </h3>
          <p class="text-gray-600 dark:text-gray-400 mb-6">
            {{ error }}
          </p>
          <UButton color="primary" icon="i-lucide-refresh-cw" @click="refresh">
            Try Again
          </UButton>
        </div>

        <div v-else-if="!data?.length" class="mx-auto max-w-md text-center py-12">
          <UIcon name="i-lucide-map-off" class="text-5xl mb-4 text-gray-400" />
          <h3 class="text-xl font-medium mb-2">
            No trips yet
          </h3>
          <p class="text-gray-600 dark:text-gray-400 mb-6">
            Start a conversation with the AI to plan your next trip, then save it here.
          </p>
          <UButton to="/" color="primary" icon="i-lucide-plus-circle">
            Start Planning
          </UButton>
        </div>

        <div v-else class="space-y-8">
          <!-- Trips grid layout -->
          <UBlogPosts>
            <UBlogPost
              v-for="trip in data"
              :key="trip.id"
              :title="trip.title"
              :description="trip.summary || (trip.destination ? `Trip to ${trip.destination}` : 'View trip details')"
              image="https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=500&auto=format&fit=crop"
              :date="trip.startDate ? formatDateRange(trip.startDate, trip.endDate) : ''"
              :to="`/trips/${trip.id}`"
              :badge="trip.status === 'planned' ? 'Planned' : 'Recorded'"
              :badge-color="trip.status === 'planned' ? 'primary' : 'gray'"
            >
              <template #description>
                <div class="space-y-2">
                  <p v-if="trip.summary" class="text-sm text-gray-600 dark:text-gray-400">
                    {{ truncateSummary(trip.summary) }}
                  </p>
                  <div class="flex items-center text-sm text-gray-600 dark:text-gray-400 mt-1">
                    <UIcon name="i-lucide-map-pin" class="mr-1" />
                    <span>{{ trip.destination || 'No destination specified' }}</span>
                  </div>
                  <div class="flex items-center text-xs text-gray-500 mt-2">
                    <UIcon name="i-lucide-list-todo" class="mr-1" />
                    <span>{{ trip.activities?.length || 0 }} activities</span>
                  </div>
                </div>
              </template>
            </UBlogPost>
          </UBlogPosts>
        </div>
      </UContainer>
    </template>
  </UDashboardPanel>
</template>

<script setup lang="ts">
import { format, parseISO } from 'date-fns'

const { data, pending, error, refresh } = await useFetch('/api/trips', {
  key: 'trips',
  watch: [useRouter().currentRoute]
})

function truncateSummary(summary: string, maxLength = 100): string {
  if (!summary) return ''
  if (summary.length <= maxLength) return summary
  return summary.substring(0, maxLength).trim() + '...'
}

function formatDateRange(startDate: string | number | null, endDate: string | number | null): string {
  if (!startDate) return 'No dates specified'

  const start = typeof startDate === 'string' ? parseISO(startDate) : new Date(startDate)

  if (!endDate) {
    return format(start, 'MMM d, yyyy')
  }

  const end = typeof endDate === 'string' ? parseISO(endDate) : new Date(endDate)

  // Same year
  if (start.getFullYear() === end.getFullYear()) {
    // Same month
    if (start.getMonth() === end.getMonth()) {
      return `${format(start, 'MMM d')} - ${format(end, 'd, yyyy')}`
    }
    // Different month
    return `${format(start, 'MMM d')} - ${format(end, 'MMM d, yyyy')}`
  }

  // Different year
  return `${format(start, 'MMM d, yyyy')} - ${format(end, 'MMM d, yyyy')}`
}
</script>

<style scoped>
/* Add any page-specific styles here if needed */
</style>
