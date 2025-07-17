<template>
  <div class="min-h-screen flex items-center justify-center p-4">
    <div class="glass rounded-2xl p-8 max-w-md w-full text-center animate-fade-in">
      <div class="mb-8">
        <div class="w-20 h-20 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full mx-auto mb-4 flex items-center justify-center">
          <svg class="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path>
          </svg>
        </div>
        <h1 class="text-3xl font-bold text-white mb-2">Одноразовый чат</h1>
        <p class="text-gray-300">Создайте приватный чат и поделитесь ссылкой с друзьями</p>
      </div>

      <div class="space-y-4">
        <button
          @click="createNewChat"
          :disabled="isCreating"
          class="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span v-if="isCreating">Создание...</span>
          <span v-else>Создать чат</span>
        </button>

        <div v-if="chatLink" class="glass rounded-lg p-4 animate-slide-up">
          <p class="text-sm text-gray-300 mb-2">Ссылка на чат:</p>
          <div class="flex items-center space-x-2">
            <input
              :value="chatLink"
              readonly
              class="input-field flex-1 text-sm"
            >
            <button
              @click="goToChat"
              class="btn-primary px-3 py-2"
              title="Перейти в чат"
            >
              <span>→</span>
            </button>
            <button
              @click="copyLink"
              class="btn-secondary px-3 py-2"
              :class="{ 'bg-green-500/20 border-green-400/30': copied }"
              title="Копировать ссылку"
            >
              <span v-if="copied">✓</span>
              <span v-else>📋</span>
            </button>
          </div>
          <p class="text-xs text-gray-400 mt-2">
            Поделитесь этой ссылкой с участниками чата
          </p>
        </div>
      </div>

      <div class="mt-8 text-xs text-gray-400 space-y-1">
        <p>• Максимум 10 участников</p>
        <p>• Чат автоматически удаляется через 24 часа</p>
        <p>• Чат удаляется когда все покидают его</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useChatSupabaseStore } from '../stores/chatSupabase'

const router = useRouter()
const chatStore = useChatSupabaseStore()
const isCreating = ref(false)
const chatLink = ref('')
const chatId = ref('')
const copied = ref(false)

async function createNewChat() {
  isCreating.value = true

  try {
    const newChatId = await chatStore.createChat()
    if (newChatId) {
      chatId.value = newChatId
      chatLink.value = chatStore.getChatUrl(newChatId)
    }
  } finally {
    isCreating.value = false
  }
}

function goToChat() {
  if (chatId.value) {
    router.push(`/chat/${chatId.value}`)
  }
}

async function copyLink() {
  try {
    await navigator.clipboard.writeText(chatLink.value)
    copied.value = true
    setTimeout(() => {
      copied.value = false
    }, 2000)
  } catch (err) {
    console.error('Не удалось скопировать ссылку:', err)
  }
}
</script>
