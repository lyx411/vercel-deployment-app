import { pgTable, text, serial, timestamp, foreignKey, uuid, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users table - 基于Supabase结构
export const users = pgTable("users", {
  id: uuid("id").primaryKey(),
  name: text("name"),
  business_type: text("business_type"),
  business_intro: text("business_intro"),
  avatar_url: text("avatar_url"),
  created_at: timestamp("created_at").defaultNow(),
});

// Chat sessions table - 基于Supabase实际表结构
export const chatSessions = pgTable("chat_sessions", {
  id: uuid("id").primaryKey(),
  host_id: uuid("host_id").notNull(),
  guest_id: uuid("guest_id"),
  created_at: timestamp("created_at").defaultNow(),
  host_name: text("host_name"),
  guest_name: text("guest_name"),
  last_activity: timestamp("last_activity"),
  has_unread: boolean("has_unread").default(false),
});

// Messages table - 基于数据库实际结构
export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  chat_session_id: uuid("chat_session_id").notNull(), // 聊天会话ID
  content: text("content").notNull(),
  sender_id: uuid("sender_id").notNull(), // 发送者ID
  sender_name: text("sender_name"), // 发送者名称
  is_host: boolean("is_host").notNull(), // 是否是主持人
  timestamp: timestamp("timestamp").defaultNow(),
  original_language: text("original_language"), // 原始语言
  translated_content: text("translated_content"), // 翻译后的内容
  translation_status: text("translation_status").default('pending'), // 翻译状态
});

// 插入模式定义
export const insertUserSchema = createInsertSchema(users);
// 不需要pick字段，因为createInsertSchema已经省略了id

export const insertChatSessionSchema = createInsertSchema(chatSessions).pick({
  host_id: true,
  guest_id: true,
  host_name: true,
  guest_name: true,
  has_unread: true,
});

export const insertMessageSchema = createInsertSchema(messages).pick({
  chat_session_id: true,
  content: true,
  sender_id: true,
  sender_name: true,
  is_host: true,
  original_language: true,
  translation_status: true
});

// 类型定义
export type User = typeof users.$inferSelect;
export type InsertUser = Omit<User, 'id'>;

export type ChatSession = typeof chatSessions.$inferSelect;
export type InsertChatSession = z.infer<typeof insertChatSessionSchema>;

export type Message = typeof messages.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;

// 前端类型定义
export interface HostInfo {
  id: string;
  name: string;
  title: string;
  url: string;
  avatarUrl: string;
}

export interface ChatMessage {
  id: number;
  content: string;
  sender: 'host' | 'guest';
  timestamp: Date;
  original_language?: string;
  translated_content?: string;
  translation_status?: 'pending' | 'completed' | 'failed';
  showTranslated?: boolean; // 客户端状态，控制显示原文还是译文
}
