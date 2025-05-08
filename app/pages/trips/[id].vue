<template>
  <UDashboardPanel id="trip-detail" class="relative">
    <template #header>
      <DashboardNavbar title="Trip Details" />
    </template>

    <template #body>
      <UContainer class="p-4 sm:p-6">
        <div class="space-y-4">
          <h1 class="text-xl font-semibold">
            Trip Details Page
          </h1>
          <p>Trip ID: {{ $route.params.id }}</p>

          <div v-if="tripPending" class="py-4">
            <p class="text-gray-500">
              Loading trip data...
            </p>
            <i class="i-lucide-loader-2 animate-spin text-4xl text-gray-400 dark:text-gray-500" />
          </div>

          <div v-else-if="tripError">
            <p class="text-red-500">
              Error loading trip: {{ tripError }}
            </p>
            <UButton to="/trip-list" color="primary" class="mt-4">
              Return to Trip List
            </UButton>
          </div>

          <div v-else-if="tripData">
            <p><strong>Title:</strong> {{ tripData.title || 'Untitled' }}</p>
            <p><strong>Destination:</strong> {{ tripData.destination || 'Not specified' }}</p>
          </div>

          <div class="mt-6">
            <UButton to="/trip-list" variant="outline">
              Back to Trips
            </UButton>
          </div>
        </div>
      </UContainer>
    </template>
  </UDashboardPanel>
</template>

<script setup>
definePageMeta({
  name: 'trip-details',
  validate: (route) => {
    return !!route.params.id
  }
})

const route = useRoute()
const toast = useToast()

console.log('Trip Details Page - Route params:', route.params)

const tripPending = ref(true)
const tripData = ref(null)
const tripError = ref(null)

onMounted(async () => {
  console.log('Trip Details Page Mounted - Trip ID:', route.params.id)

  try {
    const { data, error } = await useFetch(`/api/trips/${route.params.id}`)

    tripData.value = data.value
    tripError.value = error.value

    console.log('Fetched trip data:', data.value)
    console.log('Fetch error (if any):', error.value)

    if (error.value) {
      toast.add({
        title: 'Error',
        description: error.value.message || 'Failed to load trip details',
        icon: 'i-lucide-alert-circle',
        color: 'error'
      })
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
