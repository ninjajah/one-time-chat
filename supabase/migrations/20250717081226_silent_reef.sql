/*
  # Создание системы чатов

  1. Новые таблицы
    - `chats`
      - `id` (uuid, primary key)
      - `created_at` (timestamp)
      - `expires_at` (timestamp, автоматически через 24 часа)
      - `is_active` (boolean, по умолчанию true)
    - `chat_participants`
      - `id` (uuid, primary key)
      - `chat_id` (uuid, foreign key)
      - `user_name` (text, имя пользователя)
      - `joined_at` (timestamp)
      - `is_online` (boolean)
      - `session_id` (text, уникальный идентификатор сессии)
    - `chat_messages`
      - `id` (uuid, primary key)
      - `chat_id` (uuid, foreign key)
      - `participant_id` (uuid, foreign key, nullable)
      - `message_type` (text, 'user' или 'system')
      - `content` (text, содержимое сообщения)
      - `created_at` (timestamp)

  2. Безопасность
    - Включить RLS для всех таблиц
    - Разрешить все операции для анонимных пользователей (публичные чаты)

  3. Индексы
    - Оптимизация запросов по chat_id и времени создания
    - Индексы для быстрого поиска активных участников
*/

-- Создание таблицы чатов
CREATE TABLE IF NOT EXISTS chats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz DEFAULT (now() + '24:00:00'::interval),
  is_active boolean DEFAULT true
);

-- Создание таблицы участников чата
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

-- Включение Row Level Security
ALTER TABLE chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Политики безопасности (разрешаем все операции для публичных чатов)
CREATE POLICY "Allow all operations on chats"
  ON chats
  FOR ALL
  TO public
  USING (true);

CREATE POLICY "Allow all operations on participants"
  ON chat_participants
  FOR ALL
  TO public
  USING (true);

CREATE POLICY "Allow all operations on messages"
  ON chat_messages
  FOR ALL
  TO public
  USING (true);

-- Создание индексов для оптимизации
CREATE INDEX IF NOT EXISTS idx_chats_active_expires ON chats(is_active, expires_at);
CREATE INDEX IF NOT EXISTS idx_chat_participants_chat_id ON chat_participants(chat_id);
CREATE INDEX IF NOT EXISTS idx_chat_participants_online ON chat_participants(chat_id, is_online);
CREATE INDEX IF NOT EXISTS idx_chat_messages_chat_id ON chat_messages(chat_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(chat_id, created_at);