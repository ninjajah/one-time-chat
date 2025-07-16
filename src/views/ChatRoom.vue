<template>
  <div class="min-h-screen flex">
    <!-- Основная область чата -->
    <div class="flex-1 flex flex-col">
      <!-- Заголовок чата -->
      <header class="glass border-b border-white/20 p-4">
        <div class="flex items-center justify-between">
          <div class="flex items-center space-x-3">
            <div
                class="w-10 h-10 bg-gradient-to-r from-green-500 to-blue-500 rounded-full flex items-center justify-center">
              <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                      d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path>
              </svg>
            </div>
            <div>
              <h1 class="text-lg font-semibold text-white">Чат</h1>
              <p class="text-sm text-gray-300">{{ currentUsers.length }} участников</p>
            </div>
          </div>
          <button
              @click="leaveChat"
              class="btn-secondary text-sm"
          >
            Покинуть чат
          </button>
        </div>
      </header>

      <!-- Область сообщений -->
      <div class="flex-1 overflow-hidden flex flex-col">
        <div
            ref="messagesContainer"
            class="flex-1 overflow-y-auto p-4 space-y-3"
        >
          <div
              v-for="message in currentMessages"
              :key="message.id"
              class="message-bubble"
              :class="{
              'system-message': message.type === 'system',
              'user-message': message.type === 'user'
            }"
          >
            <div v-if="message.type === 'system'" class="text-center">
              <p class="text-sm">{{ message.content }}</p>
              <p class="text-xs opacity-70 mt-1">{{ formatTime(message.timestamp) }}</p>
            </div>
            <div v-else>
              <div class="flex items-center justify-between mb-2">
                <span class="font-semibold text-white">{{ message.author }}</span>
                <span class="text-xs text-gray-400">{{ formatTime(message.timestamp) }}</span>
              </div>
              <p class="text-gray-100 whitespace-pre-wrap">{{ message.content }}</p>
            </div>
          </div>

          <div v-if="currentMessages.length === 0" class="text-center text-gray-400 py-8">
            <svg class="w-12 h-12 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path>
            </svg>
            <p>Пока сообщений нет</p>
            <p class="text-sm">Начните общение!</p>
          </div>
        </div>

        <!-- Поле ввода сообщения -->
        <div class="glass border-t border-white/20 p-4">
          <form @submit.prevent="sendMessage" class="flex space-x-3">
            <div class="flex-1">
              <textarea
                  v-model="newMessage"
                  @keydown.enter.exact.prevent="sendMessage"
                  @keydown.enter.shift.exact="newMessage += '\n'"
                  placeholder="Введите сообщение... (Enter - отправить, Shift+Enter - новая строка)"
                  class="input-field w-full resize-none"
                  rows="1"
                  maxlength="1000"
                  :disabled="isSending"
              ></textarea>
              <div class="flex justify-between text-xs text-gray-400 mt-1">
                <span v-if="newMessage.length > 900" class="text-yellow-400">
                  Осталось символов: {{ 1000 - newMessage.length }}
                </span>
                <span class="ml-auto">{{ newMessage.length }}/1000</span>
              </div>
            </div>
            <button
                type="submit"
                :disabled="!newMessage.trim() || isSending || newMessage.length > 1000"
                class="btn-primary px-4 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                      d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path>
              </svg>
            </button>
          </form>
        </div>
      </div>
    </div>

    <!-- Боковая панель с участниками -->
    <aside class="w-80 glass border-l border-white/20 p-4">
      <h2 class="text-lg font-semibold text-white mb-4">
        Участники ({{ currentUsers.length }}/10)
      </h2>
      <div class="space-y-2">
        <div
            v-for="user in currentUsers"
            :key="user.id"
            class="flex items-center space-x-3 p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
        >
          <div
              class="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
            <span class="text-white text-sm font-semibold">
              {{ user.name.charAt(0).toUpperCase() }}
            </span>
          </div>
          <div class="flex-1">
            <p class="text-white font-medium">{{ user.name }}</p>
            <p class="text-xs text-gray-400">
              {{ user.id === currentUser?.id ? 'Вы' : `В сети с ${formatTime(user.joinedAt)}` }}
            </p>
          </div>
          <div class="w-2 h-2 bg-green-400 rounded-full"></div>
        </div>
      </div>

      <div class="mt-6 p-3 rounded-lg bg-white/5">
        <h3 class="text-sm font-semibold text-white mb-2">Информация о чате</h3>
        <div class="space-y-1 text-xs text-gray-400">
          <p>• Максимум 10 участников</p>
          <p>• Максимум 1000 символов в сообщении</p>
          <p>• Чат удаляется когда все покидают его</p>
        </div>
      </div>
    </aside>
  </div>
</template>

<script setup lang="ts">
import {ref, computed, nextTick, watch, onMounted, onBeforeUnmount} from 'vue'
import {useRouter} from 'vue-router'
import {useChatStore} from '../stores/chat'

interface Props {
  id: string
}

const props = defineProps<Props>()
const router = useRouter()
const chatStore = useChatStore()

const newMessage = ref('')
const isSending = ref(false)
const messagesContainer = ref<HTMLElement>()

const currentUser = computed(() => chatStore.currentUser)
const currentUsers = computed(() => chatStore.currentUsers)
const currentMessages = computed(() => chatStore.currentMessages)

onMounted(() => {
  // Проверяем, авторизован ли пользователь в этом чате
  if (!currentUser.value || !chatStore.chatExists(props.id)) {
    router.push(`/chat/${props.id}`)
    return
  }

  scrollToBottom()
})

onBeforeUnmount(() => {
  // Покидаем чат при закрытии страницы
  if (currentUser.value) {
    chatStore.leaveChat()
  }
})

// Автоскролл при новых сообщениях
watch(currentMessages, () => {
  nextTick(() => {
    scrollToBottom()
  })
}, {deep: true})

function scrollToBottom() {
  if (messagesContainer.value) {
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
  }
}

async function sendMessage() {
  if (!newMessage.value.trim() || isSending.value) return

  isSending.value = true

  try {
    // Имитируем небольшую задержку отправки
    await new Promise(resolve => setTimeout(resolve, 100))

    chatStore.sendMessage(newMessage.value)
    newMessage.value = ''
  } finally {
    isSending.value = false
  }
}

function leaveChat() {
  chatStore.leaveChat()
  router.push('/')
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('ru-RU', {
    hour: '2-digit',
    minute: '2-digit'
  })
}
</script>
