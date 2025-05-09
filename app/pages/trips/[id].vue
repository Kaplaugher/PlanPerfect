<template>
  <UDashboardPanel id="trip-detail" class="relative">
    <template #header>
      <DashboardNavbar title="Trip Detail" />
    </template>

    <template #body>
      <UContainer class="p-4 sm:p-6">
        <div v-if="tripPending" class="flex items-center justify-center py-12">
          <div class="text-center">
            <UIcon name="i-lucide-map" class="text-4xl mb-4 text-primary" />
            <p class="text-gray-500 dark:text-gray-400">
              Loading trip details...
            </p>
          </div>
        </div>

        <div v-else-if="tripError" class="mx-auto max-w-md text-center py-12">
          <UIcon name="i-lucide-alert-triangle" class="text-5xl mb-4 text-amber-500" />
          <h3 class="text-xl font-medium mb-2">
            Unable to load trip
          </h3>
          <p class="text-gray-600 dark:text-gray-400 mb-6">
            {{ tripError }}
          </p>
          <UButton to="/trips" color="primary" icon="i-lucide-arrow-left">
            Return to Trip List
          </UButton>
        </div>

        <div v-else-if="tripData" class="space-y-8">
          <!-- Trip header section -->
          <div class="relative">
            <div class="bg-gradient-to-r from-primary-100 to-primary-50 dark:from-primary-950 dark:to-gray-900 rounded-xl p-6 sm:p-8">
              <div class="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
                <div class="flex-grow">
                  <div class="flex items-center gap-2 mb-2">
                    <span class="bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300 text-xs font-medium px-2.5 py-0.5 rounded-full">
                      {{ tripData.status === 'planned' ? 'Planned Trip' : 'Recorded Trip' }}
                    </span>
                    <span v-if="tripData.startDate" class="text-sm text-gray-600 dark:text-gray-400">
                      {{ formatDateRange(tripData.startDate, tripData.endDate) }}
                    </span>
                  </div>
                  <h1 class="text-2xl sm:text-3xl font-bold mb-2">
                    {{ tripData.title }}
                  </h1>
                  <div class="flex items-center text-gray-700 dark:text-gray-300">
                    <UIcon name="i-lucide-map-pin" class="mr-2" />
                    <span>{{ tripData.destination || 'No destination specified' }}</span>
                  </div>
                </div>
                <div class="flex flex-row sm:flex-col gap-2 items-start">
                  <UButton
                    color="gray"
                    variant="ghost"
                    size="sm"
                    icon="i-lucide-pencil"
                    :to="`/chats/${tripData.chatId}`"
                  >
                    Edit in Chat
                  </UButton>
                  <UButton
                    color="gray"
                    variant="ghost"
                    size="sm"
                    icon="i-lucide-share"
                    @click="shareTrip"
                  >
                    Share
                  </UButton>
                </div>
              </div>
            </div>
          </div>

          <!-- Trip summary section -->
          <div v-if="tripData.summary" class="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
            <h2 class="text-lg font-semibold mb-3 flex items-center">
              <UIcon name="i-lucide-clipboard-list" class="mr-2 text-primary-500" />
              Trip Summary
            </h2>
            <p class="text-gray-700 dark:text-gray-300">
              {{ tripData.summary }}
            </p>
          </div>

          <!-- Activities section -->
          <div class="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
            <h2 class="text-lg font-semibold mb-4 flex items-center">
              <UIcon name="i-lucide-list-todo" class="mr-2 text-primary-500" />
              Activities
              <span class="ml-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs font-medium px-2.5 py-0.5 rounded-full">
                {{ tripData.activities?.length || 0 }}
              </span>
            </h2>

            <div v-if="!tripData.activities?.length" class="text-center py-8">
              <UIcon name="i-lucide-calendar" class="text-3xl mb-2 text-gray-400" />
              <p class="text-gray-500 dark:text-gray-400">
                No activities planned for this trip yet
              </p>
            </div>

            <div v-else class="space-y-4">
              <UCard
                v-for="activity in tripData.activities"
                :key="activity.id"
                class="border-l-4"
                :class="getActivityBorderColor(activity.type)"
              >
                <div class="flex items-start gap-4">
                  <div class="rounded-full p-2" :class="getActivityBgColor(activity.type)">
                    <UIcon :name="getActivityIcon(activity.type)" class="text-xl" />
                  </div>
                  <div class="flex-grow">
                    <div class="flex items-center gap-2">
                      <h3 class="font-medium">
                        {{ activity.name }}
                      </h3>
                      <UBadge
                        v-if="activity.type"
                        color="gray"
                        variant="subtle"
                        size="xs"
                      >
                        {{ formatActivityType(activity.type) }}
                      </UBadge>
                    </div>
                    <p v-if="activity.description" class="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      {{ activity.description }}
                    </p>
                    <div v-if="activity.locationName" class="flex items-center text-xs text-gray-500 dark:text-gray-400 mt-2">
                      <UIcon name="i-lucide-map-pin" class="mr-1" />
                      {{ activity.locationName }}
                    </div>
                    <div v-if="activity.date" class="flex items-center text-xs text-gray-500 dark:text-gray-400 mt-1">
                      <UIcon name="i-lucide-calendar" class="mr-1" />
                      {{ formatDate(activity.date) }}
                    </div>
                  </div>
                </div>
              </UCard>
            </div>
          </div>

          <div class="flex justify-between mt-6">
            <UButton to="/trips" variant="ghost" icon="i-lucide-arrow-left">
              Back to Trips
            </UButton>
          </div>
        </div>
      </UContainer>
    </template>
  </UDashboardPanel>
</template>

<script setup>
import { format, parseISO } from 'date-fns'

definePageMeta({
  name: 'trip-details',
  validate: (route) => {
    return !!route.params.id
  }
})

const route = useRoute()
const toast = useToast()

const tripPending = ref(true)
const tripData = ref(null)
const tripError = ref(null)

function formatDate(dateString) {
  if (!dateString) return 'Date not specified'
  const date = typeof dateString === 'string' ? parseISO(dateString) : new Date(dateString)
  return format(date, 'MMM d, yyyy')
}

function formatDateRange(startDate, endDate) {
  if (!startDate) return ''

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

function getActivityIcon(type) {
  switch (type) {
    case 'attraction': return 'i-lucide-landmark'
    case 'restaurant': return 'i-lucide-utensils'
    case 'activity': return 'i-lucide-activity'
    case 'note': return 'i-lucide-sticky-note'
    default: return 'i-lucide-map'
  }
}

function getActivityBorderColor(type) {
  switch (type) {
    case 'attraction': return 'border-blue-500'
    case 'restaurant': return 'border-amber-500'
    case 'activity': return 'border-green-500'
    case 'note': return 'border-purple-500'
    default: return 'border-gray-500'
  }
}

function getActivityBgColor(type) {
  switch (type) {
    case 'attraction': return 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
    case 'restaurant': return 'bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300'
    case 'activity': return 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300'
    case 'note': return 'bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300'
    default: return 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
  }
}

function formatActivityType(type) {
  return type.charAt(0).toUpperCase() + type.slice(1)
}

function shareTrip() {
  // Future implementation
  toast.add({
    title: 'Coming soon',
    description: 'Trip sharing will be available in a future update',
    icon: 'i-lucide-info'
  })
}

onMounted(async () => {
  try {
    const { data, error } = await useFetch(`/api/trips/${route.params.id}`)

    if (error.value) {
      tripError.value = error.value.message || 'Failed to load trip details'
      toast.add({
        title: 'Error',
        description: tripError.value,
        icon: 'i-lucide-alert-circle',
        color: 'error'
      })
    } else {
      tripData.value = data.value
    }
  } catch (e) {
    console.error('Error fetching trip:', e)
    tripError.value = e.message || 'An unexpected error occurred'
    toast.add({
      title: 'Error',
      description: 'Failed to load trip details',
      icon: 'i-lucide-alert-circle',
      color: 'error'
    })
  } finally {
    tripPending.value = false
  }
})
</script>

<style scoped>
/* Add page-specific styles if needed */
</style>
