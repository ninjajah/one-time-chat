/*
  # Создание таблиц для чата

  1. Новые таблицы
    - `chats` - основная таблица чатов
      - `id` (uuid, primary key)
      - `created_at` (timestamp)
      - `expires_at` (timestamp, чат истекает через 24 часа)
      - `is_active` (boolean, активен ли чат)
    
    - `chat_participants` - участники чатов
      - `id` (uuid, primary key)
      - `chat_id` (uuid, foreign key)
      - `user_name` (text, имя пользователя)
      - `joined_at` (timestamp)
      - `is_online` (boolean, онлайн ли пользователь)
      - `session_id` (text, уникальный идентификатор сессии)
    
    - `chat_messages` - сообщения в чатах
      - `id` (uuid, primary key)
      - `chat_id` (uuid, foreign key)
      - `participant_id` (uuid, foreign key, может быть null для системных сообщений)
      - `message_type` (text, 'user' или 'system')
      - `content` (text, содержимое сообщения)
      - `created_at` (timestamp)

  2. Безопасность
    - Включен RLS для всех таблиц
    - Политики разрешают доступ всем (анонимные чаты)
    - Автоматическое удаление старых чатов через функцию

  3. Индексы
    - Оптимизация запросов по chat_id
    - Индексы для сортировки по времени
*/

-- Создание таблицы чатов
CREATE TABLE IF NOT EXISTS chats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz DEFAULT (now() + INTERVAL '24 hours'),
  is_active boolean DEFAULT true
);

-- Создание таблицы участников
CREATE TABLE IF NOT EXISTS chat_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id uuid REFERENCES chats(id) ON DELETE CASCADE,
  user_name varchar(50) NOT NULL,
  joined_at timestamptz DEFAULT now(),
  is_online boolean DEFAULT true,
  session_id varchar(255) UNIQUE NOT NULL
);

-- Создание таблицы сообщений
CREATE TABLE IF NOT EXISTS chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id uuid REFERENCES chats(id) ON DELETE CASCADE,
  participant_id uuid REFERENCES chat_participants(id) ON DELETE SET NULL,
  message_type varchar(20) DEFAULT 'user',
  content text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Включение RLS
ALTER TABLE chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Политики безопасности (разрешаем всем для анонимных чатов)
CREATE POLICY "Allow all operations on chats" ON chats FOR ALL USING (true);
CREATE POLICY "Allow all operations on participants" ON chat_participants FOR ALL USING (true);
CREATE POLICY "Allow all operations on messages" ON chat_messages FOR ALL USING (true);

-- Индексы для оптимизации
CREATE INDEX IF NOT EXISTS idx_chat_participants_chat_id ON chat_participants(chat_id);
CREATE INDEX IF NOT EXISTS idx_chat_participants_online ON chat_participants(chat_id, is_online);
CREATE INDEX IF NOT EXISTS idx_chat_messages_chat_id ON chat_messages(chat_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(chat_id, created_at);
CREATE INDEX IF NOT EXISTS idx_chats_active_expires ON chats(is_active, expires_at);

-- Функция для автоматической очистки старых чатов
CREATE OR REPLACE FUNCTION cleanup_expired_chats()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  -- Деактивируем истекшие чаты
  UPDATE chats 
  SET is_active = false 
  WHERE expires_at < now() AND is_active = true;
  
  -- Удаляем чаты старше 48 часов (даем время на восстановление)
  DELETE FROM chats 
  WHERE created_at < (now() - INTERVAL '48 hours');
END;
$$;

-- Создание задачи для автоматической очистки (если поддерживается)
-- Это будет работать только если у вас есть pg_cron расширение
DO $$
BEGIN
  -- Попытка создать задачу очистки каждый час
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.schedule('cleanup-expired-chats', '0 * * * *', 'SELECT cleanup_expired_chats();');
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    -- Игнорируем ошибки если pg_cron недоступен
    NULL;
END;
$$;