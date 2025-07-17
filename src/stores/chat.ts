import {defineStore} from 'pinia'
import {ref, computed} from 'vue'

// Ключ для localStorage
const STORAGE_KEY = 'one-time-chats'

// Функции для работы с localStorage
function saveChatsToStorage(chats: Map<string, ChatRoom>) {
    try {
        const chatsArray = Array.from(chats.entries()).map(([id, chat]) => [id, {
            ...chat,
            createdAt: chat.createdAt.toISOString(),
            users: chat.users.map(user => ({
                ...user,
                joinedAt: user.joinedAt.toISOString()
            })),
            messages: chat.messages.map(message => ({
                ...message,
                timestamp: message.timestamp.toISOString()
            }))
        }])
        localStorage.setItem(STORAGE_KEY, JSON.stringify(chatsArray))
    } catch (error) {
        console.warn('Не удалось сохранить чаты в localStorage:', error)
    }
}

function loadChatsFromStorage(): Map<string, ChatRoom> {
    try {
        const stored = localStorage.getItem(STORAGE_KEY)
        if (!stored) return new Map()
        
        const chatsArray = JSON.parse(stored)
        const chats = new Map<string, ChatRoom>()
        
        chatsArray.forEach(([id, chat]: [string, any]) => {
            chats.set(id, {
                ...chat,
                createdAt: new Date(chat.createdAt),
                users: chat.users.map((user: any) => ({
                    ...user,
                    joinedAt: new Date(user.joinedAt)
                })),
                messages: chat.messages.map((message: any) => ({
                    ...message,
                    timestamp: new Date(message.timestamp)
                }))
            })
        })
        
        return chats
    } catch (error) {
        console.warn('Не удалось загрузить чаты из localStorage:', error)
        return new Map()
    }
}

// Функция для очистки старых чатов (старше 24 часов)
function cleanupOldChats(chats: Map<string, ChatRoom>) {
    const now = new Date()
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    
    for (const [id, chat] of chats.entries()) {
        if (chat.createdAt < oneDayAgo) {
            chats.delete(id)
        }
    }
}

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
    // Загружаем чаты из localStorage при инициализации
    const chatRooms = ref<Map<string, ChatRoom>>(loadChatsFromStorage())
    const currentUser = ref<User | null>(null)
    const currentChatId = ref<string | null>(null)
    
    // Очищаем старые чаты при загрузке
    cleanupOldChats(chatRooms.value)
    saveChatsToStorage(chatRooms.value)

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
        saveChatsToStorage(chatRooms.value)
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
        saveChatsToStorage(chatRooms.value)

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
        } else {
            // Сохраняем изменения если чат не удален
            saveChatsToStorage(chatRooms.value)
        }
        
        // Сохраняем изменения в любом случае
        saveChatsToStorage(chatRooms.value)

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
        saveChatsToStorage(chatRooms.value)
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
        saveChatsToStorage(chatRooms.value)
    }

    function chatExists(chatId: string): boolean {
        return chatRooms.value.has(chatId)
    }

    function getChatUrl(chatId: string): string {
        return `${window.location.origin}/chat/${chatId}`
    }

    function getChatParticipantCount(chatId: string): number {
        const chat = chatRooms.value.get(chatId)
        return chat ? chat.users.length : 0
    }
    function clearAllChats() {
        chatRooms.value.clear()
        localStorage.removeItem(STORAGE_KEY)
        currentUser.value = null
        currentChatId.value = null
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
        getChatUrl,
        getChatParticipantCount,
        clearAllChats
    }
})