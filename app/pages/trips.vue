<template>
  <UDashboardPanel id="trips-list" grow>
    <UDashboardNavbar title="My Trips" />
    <UContainer class="p-4 sm:p-6">
      <div v-if="pending" class="flex justify-center items-center h-32">
        <i class="i-lucide-loader-2 class-animate-spin text-4xl text-gray-400 dark:text-gray-500" />
      </div>
      <div v-else-if="error || !trips">
        <p class="text-center text-red-500">
          Failed to load trips. Please try again.
        </p>
        <!-- Optionally, add a retry button -->
      </div>
      <div v-else-if="trips.length === 0" class="text-center">
        <p class="text-lg text-gray-500 dark:text-gray-400">
          You haven't planned or recorded any trips yet.
        </p>
        <UButton
          icon="i-lucide-plus"
          label="Start a new trip chat"
          to="/"
          class="mt-4"
        />
      </div>
      <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        <UCard v-for="trip in trips" :key="trip.id" :ui="{ body: { padding: '' }, ring: 'ring-1 ring-gray-200 dark:ring-gray-700' }">
          <template #header>
            <h3 class="text-lg font-semibold truncate">
              {{ trip.title || 'Untitled Trip' }}
            </h3>
          </template>

          <div class="p-4 space-y-2">
            <p class="text-sm text-gray-500 dark:text-gray-400">
              <strong>Destination:</strong> {{ trip.destination || 'Not specified' }}
            </p>
            <p class="text-sm text-gray-500 dark:text-gray-400">
              <strong>Status:</strong> <UBadge
                size="xs"
                :label="trip.status"
                :color="trip.status === 'planned' ? 'primary' : 'green'"
                variant="subtle"
              />
            </p>
            <p v-if="trip.startDate" class="text-sm text-gray-500 dark:text-gray-400">
              <strong>Dates:</strong> {{ new Date(trip.startDate).toLocaleDateString() }} - {{ trip.endDate ? new Date(trip.endDate).toLocaleDateString() : 'Ongoing' }}
            </p>
          </div>

          <template #footer>
            <UButton
              :to="`/trips/${trip.id}`"
              block
              color="primary"
              variant="solid"
            >
              View Details
            </UButton>
          </template>
        </UCard>
      </div>
    </UContainer>
  </UDashboardPanel>
</template>

<script setup lang="ts">
interface Trip {
  id: string
  title?: string | null
  status: 'planned' | 'recorded'
  destination?: string | null
  startDate?: string | number | Date | null // Assuming date can be in various formats from API
  endDate?: string | number | Date | null
  // Add other relevant fields that might come from the API and are useful for display
}

const { data: trips, pending, error, refresh: _refresh } = await useFetch<Trip[]>('/api/trips', {
  key: 'trips-list',
  default: () => [] // Provide a default empty array to prevent issues if data is null initially
})

// Optional: Add a title for the page using useHead or definePageMeta
definePageMeta({
  title: 'My Trips'
})
</script>

<style scoped>
/* Add any page-specific styles here if needed */
</style>
