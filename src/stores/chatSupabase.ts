import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from '../lib/supabase'
import type { Database } from '../lib/supabase'

type Chat = Database['public']['Tables']['chats']['Row']
type Participant = Database['public']['Tables']['chat_participants']['Row']
type Message = Database['public']['Tables']['chat_messages']['Row']

export interface ChatMessage {
  id: string
  type: 'user' | 'system'
  content: string
  author?: string
  timestamp: Date
}

export interface ChatUser {
  id: string
  name: string
  joinedAt: Date
  isOnline: boolean
}

export const useChatSupabaseStore = defineStore('chatSupabase', () => {
  const currentUser = ref<ChatUser | null>(null)
  const currentChatId = ref<string | null>(null)
  const currentUsers = ref<ChatUser[]>([])
  const currentMessages = ref<ChatMessage[]>([])
  const isLoading = ref(false)

  // Подписки на real-time обновления
  let participantsSubscription: any = null
  let messagesSubscription: any = null

  // Создание нового чата
  async function createChat(): Promise<string | null> {
    isLoading.value = true
    try {
      const { data, error } = await supabase
        .from('chats')
        .insert({})
        .select()
        .single()

      if (error) throw error
      return data.id
    } catch (error) {
      console.error('Ошибка создания чата:', error)
      return null
    } finally {
      isLoading.value = false
    }
  }

  // Проверка существования чата
  async function chatExists(chatId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('chats')
        .select('id, is_active, expires_at')
        .eq('id', chatId)
        .eq('is_active', true)
        .single()

      if (error || !data) return false

      // Проверяем, не истек ли чат
      const expiresAt = new Date(data.expires_at)
      if (expiresAt < new Date()) {
        // Деактивируем истекший чат
        await supabase
          .from('chats')
          .update({ is_active: false })
          .eq('id', chatId)
        return false
      }

      return true
    } catch (error) {
      console.error('Ошибка проверки чата:', error)
      return false
    }
  }

  // Присоединение к чату
  async function joinChat(chatId: string, userName: string): Promise<boolean> {
    isLoading.value = true
    try {
      // Проверяем существование чата
      if (!(await chatExists(chatId))) {
        return false
      }

      // Проверяем количество участников
      const { count } = await supabase
        .from('chat_participants')
        .select('*', { count: 'exact', head: true })
        .eq('chat_id', chatId)
        .eq('is_online', true)

      if (count && count >= 10) {
        return false
      }

      // Проверяем уникальность имени
      const { data: existingUser } = await supabase
        .from('chat_participants')
        .select('id')
        .eq('chat_id', chatId)
        .eq('user_name', userName)
        .eq('is_online', true)
        .single()

      if (existingUser) {
        return false
      }

      // Создаем сессию
      const sessionId = crypto.randomUUID()

      // Добавляем участника
      const { data: participant, error } = await supabase
        .from('chat_participants')
        .insert({
          chat_id: chatId,
          user_name: userName,
          session_id: sessionId,
          is_online: true
        })
        .select()
        .single()

      if (error) throw error

      // Устанавливаем текущего пользователя
      currentUser.value = {
        id: participant.id,
        name: participant.user_name,
        joinedAt: new Date(participant.joined_at),
        isOnline: true
      }
      currentChatId.value = chatId

      // Сохраняем сессию
      sessionStorage.setItem('chat_session', JSON.stringify({
        userId: participant.id,
        chatId,
        sessionId,
        userName
      }))

      // Добавляем системное сообщение
      await addSystemMessage(`${userName} присоединился к чату`)

      // Подписываемся на обновления
      await subscribeToUpdates(chatId)

      // Загружаем данные
      await loadChatData(chatId)

      return true
    } catch (error) {
      console.error('Ошибка присоединения к чату:', error)
      return false
    } finally {
      isLoading.value = false
    }
  }

  // Покидание чата
  async function leaveChat() {
    if (!currentUser.value || !currentChatId.value) return

    try {
      // Добавляем системное сообщение
      await addSystemMessage(`${currentUser.value.name} покинул чат`)

      // Помечаем пользователя как offline
      await supabase
        .from('chat_participants')
        .update({ is_online: false })
        .eq('id', currentUser.value.id)

      // Очищаем сессию
      sessionStorage.removeItem('chat_session')

      // Отписываемся от обновлений
      unsubscribeFromUpdates()

      // Очищаем состояние
      currentUser.value = null
      currentChatId.value = null
      currentUsers.value = []
      currentMessages.value = []
    } catch (error) {
      console.error('Ошибка при выходе из чата:', error)
    }
  }

  // Отправка сообщения
  async function sendMessage(content: string) {
    if (!currentUser.value || !currentChatId.value || !content.trim()) return

    // Создаем временное сообщение для оптимистичного обновления
    const tempMessage: ChatMessage = {
      id: crypto.randomUUID(),
      type: 'user',
      content: content.trim(),
      author: currentUser.value.name,
      timestamp: new Date()
    }
    
    // Добавляем сообщение локально сразу
    currentMessages.value.push(tempMessage)
    
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .insert({
          chat_id: currentChatId.value,
          participant_id: currentUser.value.id,
          message_type: 'user',
          content: content.trim()
        })
        .select()
        
      if (error) throw error
      
      // Обновляем локальное сообщение с данными сервера
      if (data && data.length > 0) {
        const serverMessage = data[0]
        const messageIndex = currentMessages.value.findIndex(m => m.id === tempMessage.id)
        if (messageIndex !== -1) {
          currentMessages.value[messageIndex] = {
            id: serverMessage.id,
            type: serverMessage.message_type as 'user' | 'system',
            content: serverMessage.content,
            author: currentUser.value.name,
            timestamp: new Date(serverMessage.created_at)
          }
        }
      }
    } catch (error) {
      console.error('Ошибка отправки сообщения:', error)
      // Удаляем сообщение из локального состояния в случае ошибки
      const messageIndex = currentMessages.value.findIndex(m => m.id === tempMessage.id)
      if (messageIndex !== -1) {
        currentMessages.value.splice(messageIndex, 1)
      }
    }
  }

  // Добавление системного сообщения
  async function addSystemMessage(content: string) {
    if (!currentChatId.value) return

    try {
      await supabase
        .from('chat_messages')
        .insert({
          chat_id: currentChatId.value,
          message_type: 'system',
          content
        })
    } catch (error) {
      console.error('Ошибка добавления системного сообщения:', error)
    }
  }

  // Подписка на real-time обновления
  async function subscribeToUpdates(chatId: string) {
    // Подписка на участников
    participantsSubscription = supabase
      .channel(`participants_${chatId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'chat_participants',
        filter: `chat_id=eq.${chatId}`
      }, () => {
        loadParticipants(chatId)
      })
      .subscribe()

    // Подписка на сообщения
    messagesSubscription = supabase
      .channel(`messages_${chatId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_messages',
        filter: `chat_id=eq.${chatId}`
      }, () => {
        loadMessages(chatId)
      })
      .subscribe()
  }

  // Отписка от обновлений
  function unsubscribeFromUpdates() {
    if (participantsSubscription) {
      supabase.removeChannel(participantsSubscription)
      participantsSubscription = null
    }
    if (messagesSubscription) {
      supabase.removeChannel(messagesSubscription)
      messagesSubscription = null
    }
  }

  // Загрузка данных чата
  async function loadChatData(chatId: string) {
    await Promise.all([
      loadParticipants(chatId),
      loadMessages(chatId)
    ])
  }

  // Загрузка участников
  async function loadParticipants(chatId: string) {
    try {
      const { data, error } = await supabase
        .from('chat_participants')
        .select('*')
        .eq('chat_id', chatId)
        .eq('is_online', true)
        .order('joined_at', { ascending: true })

      if (error) throw error

      currentUsers.value = data.map(p => ({
        id: p.id,
        name: p.user_name,
        joinedAt: new Date(p.joined_at),
        isOnline: p.is_online
      }))
    } catch (error) {
      console.error('Ошибка загрузки участников:', error)
    }
  }

  // Загрузка сообщений
  async function loadMessages(chatId: string) {
    console.log('📥 Загружаем сообщения для чата:', chatId)
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select(`
          *,
          chat_participants(user_name)
        `)
        .eq('chat_id', chatId)
        .order('created_at', { ascending: true })

      if (error) throw error

      console.log('📥 Получено сообщений:', data.length)
      console.log('📥 Данные сообщений:', data)
      
      const mappedMessages = data.map(m => ({
        id: m.id,
        type: m.message_type as 'user' | 'system',
        content: m.content,
        author: m.chat_participants?.user_name,
        timestamp: new Date(m.created_at)
      }))
      
      console.log('📥 Обработанные сообщения:', mappedMessages)
      
      // Проверяем, если это обновление от real-time подписки
      // Добавляем только новые сообщения, которых еще нет в currentMessages
      if (currentMessages.value.length > 0) {
        const existingIds = new Set(currentMessages.value.map(m => m.id))
        const newMessages = mappedMessages.filter(m => !existingIds.has(m.id))
        
        if (newMessages.length > 0) {
          console.log('📥 Добавляем новые сообщения:', newMessages)
          currentMessages.value.push(...newMessages)
          // Сортируем по времени
          currentMessages.value.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())
        } else {
          console.log('📥 Новых сообщений нет, пропускаем обновление')
        }
      } else {
        // Если сообщений еще нет, загружаем все
        currentMessages.value = mappedMessages
      }
      
      console.log('📥 currentMessages обновлено:', currentMessages.value.length)
    } catch (error) {
      console.error('Ошибка загрузки сообщений:', error)
    }
  }

  // Восстановление сессии
  async function restoreSession(): Promise<boolean> {
    try {
      const sessionData = sessionStorage.getItem('chat_session')
      if (!sessionData) return false

      const session = JSON.parse(sessionData)

      // Проверяем, что чат еще активен
      if (!(await chatExists(session.chatId))) {
        sessionStorage.removeItem('chat_session')
        return false
      }

      // Проверяем, что пользователь еще в чате
      const { data: participant } = await supabase
        .from('chat_participants')
        .select('*')
        .eq('id', session.userId)
        .eq('is_online', true)
        .single()

      if (!participant) {
        sessionStorage.removeItem('chat_session')
        return false
      }

      // Восстанавливаем состояние
      currentUser.value = {
        id: participant.id,
        name: participant.user_name,
        joinedAt: new Date(participant.joined_at),
        isOnline: true
      }
      currentChatId.value = session.chatId

      // Подписываемся на обновления и загружаем данные
      await subscribeToUpdates(session.chatId)
      await loadChatData(session.chatId)

      return true
    } catch (error) {
      console.error('Ошибка восстановления сессии:', error)
      sessionStorage.removeItem('chat_session')
      return false
    }
  }

  // Получение количества участников
  async function getChatParticipantCount(chatId: string): Promise<number> {
    try {
      const { count } = await supabase
        .from('chat_participants')
        .select('*', { count: 'exact', head: true })
        .eq('chat_id', chatId)
        .eq('is_online', true)

      return count || 0
    } catch (error) {
      console.error('Ошибка получения количества участников:', error)
      return 0
    }
  }

  // Утилиты
  function getChatUrl(chatId: string): string {
    return `${window.location.origin}/chat/${chatId}`
  }

  function isUserInChat(chatId: string): boolean {
    return currentChatId.value === chatId && currentUser.value !== null
  }

  return {
    currentUser,
    currentUsers,
    currentMessages,
    isLoading,
    createChat,
    chatExists,
    joinChat,
    leaveChat,
    sendMessage,
    restoreSession,
    getChatParticipantCount,
    getChatUrl,
    isUserInChat
  }
})
