import { pgTable, uuid, varchar, text, timestamp, pgEnum, primaryKey } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// --- ENUMS ---
// Tracks the lifecycle of a message
export const messageStatusEnum = pgEnum('message_status', ['sent', 'delivered', 'read']);

// --- TABLES ---

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  
  // Authentication
  password : text('auth_hash').notNull(),
  
  // Identity (Public Lock)
  publicKey: text('public_key').notNull(),
  
  // Encrypted Backup Bundle (Private Key Vault)
  backupCiphertext: text('backup_ciphertext').notNull(),
  backupIv: text('backup_iv').notNull(),
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const conversations = pgTable('conversations', {
  id: uuid('id').defaultRandom().primaryKey(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const participants = pgTable('participants', {
  conversationId: uuid('conversation_id').references(() => conversations.id).notNull(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  joinedAt: timestamp('joined_at').defaultNow().notNull(),
}, (table) => [
  // A user can only join a specific conversation once
  primaryKey({ columns: [table.conversationId, table.userId] })
]);

export const messages = pgTable('messages', {
  id: uuid('id').defaultRandom().primaryKey(),
  conversationId: uuid('conversation_id').references(() => conversations.id).notNull(),
  senderId: uuid('sender_id').references(() => users.id).notNull(),
  
  receiverCiphertext: text('receiver_ciphertext').notNull(),
  receiverIv: text('receiver_iv').notNull(),
  
  senderCiphertext: text('sender_ciphertext').notNull(),
  senderIv: text('sender_iv').notNull(),
  
  status: messageStatusEnum('status').default('sent').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// --- RELATIONS (For Drizzle Queries) ---

export const usersRelations = relations(users, ({ many }) => ({
  participants: many(participants),
  messages: many(messages),
}));

export const conversationsRelations = relations(conversations, ({ many }) => ({
  participants: many(participants),
  messages: many(messages),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  conversation: one(conversations, {
    fields: [messages.conversationId],
    references: [conversations.id],
  }),
  sender: one(users, {
    fields: [messages.senderId],
    references: [users.id],
  }),
}));