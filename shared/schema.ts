import { pgTable, text, serial, integer, boolean, jsonb, timestamp } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  phone: text("phone"),
  state: text("state"),
  district: text("district"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const households = pgTable("households", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  address: text("address").notNull(),
  solarCapacity: integer("solar_capacity_watts").notNull(), // in watts
  batteryCapacity: integer("battery_capacity_kwh").notNull(), // in kWh
  currentBatteryLevel: integer("current_battery_percent").notNull().default(50), // 0-100
  isOnline: boolean("is_online").notNull().default(true),
  coordinates: jsonb("coordinates"), // {lat, lng}
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const energyReadings = pgTable("energy_readings", {
  id: serial("id").primaryKey(),
  householdId: integer("household_id").notNull().references(() => households.id, { onDelete: "cascade" }),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  solarGeneration: integer("solar_generation_watts").notNull(), // current solar generation in watts
  energyConsumption: integer("energy_consumption_watts").notNull(), // current consumption in watts
  batteryLevel: integer("battery_level_percent").notNull(), // 0-100
  weatherCondition: text("weather_condition"), // 'sunny', 'cloudy', 'rainy', etc.
  temperature: integer("temperature_celsius"),
});

export const energyTrades = pgTable("energy_trades", {
  id: serial("id").primaryKey(),
  sellerHouseholdId: integer("seller_household_id").references(() => households.id, { onDelete: "set null" }),
  buyerHouseholdId: integer("buyer_household_id").references(() => households.id, { onDelete: "set null" }),
  energyAmount: integer("energy_amount_kwh").notNull(), // in kWh
  pricePerKwh: integer("price_per_kwh_cents").notNull(), // price in cents
  status: text("status").notNull().default('pending'), // 'pending', 'accepted', 'in_progress', 'completed', 'cancelled'
  tradeType: text("trade_type").notNull(), // 'sell', 'buy'
  createdAt: timestamp("created_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
});

export const tradeAcceptances = pgTable("trade_acceptances", {
  id: serial("id").primaryKey(),
  tradeId: integer("trade_id").notNull().references(() => energyTrades.id, { onDelete: "cascade" }),
  acceptorUserId: integer("acceptor_user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  acceptorHouseholdId: integer("acceptor_household_id").notNull().references(() => households.id, { onDelete: "cascade" }),
  status: text("status").notNull().default('accepted'), // 'accepted', 'contacted', 'in_progress', 'completed', 'cancelled'
  contactShared: boolean("contact_shared").notNull().default(false),
  acceptedAt: timestamp("accepted_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
});

export const chatMessages = pgTable("chat_messages", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id, { onDelete: "set null" }),
  sessionId: text("session_id"), // For non-authenticated users
  username: text("username").notNull(),
  message: text("message").notNull(),
  type: text("type").notNull().default('user'), // 'user', 'system', 'ai'
  category: text("category").default('general'), // 'energy', 'trading', 'optimization', 'general'
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const userSessions = pgTable("user_sessions", {
  sessionId: text("session_id").primaryKey(),
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  expiresAt: timestamp("expires_at").notNull(),
});

// Define relationships between tables
export const usersRelations = relations(users, ({ many }) => ({
  households: many(households),
  chatMessages: many(chatMessages),
}));

export const householdsRelations = relations(households, ({ one, many }) => ({
  user: one(users, {
    fields: [households.userId],
    references: [users.id],
  }),
  energyReadings: many(energyReadings),
  energyTradesSelling: many(energyTrades, {
    relationName: "sellerTrades",
  }),
  energyTradesBuying: many(energyTrades, {
    relationName: "buyerTrades",
  }),
}));

export const energyReadingsRelations = relations(energyReadings, ({ one }) => ({
  household: one(households, {
    fields: [energyReadings.householdId],
    references: [households.id],
  }),
}));

export const energyTradesRelations = relations(energyTrades, ({ one, many }) => ({
  sellerHousehold: one(households, {
    fields: [energyTrades.sellerHouseholdId],
    references: [households.id],
    relationName: "sellerTrades",
  }),
  buyerHousehold: one(households, {
    fields: [energyTrades.buyerHouseholdId],
    references: [households.id],
    relationName: "buyerTrades",
  }),
  acceptances: many(tradeAcceptances),
}));

export const tradeAcceptancesRelations = relations(tradeAcceptances, ({ one }) => ({
  trade: one(energyTrades, {
    fields: [tradeAcceptances.tradeId],
    references: [energyTrades.id],
  }),
  acceptorUser: one(users, {
    fields: [tradeAcceptances.acceptorUserId],
    references: [users.id],
  }),
  acceptorHousehold: one(households, {
    fields: [tradeAcceptances.acceptorHouseholdId],
    references: [households.id],
  }),
}));

export const chatMessagesRelations = relations(chatMessages, ({ one }) => ({
  user: one(users, {
    fields: [chatMessages.userId],
    references: [users.id],
  }),
}));

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  email: true,
  password: true,
  phone: true,
  state: true,
  district: true,
});

export const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

// List of common temporary/disposable email domains
const tempEmailDomains = [
  '10minutemail.com', '10minutemail.net', 'guerrillamail.com', 'guerrillamail.org',
  'guerrillamail.net', 'guerrillamail.biz', 'guerrillamail.de', 'guerrillamailblock.com',
  'sharklasers.com', 'grr.la', 'guerrillamailblock.com', 'pokemail.net', 'spam4.me',
  'tempmail.org', 'tempail.com', 'temp-mail.org', 'yopmail.com', 'yopmail.fr',
  'yopmail.net', 'cool.fr.nf', 'jetable.fr.nf', 'nospam.ze.tc', 'nomail.xl.cx',
  'mega.zik.dj', 'speed.1s.fr', 'courriel.fr.nf', 'moncourrier.fr.nf', 'monemail.fr.nf',
  'monmail.fr.nf', 'mailinator.com', 'mailinator.net', 'mailinator.org', 'mailinator2.com',
  'mailinator.gq', 'safetymail.info', 'throwaway.email', 'fakemailgenerator.com',
  'trashmail.com', 'trashmail.org', 'trashmail.net', 'trashmail.ws', 'trashmailer.com',
  'temporaryemail.net', 'temporaryforwarding.com', '20minutemail.com', 'emailondeck.com',
  'maildrop.cc', 'tempinbox.com', 'tempemailaddress.com', 'tempemail.com', 'tempmailaddress.com',
  'getairmail.com', 'airmail.cc', 'mytrashmail.com', 'mintemail.com', 'spamgourmet.com',
  'mailcatch.com', 'mohmal.com', 'nada.email', 'getnada.com', 'dispostable.com',
  'emailfake.com', 'emailto.de', 'emkei.cz', 'fake-mail.ml', 'fakemail.net',
  'getnada.com', 'incognitomail.org', 'inboxkitten.com', 'mailnesia.com'
];

export const signupSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  email: z.string()
    .email("Please enter a valid email address")
    .refine((email) => {
      const domain = email.split('@')[1]?.toLowerCase();
      return !tempEmailDomains.includes(domain);
    }, "Please use a valid personal or business email address. Temporary email addresses are not allowed."),
  password: z.string()
    .min(8, "Password must be at least 8 characters")
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, "Password must contain at least one uppercase letter, one lowercase letter, and one number"),
  confirmPassword: z.string().min(1, "Please confirm your password"),
  // Contact information
  phone: z.string().min(10, "Phone number must be at least 10 digits"),
  state: z.string().min(1, "State is required"),
  district: z.string().min(1, "District is required"),
  // Household information
  householdName: z.string().min(1, "Household name is required"),
  address: z.string().min(1, "Address is required"),
  solarCapacity: z.coerce.number().min(1000, "Solar capacity must be at least 1000 watts"),
  batteryCapacity: z.coerce.number().min(1, "Battery capacity must be at least 1 kWh"),
  // Data accuracy confirmation
  dataAccuracyConfirmed: z.boolean().refine((val) => val === true, {
    message: "You must confirm that the provided details are accurate",
  }),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export const insertHouseholdSchema = createInsertSchema(households).pick({
  userId: true,
  name: true,
  address: true,
  solarCapacity: true,
  batteryCapacity: true,
  currentBatteryLevel: true,
  coordinates: true,
});

export const insertEnergyReadingSchema = createInsertSchema(energyReadings).pick({
  householdId: true,
  solarGeneration: true,
  energyConsumption: true,
  batteryLevel: true,
  weatherCondition: true,
  temperature: true,
});

export const insertEnergyTradeSchema = createInsertSchema(energyTrades).pick({
  sellerHouseholdId: true,
  buyerHouseholdId: true,
  energyAmount: true,
  pricePerKwh: true,
  tradeType: true,
}).partial({ sellerHouseholdId: true, buyerHouseholdId: true })
.refine((data) => {
  if (data.tradeType === 'sell' && !data.sellerHouseholdId) {
    return false;
  }
  if (data.tradeType === 'buy' && !data.buyerHouseholdId) {
    return false;
  }
  return true;
}, {
  message: "Either seller or buyer household ID must be provided based on trade type",
});

export const insertChatMessageSchema = createInsertSchema(chatMessages).pick({
  userId: true,
  sessionId: true,
  username: true,
  message: true,
  type: true,
  category: true,
});

export const insertTradeAcceptanceSchema = createInsertSchema(tradeAcceptances).pick({
  tradeId: true,
  acceptorUserId: true,
  acceptorHouseholdId: true,
  status: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertHousehold = z.infer<typeof insertHouseholdSchema>;
export type Household = typeof households.$inferSelect;
export type InsertEnergyReading = z.infer<typeof insertEnergyReadingSchema>;
export type EnergyReading = typeof energyReadings.$inferSelect;
export type InsertEnergyTrade = z.infer<typeof insertEnergyTradeSchema>;
export type EnergyTrade = typeof energyTrades.$inferSelect;
export type InsertChatMessage = z.infer<typeof insertChatMessageSchema>;
export type ChatMessage = typeof chatMessages.$inferSelect;
export type InsertTradeAcceptance = z.infer<typeof insertTradeAcceptanceSchema>;
export type TradeAcceptance = typeof tradeAcceptances.$inferSelect;


