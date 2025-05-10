<template>
  <UDashboardPanel id="trip-detail" class="relative">
    <template #header>
      <DashboardNavbar title="Trip Detail" />
    </template>

    <template #body>
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

      <div v-else-if="tripData" class="grid grid-cols-1 md:grid-cols-2 gap-8">
        <!-- Left column: Carousel -->
        <div class="md:col-span-1 flex flex-col gap-4">
          <div class="sticky top-20 z-20">
            <UModal
              title="Add Photos"
              description="Upload photos to your trip gallery"
            >
              <div class="flex gap-2">
                <UButton
                  v-if="tripImages?.length"
                  color="red"
                  variant="soft"
                  icon="i-lucide-trash-2"
                  :loading="isDeleting"
                  :disabled="isDeleting"
                  @click.stop="deleteAllImages"
                >
                  {{ isDeleting ? 'Deleting...' : 'Delete All' }}
                </UButton>
                <UButton
                  color="white"
                  variant="solid"
                  icon="i-lucide-camera"
                  class="shadow-md hover:shadow-lg transition-shadow"
                />
              </div>

              <template #body>
                <UInput
                  type="file"
                  accept="image/*"
                  multiple
                  @change="onFileSelect"
                />
              </template>
            </UModal>
            <UCarousel
              v-slot="{ item }"
              arrows
              :items="items"
              class="w-full max-w-md mx-auto"
            >
              <img
                :src="item"
                width="640"
                height="640"
                class="rounded-lg aspect-square object-cover"
              >
            </UCarousel>
          </div>
        </div>

        <!-- Right column: Trip Details -->
        <div class="md:col-span-1 space-y-8">
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
                  <UDrawer
                    direction="right"
                    title="Drawer with description"
                    description="Lorem ipsum dolor sit amet, consectetur adipiscing elit."
                  >
                    <UButton
                      label="Edit in Chat"
                      color="gray"
                      variant="ghost"
                      size="sm"
                      icon="i-lucide-edit"
                      class="cursor-pointer"
                    />

                    <template #body>
                      <div class="h-48">
                        hi
                      </div>
                    </template>
                  </UDrawer>
                  <UButton
                    color="gray"
                    variant="ghost"
                    size="sm"
                    icon="i-lucide-share"
                    class="cursor-pointer"
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
      </div>
    </template>
  </UDashboardPanel>
</template>

<script lang="ts" setup>
import { format, parseISO } from 'date-fns'
import { LazyModalConfirm } from '#components'

definePageMeta({
  name: 'trip-details',
  validate: (route) => {
    return !!route.params.id
  }
})

const route = useRoute()
const toast = useToast()
const upload = useUpload(`/api/trips/blob/${route.params.id}`, { method: 'PUT' })
const overlay = useOverlay()

const deleteModal = overlay.create(LazyModalConfirm, {
  props: {
    title: 'Delete All Images',
    description: 'Are you sure you want to delete all images for this trip? This action cannot be undone.',
    confirmText: 'Delete All',
    cancelText: 'Cancel',
    color: 'red'
  }
})

// Fetch trip images with a key for proper refreshing
const { data: tripImages, refresh: refreshImages } = await useFetch(`/api/trips/blob/${route.params.id}`, {
  key: `trip-images-${route.params.id}`
})

// Log the blob objects to see their structure
watch(tripImages, (images) => {
  console.log('Trip images:', images)
}, { immediate: true })

const { data: tripData, pending: tripPending, error: tripError } = await useAsyncData(
  `trip-${route.params.id}`,
  async () => {
    try {
      const { data, error } = await useFetch(`/api/trips/${route.params.id}`)
      if (error.value) {
        throw new Error(error.value.message || 'Failed to load trip details')
      }
      return data.value
    } catch (e) {
      console.error('Error fetching trip:', e)
      throw new Error(e.message || 'An unexpected error occurred')
    }
  }
)

// Watch for errors to show toast notifications
watch(tripError, (error) => {
  if (error) {
    toast.add({
      title: 'Error',
      description: error.message,
      icon: 'i-lucide-alert-circle',
      color: 'error'
    })
  }
})

// Use actual trip images or fallback to placeholder
const items = computed(() => {
  if (!tripImages.value?.length) {
    return [
      'https://picsum.photos/640/640?random=1',
      'https://picsum.photos/640/640?random=2',
      'https://picsum.photos/640/640?random=3'
    ]
  }
  // Use the serve endpoint with the blob pathname
  return tripImages.value.map(blob => `/api/blob/serve/${blob.pathname}`)
})

const isDeleting = ref(false)

async function onFileSelect(event) {
  try {
    const uploadedFiles = await upload(event.target)
    console.log('Uploaded files:', uploadedFiles)

    // Refresh the images list
    await refreshImages()

    toast.add({
      title: 'Success',
      description: 'Images uploaded successfully',
      icon: 'i-lucide-check-circle',
      color: 'success'
    })
  } catch (error) {
    console.error('Error uploading files:', error)
    toast.add({
      title: 'Error',
      description: 'Failed to upload images',
      icon: 'i-lucide-alert-circle',
      color: 'error'
    })
  }
}

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

async function deleteAllImages(event) {
  // Prevent the modal from opening
  event?.preventDefault()
  event?.stopPropagation()

  try {
    const modalInstance = deleteModal.open()
    const confirmed = await modalInstance.result

    if (!confirmed) {
      return
    }

    isDeleting.value = true
    const response = await $fetch(`/api/trips/blob/${route.params.id}`, {
      method: 'DELETE'
    })

    if (response.success) {
      // Refresh the images list
      await refreshImages()

      toast.add({
        title: 'Success',
        description: 'All images deleted successfully',
        icon: 'i-lucide-check-circle',
        color: 'success'
      })
    }
  } catch (error) {
    console.error('Error deleting images:', error)
    toast.add({
      title: 'Error',
      description: error.message || 'Failed to delete images',
      icon: 'i-lucide-alert-circle',
      color: 'error'
    })
  } finally {
    isDeleting.value = false
  }
}
</script>

<style scoped>
/* Add page-specific styles if needed */
</style>
