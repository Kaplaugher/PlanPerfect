<script setup lang="ts">
import type { DefineComponent } from 'vue'
import { useChat, type Message } from '@ai-sdk/vue'
import { useClipboard } from '@vueuse/core'
import ProseStreamPre from '../../components/prose/PreStream.vue'

const components = {
  pre: ProseStreamPre as unknown as DefineComponent
}

const route = useRoute()
const router = useRouter()
const toast = useToast()
const clipboard = useClipboard()
const { model } = useLLM()

const saving = ref(false)
const savingStep = ref('')

async function saveTrip() {
  try {
    saving.value = true
    savingStep.value = 'Analyzing conversation with AI...'

    const response = await $fetch(`/api/chats/${route.params.id}/save-trip`, {
      method: 'POST'
    })

    savingStep.value = ''
    toast.add({
      title: 'Trip saved successfully',
      description: `${response.title} has been created with ${response.activities?.length || 0} activities`,
      icon: 'i-lucide-check-circle',
      color: 'success',
      actions: [
        {
          label: 'View Trip',
          click: () => router.push(`/trips/${response.id}`)
        }
      ]
    })

    // Refresh data to reflect changes
    refreshNuxtData('trips')
  } catch (error: unknown) {
    savingStep.value = ''
    const errorMessage = error instanceof Error ? error.message : 'Failed to save trip'
    toast.add({
      title: 'Error saving trip',
      description: errorMessage,
      icon: 'i-lucide-alert-circle',
      color: 'error'
    })
  } finally {
    saving.value = false
  }
}

const { data: chat } = await useFetch(`/api/chats/${route.params.id}`, {
  cache: 'force-cache'
})
if (!chat.value) {
  throw createError({ statusCode: 404, statusMessage: 'Chat not found', fatal: true })
}

const { messages, input, handleSubmit, reload, stop, status, error } = useChat({
  id: chat.value.id,
  api: `/api/chats/${chat.value.id}`,
  initialMessages: chat.value.messages.map(message => ({
    id: message.id,
    content: message.content,
    role: message.role
  })),
  body: {
    model: model.value
  },
  onResponse(response) {
    if (response.headers.get('X-Chat-Title')) {
      refreshNuxtData('chats')
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
  if (chat.value?.messages.length === 1) {
    reload()
  }
})
</script>

<template>
  <UDashboardPanel id="chat" class="relative" :ui="{ body: 'p-0 sm:p-0' }">
    <template #header>
      <div class="flex items-center justify-between">
        <DashboardNavbar />
        <div class="flex items-center gap-2">
          <UText v-if="savingStep" size="sm" class="text-gray-500 dark:text-gray-400 mr-2">
            {{ savingStep }}
          </UText>
          <UButton
            :loading="saving"
            color="primary"
            variant="soft"
            icon="i-lucide-save"
            @click="saveTrip"
          >
            Save as Trip
          </UButton>
        </div>
      </div>
    </template>

    <template #body>
      <UContainer class="flex-1 flex flex-col gap-4 sm:gap-6">
        <UChatMessages
          :messages="messages"
          :status="status"
          :assistant="{ actions: [{ label: 'Copy', icon: copied ? 'i-lucide-copy-check' : 'i-lucide-copy', onClick: copy }] }"
          class="lg:pt-[--ui-header-height] pb-4 sm:pb-6"
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

        <UChatPrompt
          v-model="input"
          :error="error"
          variant="subtle"
          class="sticky bottom-0 [view-transition-name:chat-prompt] rounded-b-none z-10"
          @submit="handleSubmit"
        >
          <UChatPromptSubmit
            :status="status"
            color="neutral"
            @stop="stop"
            @reload="reload"
          />

          <template #footer>
            <ModelSelect v-model="model" />
          </template>
        </UChatPrompt>
      </UContainer>
    </template>
  </UDashboardPanel>
</template>
