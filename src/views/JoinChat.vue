<template>
  <div class="min-h-screen flex items-center justify-center p-4">
    <div class="glass rounded-2xl p-8 max-w-md w-full animate-fade-in">
      <div class="text-center mb-8">
        <div
            class="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full mx-auto mb-4 flex items-center justify-center">
          <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
          </svg>
        </div>
        <h1 class="text-2xl font-bold text-white mb-2">Присоединиться к чату</h1>
        <p class="text-gray-300">Введите ваше имя для входа</p>
      </div>

      <div v-if="!chatExists" class="text-center">
        <div class="text-red-400 mb-4">
          <svg class="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
          </svg>
          <p class="text-lg font-semibold">Чат не найден</p>
          <p class="text-sm text-gray-400">Возможно, чат был удален или ссылка неверна</p>
        </div>
        <router-link to="/" class="btn-primary">
          Создать новый чат
        </router-link>
      </div>

      <form v-else @submit.prevent="joinChat" class="space-y-6">
        <div>
          <label class="block text-sm font-medium text-gray-300 mb-2">
            Ваше имя
          </label>
          <input
              v-model="userName"
              type="text"
              required
              maxlength="50"
              class="input-field w-full"
              placeholder="Введите ваше имя..."
              :disabled="isJoining"
          >
          <div class="flex justify-between text-xs text-gray-400 mt-1">
            <span v-if="error" class="text-red-400">{{ error }}</span>
            <span class="ml-auto">{{ userName.length }}/50</span>
          </div>
        </div>

        <div class="glass rounded-lg p-4">
          <div class="flex items-center justify-between text-sm">
            <span class="text-gray-300">Участников в чате:</span>
            <span class="text-white font-semibold">{{ participantCount }}/10</span>
          </div>
          <div class="w-full bg-gray-700 rounded-full h-2 mt-2">
            <div
                class="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all duration-300"
                :style="{ width: `${(participantCount / 10) * 100}%` }"
            ></div>
          </div>
        </div>

        <button
            type="submit"
            :disabled="!userName.trim() || isJoining || participantCount >= 10"
            class="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span v-if="isJoining">Подключение...</span>
          <span v-else-if="participantCount >= 10">Чат переполнен</span>
          <span v-else>Войти в чат</span>
        </button>

        <router-link to="/" class="block text-center text-gray-400 hover:text-white transition-colors">
          ← Создать новый чат
        </router-link>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import {ref, computed, onMounted} from 'vue'
import {useRouter} from 'vue-router'
import {useChatStore} from '../stores/chat'

interface Props {
  id: string
}

const props = defineProps<Props>()
const router = useRouter()
const chatStore = useChatStore()

const userName = ref('')
const isJoining = ref(false)
const error = ref('')

const chatExists = computed(() => chatStore.chatExists(props.id))
const participantCount = computed(() => {
  if (!chatExists.value) return 0
  return chatStore.getChatParticipantCount(props.id)
})

onMounted(() => {
  if (!chatExists.value) {
    return
  }
  
  // Если пользователь уже в этом чате, перенаправляем в комнату
  if (chatStore.isUserInChat(props.id)) {
    router.push(`/room/${props.id}`)
    return
  }
})

interface Props {
  id: string
}

const props = defineProps<Props>()
const router = useRouter()
const chatStore = useChatStore()

const userName = ref('')
const isJoining = ref(false)
const error = ref('')

const chatExists = computed(() => chatStore.chatExists(props.id))
const participantCount = computed(() => {
  if (!chatExists.value) return 0
  return chatStore.getChatParticipantCount(props.id)
})

onMounted(() => {
  if (!chatExists.value) {
    return
  }
})

async function joinChat() {
  if (!userName.value.trim()) return

  isJoining.value = true
  error.value = ''

  try {
    // Имитируем задержку подключения
    await new Promise(resolve => setTimeout(resolve, 800))

    const success = chatStore.joinChat(props.id, userName.value.trim())

    if (success) {
      await router.push(`/room/${props.id}`)
    } else {
      if (participantCount.value >= 10) {
        error.value = 'Чат переполнен (максимум 10 участников)'
      } else {
        error.value = 'Это имя уже занято'
      }
    }
  } finally {
    isJoining.value = false
  }
}
</script>
