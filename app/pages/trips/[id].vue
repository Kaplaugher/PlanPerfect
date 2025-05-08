<script setup lang="ts">
import type { DefineComponent } from 'vue'
import { useChat, type Message } from '@ai-sdk/vue'
import { useClipboard } from '@vueuse/core'
import ProseStreamPre from '~/components/prose/PreStream.vue'

const components = {
  pre: ProseStreamPre as unknown as DefineComponent
}

const route = useRoute()
const toast = useToast()
const clipboard = useClipboard()
const { model } = useLLM()

interface MessageInDB {
  id: string
  content: string
  role: 'user' | 'assistant' | 'system' | 'function' | 'data' | 'tool'
}

const { data: tripData, error: tripError } = await useFetch(`/api/trips/${route.params.id}`)

if (tripError.value || !tripData.value) {
  throw createError({ statusCode: 404, statusMessage: 'Trip not found', fatal: true })
}

const chat = computed(() => tripData.value?.chat)

const { messages, input, handleSubmit, reload, stop, status, error: chatHookError } = useChat({
  id: chat.value?.id,
  api: chat.value ? `/api/chats/${chat.value.id}` : undefined,
  initialMessages: chat.value?.messages.map((message: MessageInDB) => ({
    id: message.id,
    content: message.content,
    role: message.role
  })) || [],
  body: {
    model: model.value
  },
  onResponse(response) {
    if (response.headers.get('X-Chat-Title')) {
      refreshNuxtData(`/api/trips/${route.params.id}`)
    }
  },
  onError(error) {
    const { message } = typeof error.message === 'string' && error.message[0] === '{' ? JSON.parse(error.message) : error
    toast.add({
      description: message,
      icon: 'i-lucide-alert-circle',
      color: 'error',
      duration: 0
    })
  }
})

const copied = ref(false)

function copy(e: MouseEvent, message: Message) {
  clipboard.copy(message.content)
  copied.value = true
  setTimeout(() => {
    copied.value = false
  }, 2000)
}

onMounted(() => {
  if (chat.value && chat.value.messages?.length === 1) {
    reload()
  }
})
</script>

<template>
  <UDashboardPanel id="trip-detail" class="relative" :ui="{ body: 'p-0 sm:p-0' }">
    <template #header>
      <DashboardNavbar :title="tripData?.title || 'Trip Details'" />
    </template>

    <template #body>
      <UContainer class="flex-1 flex flex-col md:flex-row gap-0 sm:gap-0 h-full">
        <div class="w-full md:w-1/2 flex flex-col h-full">
          <template v-if="chat">
            <UChatMessages
              :messages="messages"
              :status="status"
              :assistant="{ actions: [{ label: 'Copy', icon: copied ? 'i-lucide-copy-check' : 'i-lucide-copy', onClick: copy }] }"
              class="flex-grow overflow-y-auto lg:pt-[--ui-header-height] pb-4 sm:pb-6 px-4 sm:px-6"
              :spacing-offset="160"
            >
              <template #content="{ message }">
                <MDCCached
                  :value="message.content"
                  :cache-key="message.id"
                  unwrap="p"
                  :components="components"
                  :parser-options="{ highlight: false }"
                />
              </template>
            </UChatMessages>

            <div class="px-4 sm:px-6 pb-4 sm:pb-6">
              <UChatPrompt
                v-model="input"
                :error="chatHookError"
                variant="subtle"
                class="sticky bottom-0 [view-transition-name:chat-prompt] z-10 rounded-t-none"
                :disabled="!chat.id"
                @submit="handleSubmit"
              >
                <UChatPromptSubmit
                  :status="status"
                  color="neutral"
                  :disabled="!chat.id"
                  @stop="stop"
                  @reload="reload"
                />
                <template #footer>
                  <ModelSelect v-model="model" />
                </template>
              </UChatPrompt>
            </div>
          </template>
          <div v-else class="flex-1 flex items-center justify-center p-4">
            <p class="text-gray-500 dark:text-gray-400">
              No chat associated with this trip.
            </p>
          </div>
        </div>

        <div class="w-full md:w-1/2 p-4 sm:p-6 border-t md:border-t-0 md:border-l border-gray-200 dark:border-gray-700 overflow-y-auto h-full lg:pt-[--ui-header-height]">
          <h2 class="text-xl font-semibold mb-4">
            Trip Details
          </h2>
          <div v-if="tripData">
            <div class="space-y-2">
              <p>
                <strong>Title:</strong> {{ tripData.title || 'N/A' }}
              </p>
              <p>
                <strong>Destination:</strong> {{ tripData.destination || 'Not set' }}
              </p>
              <p>
                <strong>Status:</strong> <UBadge
                  size="xs"
                  :label="tripData.status"
                  :color="tripData.status === 'planned' ? 'primary' : 'green'"
                  variant="subtle"
                />
              </p>
              <p v-if="tripData.startDate">
                <strong>Dates:</strong> {{ new Date(tripData.startDate).toLocaleDateString() }} - {{ tripData.endDate ? new Date(tripData.endDate).toLocaleDateString() : 'Ongoing' }}
              </p>
              <div>
                <p>
                  <strong>Summary:</strong>
                </p>
                <p class="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                  {{ tripData.summary || 'Not set' }}
                </p>
              </div>
            </div>

            <div v-if="tripData.activities && tripData.activities.length > 0" class="mt-6">
              <h3 class="text-lg font-semibold mb-2">
                Activities & Waypoints
              </h3>
              <ul class="space-y-3">
                <li v-for="activity in tripData.activities" :key="activity.id" class="p-3 bg-gray-50 dark:bg-gray-800 rounded-md">
                  <p>
                    {{ activity.name }} <UBadge
                      size="xs"
                      :label="activity.type || 'other'"
                      color="gray"
                      variant="outline"
                    />
                  </p>
                  <p v-if="activity.description" class="text-sm text-gray-600 dark:text-gray-400">
                    {{ activity.description }}
                  </p>
                  <p v-if="activity.date" class="text-xs text-gray-500 dark:text-gray-400">
                    Date: {{ new Date(activity.date).toLocaleDateString() }}
                  </p>
                  <p v-if="activity.locationName" class="text-xs text-gray-500 dark:text-gray-400">
                    Location: {{ activity.locationName }}
                  </p>
                </li>
              </ul>
            </div>
            <p v-else class="mt-4 italic text-gray-500 dark:text-gray-400">
              No activities recorded for this trip yet.
            </p>
          </div>
          <p v-else class="italic text-gray-500 dark:text-gray-400">
            Loading trip data...
          </p>
        </div>
      </UContainer>
    </template>
  </UDashboardPanel>
</template>
