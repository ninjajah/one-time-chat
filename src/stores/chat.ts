import {defineStore} from 'pinia'
import {ref, computed} from 'vue'

export interface Message {
    id: string
    type: 'user' | 'system'
    content: string
    author?: string
    timestamp: Date
}

export interface User {
    id: string
    name: string
    joinedAt: Date
}

export interface ChatRoom {
    id: string
    users: User[]
    messages: Message[]
    createdAt: Date
}

export const useChatStore = defineStore('chat', () => {
    const chatRooms = ref<Map<string, ChatRoom>>(new Map())
    const currentUser = ref<User | null>(null)
    const currentChatId = ref<string | null>(null)

    const currentChat = computed(() => {
        if (!currentChatId.value) return null
        return chatRooms.value.get(currentChatId.value) || null
    })

    const currentUsers = computed(() => {
        return currentChat.value?.users || []
    })

    const currentMessages = computed(() => {
        return currentChat.value?.messages || []
    })

    function createChat(): string {
        const chatId = crypto.randomUUID()
        const newChat: ChatRoom = {
            id: chatId,
            users: [],
            messages: [],
            createdAt: new Date()
        }
        chatRooms.value.set(chatId, newChat)
        return chatId
    }

    function joinChat(chatId: string, userName: string): boolean {
        const chat = chatRooms.value.get(chatId)
        if (!chat) return false

        // Проверяем лимит участников
        if (chat.users.length >= 10) return false

        // Проверяем уникальность имени
        if (chat.users.some(user => user.name === userName)) return false

        const user: User = {
            id: crypto.randomUUID(),
            name: userName,
            joinedAt: new Date()
        }

        chat.users.push(user)
        currentUser.value = user
        currentChatId.value = chatId

        // Добавляем системное сообщение о входе
        addSystemMessage(`${userName} присоединился к чату`)

        return true
    }

    function leaveChat() {
        if (!currentUser.value || !currentChatId.value) return

        const chat = chatRooms.value.get(currentChatId.value)
        if (!chat) return

        // Добавляем системное сообщение о выходе
        addSystemMessage(`${currentUser.value.name} покинул чат`)

        // Удаляем пользователя из чата
        chat.users = chat.users.filter(user => user.id !== currentUser.value!.id)

        // Если чат пустой, удаляем его
        if (chat.users.length === 0) {
            chatRooms.value.delete(currentChatId.value)
        }

        currentUser.value = null
        currentChatId.value = null
    }

    function sendMessage(content: string) {
        if (!currentUser.value || !currentChatId.value || !content.trim()) return

        const chat = chatRooms.value.get(currentChatId.value)
        if (!chat) return

        const message: Message = {
            id: crypto.randomUUID(),
            type: 'user',
            content: content.trim(),
            author: currentUser.value.name,
            timestamp: new Date()
        }

        chat.messages.push(message)
    }

    function addSystemMessage(content: string) {
        if (!currentChatId.value) return

        const chat = chatRooms.value.get(currentChatId.value)
        if (!chat) return

        const message: Message = {
            id: crypto.randomUUID(),
            type: 'system',
            content,
            timestamp: new Date()
        }

        chat.messages.push(message)
    }

    function chatExists(chatId: string): boolean {
        return chatRooms.value.has(chatId)
    }

    function getChatUrl(chatId: string): string {
        return `${window.location.origin}/chat/${chatId}`
    }

    return {
        currentUser,
        currentChat,
        currentUsers,
        currentMessages,
        createChat,
        joinChat,
        leaveChat,
        sendMessage,
        chatExists,
        getChatUrl
    }
})
