var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// shared/schema.ts
var schema_exports = {};
__export(schema_exports, {
  chatMessages: () => chatMessages,
  chatMessagesRelations: () => chatMessagesRelations,
  energyReadings: () => energyReadings,
  energyReadingsRelations: () => energyReadingsRelations,
  energyTrades: () => energyTrades,
  energyTradesRelations: () => energyTradesRelations,
  households: () => households,
  householdsRelations: () => householdsRelations,
  insertChatMessageSchema: () => insertChatMessageSchema,
  insertEnergyReadingSchema: () => insertEnergyReadingSchema,
  insertEnergyTradeSchema: () => insertEnergyTradeSchema,
  insertHouseholdSchema: () => insertHouseholdSchema,
  insertTradeAcceptanceSchema: () => insertTradeAcceptanceSchema,
  insertUserSchema: () => insertUserSchema,
  loginSchema: () => loginSchema,
  signupSchema: () => signupSchema,
  tradeAcceptances: () => tradeAcceptances,
  tradeAcceptancesRelations: () => tradeAcceptancesRelations,
  userSessions: () => userSessions,
  users: () => users,
  usersRelations: () => usersRelations
});
import { pgTable, text, serial, integer, boolean, jsonb, timestamp } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
var users, households, energyReadings, energyTrades, tradeAcceptances, chatMessages, userSessions, usersRelations, householdsRelations, energyReadingsRelations, energyTradesRelations, tradeAcceptancesRelations, chatMessagesRelations, insertUserSchema, loginSchema, tempEmailDomains, signupSchema, insertHouseholdSchema, insertEnergyReadingSchema, insertEnergyTradeSchema, insertChatMessageSchema, insertTradeAcceptanceSchema;
var init_schema = __esm({
  "shared/schema.ts"() {
    "use strict";
    users = pgTable("users", {
      id: serial("id").primaryKey(),
      username: text("username").notNull().unique(),
      email: text("email").notNull().unique(),
      password: text("password").notNull(),
      phone: text("phone"),
      state: text("state"),
      district: text("district"),
      createdAt: timestamp("created_at").defaultNow().notNull()
    });
    households = pgTable("households", {
      id: serial("id").primaryKey(),
      userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
      name: text("name").notNull(),
      address: text("address").notNull(),
      solarCapacity: integer("solar_capacity_watts").notNull(),
      // in watts
      batteryCapacity: integer("battery_capacity_kwh").notNull(),
      // in kWh
      currentBatteryLevel: integer("current_battery_percent").notNull().default(50),
      // 0-100
      isOnline: boolean("is_online").notNull().default(true),
      coordinates: jsonb("coordinates"),
      // {lat, lng}
      createdAt: timestamp("created_at").defaultNow().notNull()
    });
    energyReadings = pgTable("energy_readings", {
      id: serial("id").primaryKey(),
      householdId: integer("household_id").notNull().references(() => households.id, { onDelete: "cascade" }),
      timestamp: timestamp("timestamp").defaultNow().notNull(),
      solarGeneration: integer("solar_generation_watts").notNull(),
      // current solar generation in watts
      energyConsumption: integer("energy_consumption_watts").notNull(),
      // current consumption in watts
      batteryLevel: integer("battery_level_percent").notNull(),
      // 0-100
      weatherCondition: text("weather_condition"),
      // 'sunny', 'cloudy', 'rainy', etc.
      temperature: integer("temperature_celsius")
    });
    energyTrades = pgTable("energy_trades", {
      id: serial("id").primaryKey(),
      sellerHouseholdId: integer("seller_household_id").references(() => households.id, { onDelete: "set null" }),
      buyerHouseholdId: integer("buyer_household_id").references(() => households.id, { onDelete: "set null" }),
      energyAmount: integer("energy_amount_kwh").notNull(),
      // in kWh
      pricePerKwh: integer("price_per_kwh_cents").notNull(),
      // price in cents
      status: text("status").notNull().default("pending"),
      // 'pending', 'accepted', 'in_progress', 'completed', 'cancelled'
      tradeType: text("trade_type").notNull(),
      // 'sell', 'buy'
      createdAt: timestamp("created_at").defaultNow().notNull(),
      completedAt: timestamp("completed_at")
    });
    tradeAcceptances = pgTable("trade_acceptances", {
      id: serial("id").primaryKey(),
      tradeId: integer("trade_id").notNull().references(() => energyTrades.id, { onDelete: "cascade" }),
      acceptorUserId: integer("acceptor_user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
      acceptorHouseholdId: integer("acceptor_household_id").notNull().references(() => households.id, { onDelete: "cascade" }),
      status: text("status").notNull().default("accepted"),
      // 'accepted', 'contacted', 'in_progress', 'completed', 'cancelled'
      contactShared: boolean("contact_shared").notNull().default(false),
      acceptedAt: timestamp("accepted_at").defaultNow().notNull(),
      completedAt: timestamp("completed_at")
    });
    chatMessages = pgTable("chat_messages", {
      id: serial("id").primaryKey(),
      userId: integer("user_id").references(() => users.id, { onDelete: "set null" }),
      sessionId: text("session_id"),
      // For non-authenticated users
      username: text("username").notNull(),
      message: text("message").notNull(),
      type: text("type").notNull().default("user"),
      // 'user', 'system', 'ai'
      category: text("category").default("general"),
      // 'energy', 'trading', 'optimization', 'general'
      createdAt: timestamp("created_at").defaultNow().notNull()
    });
    userSessions = pgTable("user_sessions", {
      sessionId: text("session_id").primaryKey(),
      userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
      createdAt: timestamp("created_at").defaultNow().notNull(),
      expiresAt: timestamp("expires_at").notNull()
    });
    usersRelations = relations(users, ({ many }) => ({
      households: many(households),
      chatMessages: many(chatMessages)
    }));
    householdsRelations = relations(households, ({ one, many }) => ({
      user: one(users, {
        fields: [households.userId],
        references: [users.id]
      }),
      energyReadings: many(energyReadings),
      energyTradesSelling: many(energyTrades, {
        relationName: "sellerTrades"
      }),
      energyTradesBuying: many(energyTrades, {
        relationName: "buyerTrades"
      })
    }));
    energyReadingsRelations = relations(energyReadings, ({ one }) => ({
      household: one(households, {
        fields: [energyReadings.householdId],
        references: [households.id]
      })
    }));
    energyTradesRelations = relations(energyTrades, ({ one, many }) => ({
      sellerHousehold: one(households, {
        fields: [energyTrades.sellerHouseholdId],
        references: [households.id],
        relationName: "sellerTrades"
      }),
      buyerHousehold: one(households, {
        fields: [energyTrades.buyerHouseholdId],
        references: [households.id],
        relationName: "buyerTrades"
      }),
      acceptances: many(tradeAcceptances)
    }));
    tradeAcceptancesRelations = relations(tradeAcceptances, ({ one }) => ({
      trade: one(energyTrades, {
        fields: [tradeAcceptances.tradeId],
        references: [energyTrades.id]
      }),
      acceptorUser: one(users, {
        fields: [tradeAcceptances.acceptorUserId],
        references: [users.id]
      }),
      acceptorHousehold: one(households, {
        fields: [tradeAcceptances.acceptorHouseholdId],
        references: [households.id]
      })
    }));
    chatMessagesRelations = relations(chatMessages, ({ one }) => ({
      user: one(users, {
        fields: [chatMessages.userId],
        references: [users.id]
      })
    }));
    insertUserSchema = createInsertSchema(users).pick({
      username: true,
      email: true,
      password: true,
      phone: true,
      state: true,
      district: true
    });
    loginSchema = z.object({
      email: z.string().email("Please enter a valid email address"),
      password: z.string().min(1, "Password is required")
    });
    tempEmailDomains = [
      "10minutemail.com",
      "10minutemail.net",
      "guerrillamail.com",
      "guerrillamail.org",
      "guerrillamail.net",
      "guerrillamail.biz",
      "guerrillamail.de",
      "guerrillamailblock.com",
      "sharklasers.com",
      "grr.la",
      "guerrillamailblock.com",
      "pokemail.net",
      "spam4.me",
      "tempmail.org",
      "tempail.com",
      "temp-mail.org",
      "yopmail.com",
      "yopmail.fr",
      "yopmail.net",
      "cool.fr.nf",
      "jetable.fr.nf",
      "nospam.ze.tc",
      "nomail.xl.cx",
      "mega.zik.dj",
      "speed.1s.fr",
      "courriel.fr.nf",
      "moncourrier.fr.nf",
      "monemail.fr.nf",
      "monmail.fr.nf",
      "mailinator.com",
      "mailinator.net",
      "mailinator.org",
      "mailinator2.com",
      "mailinator.gq",
      "safetymail.info",
      "throwaway.email",
      "fakemailgenerator.com",
      "trashmail.com",
      "trashmail.org",
      "trashmail.net",
      "trashmail.ws",
      "trashmailer.com",
      "temporaryemail.net",
      "temporaryforwarding.com",
      "20minutemail.com",
      "emailondeck.com",
      "maildrop.cc",
      "tempinbox.com",
      "tempemailaddress.com",
      "tempemail.com",
      "tempmailaddress.com",
      "getairmail.com",
      "airmail.cc",
      "mytrashmail.com",
      "mintemail.com",
      "spamgourmet.com",
      "mailcatch.com",
      "mohmal.com",
      "nada.email",
      "getnada.com",
      "dispostable.com",
      "emailfake.com",
      "emailto.de",
      "emkei.cz",
      "fake-mail.ml",
      "fakemail.net",
      "getnada.com",
      "incognitomail.org",
      "inboxkitten.com",
      "mailnesia.com"
    ];
    signupSchema = z.object({
      username: z.string().min(3, "Username must be at least 3 characters"),
      email: z.string().email("Please enter a valid email address").refine((email) => {
        const domain = email.split("@")[1]?.toLowerCase();
        return !tempEmailDomains.includes(domain);
      }, "Please use a valid personal or business email address. Temporary email addresses are not allowed."),
      password: z.string().min(8, "Password must be at least 8 characters").regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, "Password must contain at least one uppercase letter, one lowercase letter, and one number"),
      confirmPassword: z.string().min(1, "Please confirm your password"),
      // Contact information
      phone: z.string().min(10, "Phone number must be at least 10 digits"),
      state: z.string().min(1, "State is required"),
      district: z.string().min(1, "District is required"),
      // Household information
      householdName: z.string().min(1, "Household name is required"),
      address: z.string().min(1, "Address is required"),
      solarCapacity: z.coerce.number().min(1e3, "Solar capacity must be at least 1000 watts"),
      batteryCapacity: z.coerce.number().min(1, "Battery capacity must be at least 1 kWh"),
      // Data accuracy confirmation
      dataAccuracyConfirmed: z.boolean().refine((val) => val === true, {
        message: "You must confirm that the provided details are accurate"
      })
    }).refine((data) => data.password === data.confirmPassword, {
      message: "Passwords don't match",
      path: ["confirmPassword"]
    });
    insertHouseholdSchema = createInsertSchema(households).pick({
      userId: true,
      name: true,
      address: true,
      solarCapacity: true,
      batteryCapacity: true,
      currentBatteryLevel: true,
      coordinates: true
    });
    insertEnergyReadingSchema = createInsertSchema(energyReadings).pick({
      householdId: true,
      solarGeneration: true,
      energyConsumption: true,
      batteryLevel: true,
      weatherCondition: true,
      temperature: true
    });
    insertEnergyTradeSchema = createInsertSchema(energyTrades).pick({
      sellerHouseholdId: true,
      buyerHouseholdId: true,
      energyAmount: true,
      pricePerKwh: true,
      tradeType: true
    }).partial({ sellerHouseholdId: true, buyerHouseholdId: true }).refine((data) => {
      if (data.tradeType === "sell" && !data.sellerHouseholdId) {
        return false;
      }
      if (data.tradeType === "buy" && !data.buyerHouseholdId) {
        return false;
      }
      return true;
    }, {
      message: "Either seller or buyer household ID must be provided based on trade type"
    });
    insertChatMessageSchema = createInsertSchema(chatMessages).pick({
      userId: true,
      sessionId: true,
      username: true,
      message: true,
      type: true,
      category: true
    });
    insertTradeAcceptanceSchema = createInsertSchema(tradeAcceptances).pick({
      tradeId: true,
      acceptorUserId: true,
      acceptorHouseholdId: true,
      status: true
    });
  }
});

// server/db.ts
var db_exports = {};
__export(db_exports, {
  db: () => db,
  initializeDatabase: () => initializeDatabase,
  pool: () => pool
});
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
function getDatabaseUrl() {
  let databaseUrl = process.env.DATABASE_URL;
  if (databaseUrl) {
    console.log("Found DATABASE_URL:", databaseUrl.substring(0, 60) + "...");
    return databaseUrl;
  }
  console.log("DATABASE_URL not found in environment");
  return null;
}
async function initializeDatabase() {
  const databaseUrl = getDatabaseUrl();
  if (databaseUrl) {
    console.log("Using DATABASE_URL:", databaseUrl.substring(0, 50) + "...");
    try {
      pool = new Pool({
        connectionString: databaseUrl,
        ssl: databaseUrl.includes("sslmode=require") ? { rejectUnauthorized: false } : false
      });
      db = drizzle(pool, { schema: schema_exports });
      await pool.query("SELECT 1");
      console.log("Database connected successfully");
      return true;
    } catch (error) {
      console.warn("Database connection failed, using memory storage:", error instanceof Error ? error.message : String(error));
      db = null;
      pool = null;
      return false;
    }
  } else {
    console.log("No DATABASE_URL found, using memory storage");
    return false;
  }
}
var db, pool;
var init_db = __esm({
  "server/db.ts"() {
    "use strict";
    init_schema();
    db = null;
    pool = null;
    initializeDatabase().catch(console.error);
  }
});

// server/index.ts
import express2 from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

// server/storage.ts
init_schema();
import { eq, desc, count, ne, and, or, sql, inArray } from "drizzle-orm";

// server/weather-service.ts
var WeatherService = class {
  cache = /* @__PURE__ */ new Map();
  CACHE_DURATION = 10 * 60 * 1e3;
  // 10 minutes
  async getCurrentWeather(location) {
    const cacheKey = `${location.latitude.toFixed(4)},${location.longitude.toFixed(4)}`;
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      console.log(`\u{1F324}\uFE0F Using cached weather for ${cacheKey}`);
      return cached.data;
    }
    try {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${location.latitude}&longitude=${location.longitude}&current_weather=true&daily=sunrise,sunset&hourly=temperature_2m,relative_humidity_2m,cloud_cover,wind_speed_10m,uv_index&timezone=auto`;
      console.log(`\u{1F324}\uFE0F Fetching REAL weather from Open-Meteo API for coordinates: ${location.latitude}, ${location.longitude}`);
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Weather API error: ${response.status}`);
      }
      const data = await response.json();
      console.log(`\u{1F324}\uFE0F Real weather API response:`, JSON.stringify(data.current_weather, null, 2));
      const current = data.current_weather;
      const hourly = data.hourly;
      const daily = data.daily;
      const currentTime = /* @__PURE__ */ new Date();
      const currentHour = currentTime.getHours();
      const todaySunrise = new Date(daily.sunrise[0]).getTime();
      const todaySunset = new Date(daily.sunset[0]).getTime();
      const currentTimestamp = currentTime.getTime();
      const isDay = current.is_day === 1;
      const weatherCode = current.weather_code;
      let condition;
      if (weatherCode <= 1) condition = "sunny";
      else if (weatherCode <= 3) condition = "partly-cloudy";
      else if (weatherCode <= 48) condition = "cloudy";
      else if (weatherCode <= 67) condition = "overcast";
      else if (weatherCode <= 82) condition = "rainy";
      else condition = "stormy";
      if (!isDay && condition === "sunny") {
        condition = "partly-cloudy";
      }
      const weatherData = {
        temperature: Math.round(current.temperature * 10) / 10,
        condition,
        cloudCover: hourly.cloud_cover?.[currentHour] || 0,
        windSpeed: Math.round(current.windspeed * 10) / 10,
        humidity: hourly.relative_humidity_2m?.[currentHour] || 50,
        uvIndex: hourly.uv_index?.[currentHour] || 0,
        visibility: 10,
        // Default visibility
        isDay,
        sunrise: todaySunrise,
        sunset: todaySunset
      };
      this.cache.set(cacheKey, { data: weatherData, timestamp: Date.now() });
      return weatherData;
    } catch (error) {
      console.error("Failed to fetch weather data:", error);
      return this.generateFallbackWeather(location, Date.now());
    }
  }
  generateFallbackWeather(location, timestamp2) {
    const now = new Date(timestamp2);
    const hour = now.getHours();
    const month = now.getMonth();
    const { sunrise, sunset } = this.calculateSunTimes(location, now);
    const isDay = timestamp2 >= sunrise && timestamp2 <= sunset;
    const seasonalBaseTemp = [5, 8, 15, 22, 28, 32, 35, 33, 28, 20, 12, 7][month];
    const hourlyVariation = isDay ? Math.sin((hour - 6) / 12 * Math.PI) * 8 : 0;
    const temperature = seasonalBaseTemp + hourlyVariation;
    const weatherSeed = Math.floor(timestamp2 / (15 * 60 * 1e3));
    const seededRandom = (seed) => {
      const x = Math.sin(seed) * 1e4;
      return x - Math.floor(x);
    };
    let condition;
    let cloudCover;
    if (!isDay) {
      const nightRandom = seededRandom(weatherSeed + 200);
      condition = nightRandom > 0.7 ? "partly-cloudy" : "cloudy";
      cloudCover = nightRandom > 0.7 ? 30 : 70;
    } else {
      const weatherRandom = seededRandom(weatherSeed + 300);
      if (weatherRandom > 0.7) {
        condition = "sunny";
        cloudCover = 10;
      } else if (weatherRandom > 0.5) {
        condition = "partly-cloudy";
        cloudCover = 40;
      } else if (weatherRandom > 0.3) {
        condition = "cloudy";
        cloudCover = 80;
      } else {
        condition = "overcast";
        cloudCover = 95;
      }
    }
    return {
      temperature: Math.round(temperature * 10) / 10,
      condition,
      cloudCover,
      windSpeed: 10 + seededRandom(weatherSeed + 500) * 15,
      humidity: 50 + seededRandom(weatherSeed + 600) * 30,
      uvIndex: isDay ? Math.max(0, 6 + seededRandom(weatherSeed + 700) * 5) : 0,
      visibility: 8 + seededRandom(weatherSeed + 800) * 4,
      isDay,
      sunrise,
      sunset
    };
  }
  calculateSunTimes(location, date) {
    const dayOfYear = Math.floor((date.getTime() - new Date(date.getFullYear(), 0, 0).getTime()) / 864e5);
    const solarDeclination = 23.45 * Math.sin(360 * (284 + dayOfYear) / 365 * Math.PI / 180);
    const hourAngle = Math.acos(-Math.tan(location.latitude * Math.PI / 180) * Math.tan(solarDeclination * Math.PI / 180));
    const solarNoon = 12 - location.longitude / 15;
    const sunriseHour = solarNoon - hourAngle * 180 / Math.PI / 15;
    const sunsetHour = solarNoon + hourAngle * 180 / Math.PI / 15;
    const baseDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    return {
      sunrise: baseDate.getTime() + sunriseHour * 60 * 60 * 1e3,
      sunset: baseDate.getTime() + sunsetHour * 60 * 60 * 1e3
    };
  }
  // Calculate solar generation efficiency based on sun position and weather
  calculateSolarEfficiency(weather, location) {
    if (!weather.isDay) return 0;
    const now = /* @__PURE__ */ new Date();
    const currentTime = now.getTime();
    const timeInDay = (currentTime - weather.sunrise) / (weather.sunset - weather.sunrise);
    const sunAngleMultiplier = Math.sin(timeInDay * Math.PI);
    const conditionMultipliers = {
      "sunny": 1,
      "partly-cloudy": 0.82,
      "cloudy": 0.45,
      "overcast": 0.25,
      "rainy": 0.15,
      "stormy": 0.08
    };
    const cloudImpact = Math.max(0.1, 1 - weather.cloudCover / 100 * 0.7);
    const tempImpact = weather.temperature <= 25 ? 1 : Math.max(0.7, 1 - (weather.temperature - 25) * 4e-3);
    return Math.max(0, conditionMultipliers[weather.condition] * sunAngleMultiplier * cloudImpact * tempImpact);
  }
};
var weatherService = new WeatherService();

// server/storage.ts
import session from "express-session";
import createMemoryStore from "memorystore";
import connectPg from "connect-pg-simple";
import { config } from "dotenv";
config();
function getDatabaseUrl2() {
  let dbUrl = process.env.DATABASE_URL || null;
  if (dbUrl) {
    dbUrl = dbUrl.replace(/^psql\s*['"]*/, "").replace(/['"]*$/, "");
    dbUrl = dbUrl.trim();
  }
  return dbUrl;
}
var MemStorage = class {
  users;
  households;
  energyReadings;
  energyTrades;
  tradeAcceptances;
  chatMessages;
  currentUserId;
  currentHouseholdId;
  currentEnergyReadingId;
  currentEnergyTradeId;
  currentTradeAcceptanceId;
  currentChatMessageId;
  sessionStore;
  constructor() {
    this.users = /* @__PURE__ */ new Map();
    this.households = /* @__PURE__ */ new Map();
    this.energyReadings = /* @__PURE__ */ new Map();
    this.energyTrades = /* @__PURE__ */ new Map();
    this.tradeAcceptances = /* @__PURE__ */ new Map();
    this.chatMessages = /* @__PURE__ */ new Map();
    this.currentUserId = 1;
    this.currentHouseholdId = 1;
    this.currentEnergyReadingId = 1;
    this.currentEnergyTradeId = 1;
    this.currentTradeAcceptanceId = 1;
    this.currentChatMessageId = 1;
    const MemoryStore = createMemoryStore(session);
    this.sessionStore = new MemoryStore({
      checkPeriod: 864e5
      // 24 hours
    });
  }
  addInitialChatMessages() {
  }
  async getUser(id) {
    return this.users.get(id);
  }
  async getUserByUsername(username) {
    return Array.from(this.users.values()).find(
      (user) => user.username === username
    );
  }
  async getUserByEmail(email) {
    return Array.from(this.users.values()).find(
      (user) => user.email === email
    );
  }
  async createUser(insertUser) {
    const id = this.currentUserId++;
    const user = {
      ...insertUser,
      id,
      createdAt: /* @__PURE__ */ new Date(),
      phone: insertUser.phone || null,
      state: insertUser.state || null,
      district: insertUser.district || null
    };
    this.users.set(id, user);
    return user;
  }
  async createHousehold(insertHousehold) {
    const id = this.currentHouseholdId++;
    const household = {
      ...insertHousehold,
      id,
      isOnline: true,
      currentBatteryLevel: insertHousehold.currentBatteryLevel || 50,
      coordinates: insertHousehold.coordinates || null,
      createdAt: /* @__PURE__ */ new Date()
    };
    this.households.set(id, household);
    return household;
  }
  async getHouseholdsByUser(userId) {
    return Array.from(this.households.values()).filter(
      (household) => household.userId === userId
    );
  }
  async getHousehold(id) {
    return this.households.get(id);
  }
  async getHouseholdsWithUsers() {
    const householdsWithUsers = [];
    for (const household of Array.from(this.households.values())) {
      const user = this.users.get(household.userId);
      if (user) {
        householdsWithUsers.push({
          ...household,
          user: {
            phone: user.phone,
            state: user.state,
            district: user.district
          }
        });
      }
    }
    return householdsWithUsers;
  }
  async updateHousehold(id, updates) {
    const household = this.households.get(id);
    if (!household) return void 0;
    const updated = { ...household, ...updates };
    this.households.set(id, updated);
    return updated;
  }
  async listHouseholds() {
    return Array.from(this.households.values());
  }
  async createEnergyReading(insertReading) {
    const id = this.currentEnergyReadingId++;
    const reading = {
      ...insertReading,
      id,
      timestamp: /* @__PURE__ */ new Date(),
      weatherCondition: insertReading.weatherCondition || null,
      temperature: insertReading.temperature || null
    };
    this.energyReadings.set(id, reading);
    return reading;
  }
  async getEnergyReadingsByHousehold(householdId, limit = 50) {
    const readings = Array.from(this.energyReadings.values()).filter((reading) => reading.householdId === householdId).sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    return readings.slice(0, limit);
  }
  async createEnergyTrade(insertTrade) {
    const id = this.currentEnergyTradeId++;
    const trade = {
      ...insertTrade,
      id,
      status: "pending",
      sellerHouseholdId: insertTrade.sellerHouseholdId || null,
      buyerHouseholdId: insertTrade.buyerHouseholdId || null,
      createdAt: /* @__PURE__ */ new Date(),
      completedAt: null
    };
    this.energyTrades.set(id, trade);
    return trade;
  }
  async getEnergyTrades(limit = 50) {
    const trades = Array.from(this.energyTrades.values()).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()).slice(0, limit);
    return trades.map((trade) => {
      const sellerHousehold = trade.sellerHouseholdId ? this.households.get(trade.sellerHouseholdId) : null;
      const buyerHousehold = trade.buyerHouseholdId ? this.households.get(trade.buyerHouseholdId) : null;
      return {
        ...trade,
        sellerHouseholdName: sellerHousehold?.name || null,
        buyerHouseholdName: buyerHousehold?.name || null
      };
    });
  }
  async getEnergyTradesByHousehold(householdId, limit = 50) {
    const trades = Array.from(this.energyTrades.values()).filter((trade) => trade.sellerHouseholdId === householdId || trade.buyerHouseholdId === householdId).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    return trades.slice(0, limit);
  }
  async getEnergyTradesByUser(userId, limit = 50) {
    const userHouseholds = Array.from(this.households.values()).filter((h) => h.userId === userId);
    const householdIds = userHouseholds.map((h) => h.id);
    const trades = Array.from(this.energyTrades.values()).filter(
      (trade) => householdIds.includes(trade.sellerHouseholdId || -1) || householdIds.includes(trade.buyerHouseholdId || -1)
    ).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    return trades.slice(0, limit);
  }
  async getEnergyTradeById(id) {
    return this.energyTrades.get(id);
  }
  async updateEnergyTrade(id, updates) {
    const trade = this.energyTrades.get(id);
    if (!trade) return void 0;
    const updatedTrade = { ...trade, ...updates };
    this.energyTrades.set(id, updatedTrade);
    return updatedTrade;
  }
  async deleteEnergyTrade(id) {
    return this.energyTrades.delete(id);
  }
  async updateEnergyTradeStatus(id, status) {
    const trade = this.energyTrades.get(id);
    if (!trade) return void 0;
    const updated = {
      ...trade,
      status,
      completedAt: status === "completed" ? /* @__PURE__ */ new Date() : trade.completedAt
    };
    this.energyTrades.set(id, updated);
    return updated;
  }
  async createChatMessage(insertMessage) {
    const id = this.currentChatMessageId++;
    const message = {
      ...insertMessage,
      id,
      createdAt: /* @__PURE__ */ new Date(),
      userId: insertMessage.userId ?? null,
      sessionId: insertMessage.sessionId ?? null,
      category: insertMessage.category ?? null,
      type: insertMessage.type || "user"
    };
    this.chatMessages.set(id, message);
    return message;
  }
  async getChatMessages(limit = 50) {
    const messages = Array.from(this.chatMessages.values()).sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    return messages.slice(-limit);
  }
  async getChatMessagesByUser(userId, limit = 50) {
    const userMessages = Array.from(this.chatMessages.values()).filter((msg) => msg.userId === userId).sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    return userMessages.slice(-limit);
  }
  async getChatMessagesBySession(sessionId, limit = 50) {
    const sessionMessages = Array.from(this.chatMessages.values()).filter((msg) => msg.sessionId === sessionId).sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    return sessionMessages.slice(-limit);
  }
  async clearSessionData(sessionId) {
    for (const [id, message] of Array.from(this.chatMessages.entries())) {
      if (message.sessionId === sessionId) {
        this.chatMessages.delete(id);
      }
    }
  }
  async getEnergyReadings(limit = 50) {
    const readings = Array.from(this.energyReadings.values()).sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    return readings.slice(0, limit);
  }
  async getRealtimeMarketData(latitude, longitude) {
    const supply = 100 + Math.random() * 50;
    const demand = 90 + Math.random() * 60;
    const gridStability = Math.max(0, Math.min(100, 85 + Math.random() * 20));
    return {
      supply: Math.round(supply),
      demand: Math.round(demand),
      gridStability: Math.round(gridStability),
      weather: {
        condition: "sunny",
        temperature: 25,
        efficiency: 85
      }
    };
  }
  async getNetworkAnalytics() {
    const totalHouseholds = this.households.size;
    const activeHouseholds = totalHouseholds;
    const totalTrades = this.energyTrades.size;
    return {
      network: {
        totalHouseholds,
        activeHouseholds,
        totalGenerationCapacity: `${totalHouseholds * 5}kW`,
        totalStorageCapacity: `${totalHouseholds * 10}kWh`,
        storageUtilization: "65%"
      },
      trading: {
        totalTrades,
        averagePrice: "4.50",
        carbonSaved: `${totalTrades * 2.5}kg`
      },
      efficiency: {
        networkEfficiency: "92%",
        averageDistance: "2.3km"
      }
    };
  }
  async getChatResponse(message, userId) {
    return {
      response: "I'm a demo assistant. Please configure the AI service for full functionality.",
      confidence: 0.5
    };
  }
  // Helper method to get current storage status
  getStorageStatus() {
    return {
      type: "memory",
      available: true
    };
  }
  // Session management for MemStorage
  async createSession(sessionId, userId) {
  }
  async getSessionUser(sessionId) {
    return null;
  }
  async deleteSession(sessionId) {
  }
  // Trade acceptance methods
  async createTradeAcceptance(acceptance) {
    const id = this.currentTradeAcceptanceId++;
    const tradeAcceptance = {
      ...acceptance,
      id,
      acceptedAt: /* @__PURE__ */ new Date(),
      completedAt: null,
      contactShared: false,
      status: acceptance.status || "accepted"
    };
    this.tradeAcceptances.set(id, tradeAcceptance);
    return tradeAcceptance;
  }
  async getTradeAcceptancesByTrade(tradeId) {
    return Array.from(this.tradeAcceptances.values()).filter(
      (acceptance) => acceptance.tradeId === tradeId
    );
  }
  async getTradeAcceptancesByUser(userId) {
    return Array.from(this.tradeAcceptances.values()).filter(
      (acceptance) => acceptance.acceptorUserId === userId
    );
  }
  async updateTradeAcceptanceStatus(id, status) {
    const acceptance = this.tradeAcceptances.get(id);
    if (acceptance) {
      const updatedAcceptance = { ...acceptance, status };
      this.tradeAcceptances.set(id, updatedAcceptance);
      return updatedAcceptance;
    }
    return void 0;
  }
  async getAvailableOffersForUser(userId) {
    const userHouseholds = Array.from(this.households.values()).filter((h) => h.userId === userId);
    const householdIds = userHouseholds.map((h) => h.id);
    const availableOffers = Array.from(this.energyTrades.values()).filter(
      (trade) => trade.status === "pending" && trade.sellerHouseholdId && !householdIds.includes(trade.sellerHouseholdId) && (!trade.buyerHouseholdId || !householdIds.includes(trade.buyerHouseholdId))
    ).map((trade) => {
      const household = trade.sellerHouseholdId ? this.households.get(trade.sellerHouseholdId) : null;
      const user = household ? this.users.get(household.userId) : null;
      return {
        trade,
        household,
        user: user ? {
          username: user.username,
          email: user.email,
          phone: user.phone,
          state: user.state,
          district: user.district
        } : null
      };
    }).filter((offer) => offer.user !== null);
    return availableOffers;
  }
  async getApplicationsToMyTrades(userId) {
    const userHouseholds = Array.from(this.households.values()).filter((h) => h.userId === userId);
    const householdIds = userHouseholds.map((h) => h.id);
    if (householdIds.length === 0) {
      return [];
    }
    const applications = [];
    for (const acceptance of Array.from(this.tradeAcceptances.values())) {
      const trade = this.energyTrades.get(acceptance.tradeId);
      if (!trade) continue;
      const isMyTrade = trade.tradeType === "sell" && trade.sellerHouseholdId && householdIds.includes(trade.sellerHouseholdId) || trade.tradeType === "buy" && trade.buyerHouseholdId && householdIds.includes(trade.buyerHouseholdId);
      if (isMyTrade) {
        const applicant = this.users.get(acceptance.acceptorUserId);
        const applicantHousehold = Array.from(this.households.values()).find((h) => h.userId === applicant?.id);
        applications.push({
          acceptance,
          trade,
          applicant: applicant ? {
            id: applicant.id,
            username: applicant.username,
            email: applicant.email,
            phone: applicant.phone,
            state: applicant.state,
            district: applicant.district
          } : null,
          applicantHousehold: applicantHousehold ? {
            id: applicantHousehold.id,
            name: applicantHousehold.name
          } : null
        });
      }
    }
    return applications.sort((a, b) => new Date(b.acceptance.acceptedAt).getTime() - new Date(a.acceptance.acceptedAt).getTime());
  }
  async shareContactInfo(acceptanceId) {
    const acceptance = this.tradeAcceptances.get(acceptanceId);
    if (!acceptance) {
      throw new Error("Trade acceptance not found");
    }
    const trade = this.energyTrades.get(acceptance.tradeId);
    const acceptorUser = this.users.get(acceptance.acceptorUserId);
    await this.updateTradeAcceptanceStatus(acceptanceId, "contacted");
    return {
      acceptance,
      trade,
      contactInfo: acceptorUser ? {
        id: acceptorUser.id,
        username: acceptorUser.username,
        email: acceptorUser.email,
        phone: acceptorUser.phone
      } : null
    };
  }
};
var DatabaseStorage = class {
  sessionStore;
  constructor() {
    this.initializeSessionStore();
  }
  async initializeSessionStore() {
    try {
      const { pool: pool2 } = await Promise.resolve().then(() => (init_db(), db_exports));
      if (pool2) {
        const PostgresSessionStore = connectPg(session);
        this.sessionStore = new PostgresSessionStore({
          pool: pool2,
          createTableIfMissing: true,
          tableName: "session"
        });
        console.log("PostgreSQL session store initialized");
      } else {
        const MemoryStore = await import("memorystore").then((m) => m.default);
        this.sessionStore = new (MemoryStore(session))({
          checkPeriod: 864e5
          // 24 hours
        });
        console.log("Memory session store initialized (fallback)");
      }
    } catch (error) {
      console.warn("Session store initialization failed, using memory fallback:", error);
      const MemoryStore = await import("memorystore").then((m) => m.default);
      this.sessionStore = new (MemoryStore(session))({
        checkPeriod: 864e5
        // 24 hours
      });
    }
  }
  async getPool() {
    const { pool: pool2 } = await Promise.resolve().then(() => (init_db(), db_exports));
    return pool2;
  }
  async getDb() {
    const { db: db2 } = await Promise.resolve().then(() => (init_db(), db_exports));
    if (!db2) {
      throw new Error("Database connection not available");
    }
    return db2;
  }
  async getUser(id) {
    const db2 = await this.getDb();
    const [user] = await db2.select().from(users).where(eq(users.id, id));
    return user || void 0;
  }
  async getUserByUsername(username) {
    const db2 = await this.getDb();
    const [user] = await db2.select().from(users).where(eq(users.username, username));
    return user || void 0;
  }
  async getUserByEmail(email) {
    const db2 = await this.getDb();
    const [user] = await db2.select().from(users).where(eq(users.email, email));
    return user || void 0;
  }
  async createUser(insertUser) {
    const db2 = await this.getDb();
    const [user] = await db2.insert(users).values(insertUser).returning();
    return user;
  }
  async createHousehold(insertHousehold) {
    const db2 = await this.getDb();
    const [household] = await db2.insert(households).values(insertHousehold).returning();
    return household;
  }
  async getHouseholdsByUser(userId) {
    try {
      const db2 = await this.getDb();
      return await db2.select().from(households).where(eq(households.userId, userId)).orderBy(desc(households.createdAt));
    } catch (error) {
      console.error("Database getHouseholdsByUser error:", error);
      throw error;
    }
  }
  async getHousehold(id) {
    const db2 = await this.getDb();
    const [household] = await db2.select().from(households).where(eq(households.id, id));
    return household || void 0;
  }
  async updateHousehold(id, updates) {
    const db2 = await this.getDb();
    const [household] = await db2.update(households).set(updates).where(eq(households.id, id)).returning();
    return household || void 0;
  }
  async getHouseholdsWithUsers() {
    const db2 = await this.getDb();
    const result = await db2.select({
      id: households.id,
      userId: households.userId,
      name: households.name,
      address: households.address,
      solarCapacity: households.solarCapacity,
      batteryCapacity: households.batteryCapacity,
      currentBatteryLevel: households.currentBatteryLevel,
      coordinates: households.coordinates,
      createdAt: households.createdAt,
      userPhone: users.phone,
      userState: users.state,
      userDistrict: users.district
    }).from(households).innerJoin(users, eq(households.userId, users.id)).orderBy(desc(households.createdAt));
    return result.map((row) => ({
      id: row.id,
      userId: row.userId,
      name: row.name,
      address: row.address,
      solarCapacity: row.solarCapacity,
      batteryCapacity: row.batteryCapacity,
      currentBatteryLevel: row.currentBatteryLevel,
      coordinates: row.coordinates,
      createdAt: row.createdAt,
      user: {
        phone: row.userPhone,
        state: row.userState,
        district: row.userDistrict
      }
    }));
  }
  async listHouseholds() {
    const db2 = await this.getDb();
    return await db2.select().from(households).orderBy(desc(households.createdAt));
  }
  async createEnergyReading(insertReading) {
    const db2 = await this.getDb();
    const [reading] = await db2.insert(energyReadings).values(insertReading).returning();
    return reading;
  }
  async getEnergyReadingsByHousehold(householdId, limit = 50) {
    const db2 = await this.getDb();
    return await db2.select().from(energyReadings).where(eq(energyReadings.householdId, householdId)).orderBy(desc(energyReadings.timestamp)).limit(limit);
  }
  async createEnergyTrade(insertTrade) {
    const db2 = await this.getDb();
    const [trade] = await db2.insert(energyTrades).values(insertTrade).returning();
    return trade;
  }
  async getEnergyTrades(limit = 50) {
    const db2 = await this.getDb();
    const tradesQuery = await db2.select({
      // Energy trade fields - map database column names to frontend expected names
      id: energyTrades.id,
      sellerHouseholdId: energyTrades.sellerHouseholdId,
      buyerHouseholdId: energyTrades.buyerHouseholdId,
      energyAmount: energyTrades.energyAmount,
      // This maps to energy_amount_kwh in DB
      pricePerKwh: energyTrades.pricePerKwh,
      // This maps to price_per_kwh_cents in DB  
      status: energyTrades.status,
      tradeType: energyTrades.tradeType,
      createdAt: energyTrades.createdAt,
      // Household names
      sellerHouseholdName: sql`seller_household.name`,
      buyerHouseholdName: sql`buyer_household.name`
    }).from(energyTrades).leftJoin(
      sql`${households} as seller_household`,
      sql`seller_household.id = ${energyTrades.sellerHouseholdId}`
    ).leftJoin(
      sql`${households} as buyer_household`,
      sql`buyer_household.id = ${energyTrades.buyerHouseholdId}`
    ).orderBy(desc(energyTrades.createdAt)).limit(limit);
    const tradeIds = tradesQuery.map((trade) => trade.id);
    const acceptanceCounts = tradeIds.length > 0 ? await db2.select({
      tradeId: tradeAcceptances.tradeId,
      count: sql`count(*)`
    }).from(tradeAcceptances).where(inArray(tradeAcceptances.tradeId, tradeIds)).groupBy(tradeAcceptances.tradeId) : [];
    const countMap = acceptanceCounts.reduce((map, item) => {
      map[item.tradeId] = item.count;
      return map;
    }, {});
    return tradesQuery.map((trade) => ({
      ...trade,
      acceptanceCount: countMap[trade.id] || 0
    }));
  }
  async getEnergyTradesByHousehold(householdId, limit = 50) {
    const db2 = await this.getDb();
    return await db2.select().from(energyTrades).where(
      // Include trades where household is either seller OR buyer
      sql`(${energyTrades.sellerHouseholdId} = ${householdId} OR ${energyTrades.buyerHouseholdId} = ${householdId})`
    ).orderBy(desc(energyTrades.createdAt)).limit(limit);
  }
  async getEnergyTradesByUser(userId, limit = 50) {
    const db2 = await this.getDb();
    const userHouseholds = await db2.select({ id: households.id }).from(households).where(eq(households.userId, userId));
    const householdIds = userHouseholds.map((h) => h.id);
    if (householdIds.length === 0) {
      return [];
    }
    return await db2.select().from(energyTrades).where(
      sql`(${energyTrades.sellerHouseholdId} IN (${householdIds.join(",")}) OR ${energyTrades.buyerHouseholdId} IN (${householdIds.join(",")}))`
    ).orderBy(desc(energyTrades.createdAt)).limit(limit);
  }
  async getEnergyTradeById(id) {
    const db2 = await this.getDb();
    const [trade] = await db2.select().from(energyTrades).where(eq(energyTrades.id, id));
    return trade || void 0;
  }
  async updateEnergyTrade(id, updates) {
    const db2 = await this.getDb();
    const [trade] = await db2.update(energyTrades).set(updates).where(eq(energyTrades.id, id)).returning();
    return trade || void 0;
  }
  async deleteEnergyTrade(id) {
    const db2 = await this.getDb();
    const result = await db2.delete(energyTrades).where(eq(energyTrades.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }
  async updateEnergyTradeStatus(id, status) {
    const db2 = await this.getDb();
    const [trade] = await db2.update(energyTrades).set({ status }).where(eq(energyTrades.id, id)).returning();
    return trade || void 0;
  }
  async createChatMessage(insertMessage) {
    const db2 = await this.getDb();
    try {
      const [message] = await db2.insert(chatMessages).values(insertMessage).returning();
      console.log("Database insert successful, message ID:", message.id);
      return message;
    } catch (error) {
      console.error("Database insert failed:", error);
      throw error;
    }
  }
  async getChatMessages(limit = 50) {
    const db2 = await this.getDb();
    return await db2.select().from(chatMessages).where(eq(chatMessages.userId, 0)).orderBy(desc(chatMessages.createdAt)).limit(limit);
  }
  async getChatMessagesByUser(userId, limit = 50) {
    const db2 = await this.getDb();
    return await db2.select().from(chatMessages).where(eq(chatMessages.userId, userId)).orderBy(desc(chatMessages.createdAt)).limit(limit);
  }
  async getChatMessagesBySession(sessionId, limit = 50) {
    const db2 = await this.getDb();
    return await db2.select().from(chatMessages).where(eq(chatMessages.sessionId, sessionId)).orderBy(desc(chatMessages.createdAt)).limit(limit);
  }
  async clearSessionData(sessionId) {
    const db2 = await this.getDb();
    await db2.delete(chatMessages).where(eq(chatMessages.sessionId, sessionId));
  }
  async getEnergyReadings(limit = 50) {
    const db2 = await this.getDb();
    return await db2.select().from(energyReadings).orderBy(desc(energyReadings.timestamp)).limit(limit);
  }
  // Add cache for AI insights to prevent excessive API usage
  static aiInsightCache = /* @__PURE__ */ new Map();
  static AI_CACHE_DURATION = 5 * 60 * 1e3;
  // 5 minutes cache
  async getRealtimeMarketData(latitude, longitude) {
    const db2 = await this.getDb();
    try {
      console.log(`\u{1F30D} Fetching real-time weather for location: ${latitude}, ${longitude}`);
      const realWeatherData = await weatherService.getCurrentWeather({ latitude, longitude });
      console.log(`\u{1F324}\uFE0F Real weather for market data:`, realWeatherData);
      const recentTrades = await db2.select().from(energyTrades).orderBy(desc(energyTrades.createdAt)).limit(10);
      const recentReadings = await db2.select().from(energyReadings).orderBy(desc(energyReadings.timestamp)).limit(5);
      const baseGenerationCapacity = 150;
      const weatherMultipliers = {
        "sunny": 1,
        "partly-cloudy": 0.75,
        "cloudy": 0.45,
        "overcast": 0.25,
        "rainy": 0.15,
        "stormy": 0.08
      };
      const cloudCoverImpact = Math.max(0.1, 1 - realWeatherData.cloudCover / 100 * 0.6);
      const tempImpact = realWeatherData.temperature > 25 ? Math.max(0.7, 1 - (realWeatherData.temperature - 25) * 0.01) : 1;
      const dayNightImpact = realWeatherData.isDay ? 1 : 0.02;
      const weatherMultiplier = (weatherMultipliers[realWeatherData.condition] || 0.6) * cloudCoverImpact * tempImpact * dayNightImpact;
      const realtimeSupply = Math.round(baseGenerationCapacity * weatherMultiplier);
      const timeOfDay = (/* @__PURE__ */ new Date()).getHours();
      const peakHours = timeOfDay >= 17 && timeOfDay <= 21 || timeOfDay >= 8 && timeOfDay <= 10;
      const weatherDemandMultiplier = realWeatherData.temperature > 30 ? 1.3 : realWeatherData.temperature < 15 ? 1.2 : 1;
      const baseDemand = peakHours ? 140 : 100;
      const realtimeDemand = Math.round(baseDemand * weatherDemandMultiplier);
      const supplyDemandRatio = realtimeSupply / realtimeDemand;
      const gridStability = Math.max(10, Math.min(100, 50 + (supplyDemandRatio - 1) * 100));
      const solarEfficiency = Math.round(weatherMultiplier * 100);
      let aiEnhancedData = {};
      const cacheKey = `${Math.round(latitude * 100)}_${Math.round(longitude * 100)}_${realWeatherData.condition}`;
      const cachedInsight = this.constructor.aiInsightCache.get(cacheKey);
      if (cachedInsight && Date.now() - cachedInsight.timestamp < this.constructor.AI_CACHE_DURATION) {
        aiEnhancedData = cachedInsight.data;
        console.log(`\u{1F916} Using cached AI insight to save API costs`);
      } else {
        try {
          if (process.env.GOOGLE_API_KEY) {
            const { GoogleGenerativeAI: GoogleGenerativeAI2 } = await import("@google/generative-ai");
            const genAI2 = new GoogleGenerativeAI2(process.env.GOOGLE_API_KEY);
            const marketPrompt = `As an energy market analyst, analyze this real-time data:
            Location: ${latitude}, ${longitude}
            Weather: ${realWeatherData.condition}, ${realWeatherData.temperature}\xB0C, ${realWeatherData.cloudCover}% cloud cover
            Current Supply: ${realtimeSupply} kW
            Current Demand: ${realtimeDemand} kW
            
            Provide a brief market insight (max 50 words) focusing on:
            1. Short-term price trend prediction
            2. Grid stability factors
            3. Optimal trading time recommendations
            
            Return JSON: {"insight": "text", "trend": "up/down/stable", "optimal_time": "morning/afternoon/evening"}`;
            const model = genAI2.getGenerativeModel({ model: "gemini-2.0-flash" });
            const result = await model.generateContent(marketPrompt);
            const response = await result.response;
            const text2 = response.text();
            if (text2) {
              aiEnhancedData = JSON.parse(text2.replace(/```json\n?|```\n?/g, "").trim());
              this.constructor.aiInsightCache.set(cacheKey, {
                data: aiEnhancedData,
                timestamp: Date.now()
              });
              console.log(`\u{1F916} Gemini AI market insight (fresh):`, aiEnhancedData);
            }
          }
        } catch (error) {
          console.log(`\u{1F916} Gemini AI enhancement skipped:`, error?.message || String(error));
          aiEnhancedData = {
            insight: `${realtimeSupply < realtimeDemand ? "High demand may increase prices" : "Stable supply-demand balance"}. Weather: ${realWeatherData.condition}.`,
            trend: realtimeSupply < realtimeDemand ? "up" : "stable",
            optimal_time: "afternoon"
          };
        }
      }
      console.log(`\u26A1 Real-time market calculation:`);
      console.log(`   Supply: ${realtimeSupply} kW (${realWeatherData.condition}, ${weatherMultiplier.toFixed(2)}x)`);
      console.log(`   Demand: ${realtimeDemand} kW (temp: ${realWeatherData.temperature}\xB0C)`);
      console.log(`   Grid Stability: ${Math.round(gridStability)}%`);
      console.log(`   Solar Efficiency: ${solarEfficiency}%`);
      return {
        supply: realtimeSupply,
        demand: realtimeDemand,
        gridStability: Math.round(gridStability),
        weather: {
          condition: realWeatherData.condition,
          temperature: realWeatherData.temperature,
          efficiency: solarEfficiency,
          isDay: realWeatherData.isDay,
          cloudCover: realWeatherData.cloudCover,
          windSpeed: realWeatherData.windSpeed
        },
        aiInsight: aiEnhancedData
        // Include Gemini AI predictions for improved market analysis
      };
    } catch (error) {
      console.error("Failed to get real-time weather, using fallback:", error);
      const recentReadings = await db2.select().from(energyReadings).orderBy(desc(energyReadings.timestamp)).limit(5);
      const totalSupply = recentReadings.reduce((sum, reading) => sum + reading.solarGeneration, 0);
      const totalDemand = recentReadings.reduce((sum, reading) => sum + reading.energyConsumption, 0);
      const latestReading = recentReadings[0];
      const weather = latestReading ? {
        condition: latestReading.weatherCondition || "sunny",
        temperature: latestReading.temperature || 25,
        efficiency: latestReading.weatherCondition === "sunny" ? 90 : latestReading.weatherCondition === "cloudy" ? 70 : 50
      } : {
        condition: "sunny",
        temperature: 25,
        efficiency: 85
      };
      const gridStability = Math.max(0, Math.min(100, 100 - Math.abs(totalSupply - totalDemand) / 10));
      return {
        supply: totalSupply || 120,
        demand: totalDemand || 100,
        gridStability: Math.round(gridStability) || 95,
        weather
      };
    }
  }
  async getNetworkAnalytics() {
    const db2 = await this.getDb();
    const householdCount = await db2.select({ count: count() }).from(households);
    const totalHouseholds = householdCount[0]?.count || 0;
    const tradeCount = await db2.select({ count: count() }).from(energyTrades);
    const totalTrades = tradeCount[0]?.count || 0;
    const allHouseholds = await db2.select().from(households);
    const totalGeneration = allHouseholds.reduce((sum, h) => sum + h.solarCapacity, 0);
    const totalStorage = allHouseholds.reduce((sum, h) => sum + h.batteryCapacity, 0);
    const recentTrades = await db2.select().from(energyTrades).where(eq(energyTrades.status, "completed")).orderBy(desc(energyTrades.createdAt)).limit(10);
    const avgPrice = recentTrades.length > 0 ? recentTrades.reduce((sum, trade) => sum + trade.pricePerKwh, 0) / recentTrades.length / 100 : 4.5;
    const onlineHouseholdCount = await db2.select({ count: count() }).from(households).where(eq(households.isOnline, true));
    const activeHouseholds = onlineHouseholdCount[0]?.count || 0;
    return {
      network: {
        totalHouseholds,
        activeHouseholds,
        totalGenerationCapacity: `${Math.round(totalGeneration / 1e3)}kW`,
        totalStorageCapacity: `${totalStorage}kWh`,
        storageUtilization: "65%"
      },
      trading: {
        totalTrades,
        averagePrice: avgPrice.toFixed(2),
        carbonSaved: `${(totalTrades * 2.5).toFixed(1)}kg`
      },
      efficiency: {
        networkEfficiency: "92%",
        averageDistance: "2.3km"
      }
    };
  }
  async getChatResponse(message, userId) {
    return {
      response: "Thank you for your message. How can I help you with your energy optimization today?",
      confidence: 0.8
    };
  }
  // Helper method to get current storage status
  getStorageStatus() {
    return {
      type: "database",
      available: true
    };
  }
  // Session management for DatabaseStorage
  async createSession(sessionId, userId) {
    const db2 = await this.getDb();
    const expiresAt = /* @__PURE__ */ new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);
    await db2.insert(userSessions).values({
      sessionId,
      userId,
      expiresAt
    });
  }
  async getSessionUser(sessionId) {
    const db2 = await this.getDb();
    const now = /* @__PURE__ */ new Date();
    const [session2] = await db2.select({ userId: userSessions.userId }).from(userSessions).where(and(
      eq(userSessions.sessionId, sessionId),
      // Check if session hasn't expired (use sql for comparison)
      sql`expires_at > NOW()`
    ));
    if (!session2) return null;
    const user = await this.getUser(session2.userId);
    return user || null;
  }
  async deleteSession(sessionId) {
    const db2 = await this.getDb();
    await db2.delete(userSessions).where(eq(userSessions.sessionId, sessionId));
  }
  // Trade acceptance methods
  async createTradeAcceptance(acceptance) {
    const db2 = await this.getDb();
    const [result] = await db2.insert(tradeAcceptances).values(acceptance).returning();
    return result;
  }
  async getTradeAcceptancesByTrade(tradeId) {
    const db2 = await this.getDb();
    return await db2.select().from(tradeAcceptances).where(eq(tradeAcceptances.tradeId, tradeId));
  }
  async getTradeAcceptancesByUser(userId) {
    const db2 = await this.getDb();
    return await db2.select().from(tradeAcceptances).where(eq(tradeAcceptances.acceptorUserId, userId));
  }
  async updateTradeAcceptanceStatus(id, status) {
    const db2 = await this.getDb();
    const [result] = await db2.update(tradeAcceptances).set({ status }).where(eq(tradeAcceptances.id, id)).returning();
    return result || void 0;
  }
  async getAvailableOffersForUser(userId) {
    const db2 = await this.getDb();
    const userHouseholds = await db2.select({ id: households.id }).from(households).where(eq(households.userId, userId));
    const householdIds = userHouseholds.map((h) => h.id);
    const availableOffers = await db2.select({
      trade: energyTrades,
      household: households,
      user: {
        username: users.username,
        email: users.email,
        phone: users.phone,
        state: users.state,
        district: users.district
      }
    }).from(energyTrades).leftJoin(households, eq(energyTrades.sellerHouseholdId, households.id)).leftJoin(users, eq(households.userId, users.id)).where(
      and(
        eq(energyTrades.status, "pending"),
        // Exclude user's own trades
        householdIds.length > 0 ? and(
          ne(energyTrades.sellerHouseholdId, householdIds[0]),
          ne(energyTrades.buyerHouseholdId, householdIds[0])
        ) : sql`1=1`
      )
    ).orderBy(desc(energyTrades.createdAt));
    return availableOffers;
  }
  // Get applications TO user's trades (people who want to accept their trades)
  async getApplicationsToMyTrades(userId) {
    const db2 = await this.getDb();
    const userHouseholds = await db2.select({ id: households.id }).from(households).where(eq(households.userId, userId));
    const householdIds = userHouseholds.map((h) => h.id);
    if (householdIds.length === 0) {
      return [];
    }
    const applications = await db2.select({
      acceptance: tradeAcceptances,
      trade: energyTrades,
      applicant: {
        id: users.id,
        username: users.username,
        email: users.email,
        phone: users.phone,
        state: users.state,
        district: users.district
      },
      applicantHousehold: {
        id: households.id,
        name: households.name
      }
    }).from(tradeAcceptances).innerJoin(energyTrades, eq(tradeAcceptances.tradeId, energyTrades.id)).innerJoin(users, eq(tradeAcceptances.acceptorUserId, users.id)).leftJoin(households, eq(users.id, households.userId)).where(
      or(
        and(
          eq(energyTrades.tradeType, "sell"),
          inArray(energyTrades.sellerHouseholdId, householdIds)
        ),
        and(
          eq(energyTrades.tradeType, "buy"),
          inArray(energyTrades.buyerHouseholdId, householdIds)
        )
      )
    ).orderBy(desc(tradeAcceptances.acceptedAt));
    return applications;
  }
  async shareContactInfo(acceptanceId) {
    const db2 = await this.getDb();
    const acceptance = await db2.select({
      acceptance: tradeAcceptances,
      trade: energyTrades,
      acceptorUser: {
        id: users.id,
        username: users.username,
        email: users.email,
        phone: users.phone
      }
    }).from(tradeAcceptances).leftJoin(energyTrades, eq(tradeAcceptances.tradeId, energyTrades.id)).leftJoin(users, eq(tradeAcceptances.acceptorUserId, users.id)).where(eq(tradeAcceptances.id, acceptanceId)).limit(1);
    if (acceptance.length === 0) {
      throw new Error("Trade acceptance not found");
    }
    await this.updateTradeAcceptanceStatus(acceptanceId, "contacted");
    return {
      acceptance: acceptance[0].acceptance,
      trade: acceptance[0].trade,
      contactInfo: acceptance[0].acceptorUser
    };
  }
};
var HybridStorage = class {
  memoryStorage;
  databaseStorage;
  isDatabaseAvailable = false;
  connectionCheckPromise;
  sessionStore;
  constructor() {
    this.memoryStorage = new MemStorage();
    this.databaseStorage = new DatabaseStorage();
    this.sessionStore = this.memoryStorage.sessionStore;
    this.connectionCheckPromise = this.checkDatabaseConnection();
  }
  // Wait for database connection check to complete
  async waitForConnectionCheck() {
    await this.connectionCheckPromise;
  }
  async checkDatabaseConnection() {
    if (!this.databaseStorage) return;
    try {
      await new Promise((resolve) => setTimeout(resolve, 2e3));
      const connectionTest = Promise.race([
        this.databaseStorage.getUser(1),
        new Promise((_, reject) => setTimeout(() => reject(new Error("Connection timeout")), 5e3))
      ]);
      await connectionTest;
      this.isDatabaseAvailable = true;
      console.log("\u2713 Database connection verified - using PostgreSQL storage");
      this.sessionStore = this.databaseStorage.sessionStore;
    } catch (error) {
      console.warn("Database connection failed, using memory storage:", error instanceof Error ? error.message : "Unknown error");
      this.isDatabaseAvailable = false;
      this.databaseStorage = null;
    }
  }
  async getUser(id) {
    if (this.isDatabaseAvailable && this.databaseStorage) {
      try {
        return await this.databaseStorage.getUser(id);
      } catch (error) {
        console.warn("Database getUser failed, falling back to memory:", error);
        this.isDatabaseAvailable = false;
      }
    }
    return await this.memoryStorage.getUser(id);
  }
  async getUserByUsername(username) {
    if (this.isDatabaseAvailable && this.databaseStorage) {
      try {
        return await this.databaseStorage.getUserByUsername(username);
      } catch (error) {
        console.warn("Database getUserByUsername failed, falling back to memory:", error);
        this.isDatabaseAvailable = false;
      }
    }
    return await this.memoryStorage.getUserByUsername(username);
  }
  async getUserByEmail(email) {
    if (this.isDatabaseAvailable && this.databaseStorage) {
      try {
        return await this.databaseStorage.getUserByEmail(email);
      } catch (error) {
        console.warn("Database getUserByEmail failed, falling back to memory:", error);
        this.isDatabaseAvailable = false;
      }
    }
    return await this.memoryStorage.getUserByEmail(email);
  }
  async createUser(user) {
    if (this.isDatabaseAvailable && this.databaseStorage) {
      try {
        return await this.databaseStorage.createUser(user);
      } catch (error) {
        console.warn("Database createUser failed, falling back to memory:", error);
        this.isDatabaseAvailable = false;
      }
    }
    return await this.memoryStorage.createUser(user);
  }
  async createHousehold(household) {
    if (this.isDatabaseAvailable && this.databaseStorage) {
      try {
        return await this.databaseStorage.createHousehold(household);
      } catch (error) {
        console.warn("Database createHousehold failed, falling back to memory:", error);
        this.isDatabaseAvailable = false;
      }
    }
    return await this.memoryStorage.createHousehold(household);
  }
  async getHouseholdsByUser(userId) {
    if (this.isDatabaseAvailable && this.databaseStorage) {
      try {
        return await this.databaseStorage.getHouseholdsByUser(userId);
      } catch (error) {
        console.warn("Database getHouseholdsByUser failed, falling back to memory:", error);
        this.isDatabaseAvailable = false;
      }
    }
    return await this.memoryStorage.getHouseholdsByUser(userId);
  }
  async getHousehold(id) {
    if (this.isDatabaseAvailable && this.databaseStorage) {
      try {
        return await this.databaseStorage.getHousehold(id);
      } catch (error) {
        console.warn("Database getHousehold failed, falling back to memory:", error);
        this.isDatabaseAvailable = false;
      }
    }
    return await this.memoryStorage.getHousehold(id);
  }
  async updateHousehold(id, updates) {
    if (this.isDatabaseAvailable && this.databaseStorage) {
      try {
        return await this.databaseStorage.updateHousehold(id, updates);
      } catch (error) {
        console.warn("Database updateHousehold failed, falling back to memory:", error);
        this.isDatabaseAvailable = false;
      }
    }
    return await this.memoryStorage.updateHousehold(id, updates);
  }
  async getHouseholdsWithUsers() {
    if (this.isDatabaseAvailable && this.databaseStorage) {
      try {
        return await this.databaseStorage.getHouseholdsWithUsers();
      } catch (error) {
        console.warn("Database getHouseholdsWithUsers failed, falling back to memory:", error);
        this.isDatabaseAvailable = false;
      }
    }
    return await this.memoryStorage.getHouseholdsWithUsers();
  }
  async listHouseholds() {
    if (this.isDatabaseAvailable && this.databaseStorage) {
      try {
        return await this.databaseStorage.listHouseholds();
      } catch (error) {
        console.warn("Database listHouseholds failed, falling back to memory:", error);
        this.isDatabaseAvailable = false;
      }
    }
    return await this.memoryStorage.listHouseholds();
  }
  async createEnergyReading(reading) {
    if (this.isDatabaseAvailable && this.databaseStorage) {
      try {
        return await this.databaseStorage.createEnergyReading(reading);
      } catch (error) {
        console.warn("Database createEnergyReading failed, falling back to memory:", error);
        this.isDatabaseAvailable = false;
      }
    }
    return await this.memoryStorage.createEnergyReading(reading);
  }
  async getEnergyReadingsByHousehold(householdId, limit) {
    if (this.isDatabaseAvailable && this.databaseStorage) {
      try {
        return await this.databaseStorage.getEnergyReadingsByHousehold(householdId, limit);
      } catch (error) {
        console.warn("Database getEnergyReadingsByHousehold failed, falling back to memory:", error);
        this.isDatabaseAvailable = false;
      }
    }
    return await this.memoryStorage.getEnergyReadingsByHousehold(householdId, limit);
  }
  async createEnergyTrade(trade) {
    if (this.isDatabaseAvailable && this.databaseStorage) {
      try {
        return await this.databaseStorage.createEnergyTrade(trade);
      } catch (error) {
        console.warn("Database createEnergyTrade failed, falling back to memory:", error);
        this.isDatabaseAvailable = false;
      }
    }
    return await this.memoryStorage.createEnergyTrade(trade);
  }
  async getEnergyTrades(limit) {
    if (this.isDatabaseAvailable && this.databaseStorage) {
      try {
        return await this.databaseStorage.getEnergyTrades(limit);
      } catch (error) {
        console.warn("Database getEnergyTrades failed, falling back to memory:", error);
        this.isDatabaseAvailable = false;
      }
    }
    return await this.memoryStorage.getEnergyTrades(limit);
  }
  async getEnergyTradesByHousehold(householdId, limit) {
    if (this.isDatabaseAvailable && this.databaseStorage) {
      try {
        return await this.databaseStorage.getEnergyTradesByHousehold(householdId, limit);
      } catch (error) {
        console.warn("Database getEnergyTradesByHousehold failed, falling back to memory:", error);
        this.isDatabaseAvailable = false;
      }
    }
    return await this.memoryStorage.getEnergyTradesByHousehold(householdId, limit);
  }
  async getEnergyTradesByUser(userId, limit) {
    if (this.isDatabaseAvailable && this.databaseStorage) {
      try {
        return await this.databaseStorage.getEnergyTradesByUser(userId, limit);
      } catch (error) {
        console.warn("Database getEnergyTradesByUser failed, falling back to memory:", error);
        this.isDatabaseAvailable = false;
      }
    }
    return await this.memoryStorage.getEnergyTradesByUser(userId, limit);
  }
  async getEnergyTradeById(id) {
    if (this.isDatabaseAvailable && this.databaseStorage) {
      try {
        return await this.databaseStorage.getEnergyTradeById(id);
      } catch (error) {
        console.warn("Database getEnergyTradeById failed, falling back to memory:", error);
        this.isDatabaseAvailable = false;
      }
    }
    return await this.memoryStorage.getEnergyTradeById(id);
  }
  async updateEnergyTrade(id, updates) {
    if (this.isDatabaseAvailable && this.databaseStorage) {
      try {
        return await this.databaseStorage.updateEnergyTrade(id, updates);
      } catch (error) {
        console.warn("Database updateEnergyTrade failed, falling back to memory:", error);
        this.isDatabaseAvailable = false;
      }
    }
    return await this.memoryStorage.updateEnergyTrade(id, updates);
  }
  async deleteEnergyTrade(id) {
    if (this.isDatabaseAvailable && this.databaseStorage) {
      try {
        return await this.databaseStorage.deleteEnergyTrade(id);
      } catch (error) {
        console.warn("Database deleteEnergyTrade failed, falling back to memory:", error);
        this.isDatabaseAvailable = false;
      }
    }
    return await this.memoryStorage.deleteEnergyTrade(id);
  }
  async updateEnergyTradeStatus(id, status) {
    if (this.isDatabaseAvailable && this.databaseStorage) {
      try {
        return await this.databaseStorage.updateEnergyTradeStatus(id, status);
      } catch (error) {
        console.warn("Database updateEnergyTradeStatus failed, falling back to memory:", error);
        this.isDatabaseAvailable = false;
      }
    }
    return await this.memoryStorage.updateEnergyTradeStatus(id, status);
  }
  async createChatMessage(message) {
    if (this.isDatabaseAvailable && this.databaseStorage) {
      try {
        return await this.databaseStorage.createChatMessage(message);
      } catch (error) {
        console.warn("Database createChatMessage failed, falling back to memory:", error);
        this.isDatabaseAvailable = false;
      }
    }
    return await this.memoryStorage.createChatMessage(message);
  }
  async getChatMessages(limit = 50) {
    if (this.isDatabaseAvailable && this.databaseStorage) {
      try {
        return await this.databaseStorage.getChatMessages(limit);
      } catch (error) {
        console.warn("Database getChatMessages failed, falling back to memory:", error);
        this.isDatabaseAvailable = false;
      }
    }
    return await this.memoryStorage.getChatMessages(limit);
  }
  async getChatMessagesByUser(userId, limit = 50) {
    if (this.isDatabaseAvailable && this.databaseStorage) {
      try {
        return await this.databaseStorage.getChatMessagesByUser(userId, limit);
      } catch (error) {
        console.warn("Database getChatMessagesByUser failed, falling back to memory:", error);
        this.isDatabaseAvailable = false;
      }
    }
    return await this.memoryStorage.getChatMessagesByUser(userId, limit);
  }
  async getChatMessagesBySession(sessionId, limit = 50) {
    if (this.isDatabaseAvailable && this.databaseStorage) {
      try {
        return await this.databaseStorage.getChatMessagesBySession(sessionId, limit);
      } catch (error) {
        console.warn("Database getChatMessagesBySession failed, falling back to memory:", error);
        this.isDatabaseAvailable = false;
      }
    }
    return await this.memoryStorage.getChatMessagesBySession(sessionId, limit);
  }
  async clearSessionData(sessionId) {
    if (this.isDatabaseAvailable && this.databaseStorage) {
      try {
        await this.databaseStorage.clearSessionData(sessionId);
        return;
      } catch (error) {
        console.warn("Database clearSessionData failed, falling back to memory:", error);
        this.isDatabaseAvailable = false;
      }
    }
    await this.memoryStorage.clearSessionData(sessionId);
  }
  async getEnergyReadings(limit) {
    if (this.isDatabaseAvailable && this.databaseStorage) {
      try {
        return await this.databaseStorage.getEnergyReadings(limit);
      } catch (error) {
        console.warn("Database getEnergyReadings failed, falling back to memory:", error);
        this.isDatabaseAvailable = false;
      }
    }
    return await this.memoryStorage.getEnergyReadings(limit);
  }
  async getRealtimeMarketData(latitude, longitude) {
    if (this.isDatabaseAvailable && this.databaseStorage) {
      try {
        return await this.databaseStorage.getRealtimeMarketData(latitude, longitude);
      } catch (error) {
        console.warn("Database getRealtimeMarketData failed, falling back to memory:", error);
        this.isDatabaseAvailable = false;
      }
    }
    return await this.memoryStorage.getRealtimeMarketData(latitude, longitude);
  }
  async getNetworkAnalytics() {
    if (this.isDatabaseAvailable && this.databaseStorage) {
      try {
        return await this.databaseStorage.getNetworkAnalytics();
      } catch (error) {
        console.warn("Database getNetworkAnalytics failed, falling back to memory:", error);
        this.isDatabaseAvailable = false;
      }
    }
    return await this.memoryStorage.getNetworkAnalytics();
  }
  async getChatResponse(message, userId) {
    if (this.isDatabaseAvailable && this.databaseStorage) {
      try {
        return await this.databaseStorage.getChatResponse(message, userId);
      } catch (error) {
        console.warn("Database getChatResponse failed, falling back to memory:", error);
        this.isDatabaseAvailable = false;
      }
    }
    return await this.memoryStorage.getChatResponse(message, userId);
  }
  // Helper method to get current storage status
  getStorageStatus() {
    return {
      type: this.isDatabaseAvailable ? "database" : "memory",
      available: true
    };
  }
  // Session management for HybridStorage
  async createSession(sessionId, userId) {
    if (this.isDatabaseAvailable && this.databaseStorage) {
      try {
        await this.databaseStorage.createSession(sessionId, userId);
        return;
      } catch (error) {
        console.warn("Database createSession failed, falling back to memory:", error);
        this.isDatabaseAvailable = false;
      }
    }
    await this.memoryStorage.createSession(sessionId, userId);
  }
  async getSessionUser(sessionId) {
    if (this.isDatabaseAvailable && this.databaseStorage) {
      try {
        return await this.databaseStorage.getSessionUser(sessionId);
      } catch (error) {
        console.warn("Database getSessionUser failed, falling back to memory:", error);
        this.isDatabaseAvailable = false;
      }
    }
    return await this.memoryStorage.getSessionUser(sessionId);
  }
  async deleteSession(sessionId) {
    if (this.isDatabaseAvailable && this.databaseStorage) {
      try {
        await this.databaseStorage.deleteSession(sessionId);
        return;
      } catch (error) {
        console.warn("Database deleteSession failed, falling back to memory:", error);
        this.isDatabaseAvailable = false;
      }
    }
    await this.memoryStorage.deleteSession(sessionId);
  }
  // Trade acceptance methods
  async createTradeAcceptance(acceptance) {
    if (this.isDatabaseAvailable && this.databaseStorage) {
      try {
        return await this.databaseStorage.createTradeAcceptance(acceptance);
      } catch (error) {
        console.warn("Database createTradeAcceptance failed, falling back to memory:", error);
        this.isDatabaseAvailable = false;
      }
    }
    return await this.memoryStorage.createTradeAcceptance(acceptance);
  }
  async getTradeAcceptancesByTrade(tradeId) {
    if (this.isDatabaseAvailable && this.databaseStorage) {
      try {
        return await this.databaseStorage.getTradeAcceptancesByTrade(tradeId);
      } catch (error) {
        console.warn("Database getTradeAcceptancesByTrade failed, falling back to memory:", error);
        this.isDatabaseAvailable = false;
      }
    }
    return await this.memoryStorage.getTradeAcceptancesByTrade(tradeId);
  }
  async getTradeAcceptancesByUser(userId) {
    if (this.isDatabaseAvailable && this.databaseStorage) {
      try {
        return await this.databaseStorage.getTradeAcceptancesByUser(userId);
      } catch (error) {
        console.warn("Database getTradeAcceptancesByUser failed, falling back to memory:", error);
        this.isDatabaseAvailable = false;
      }
    }
    return await this.memoryStorage.getTradeAcceptancesByUser(userId);
  }
  async updateTradeAcceptanceStatus(id, status) {
    if (this.isDatabaseAvailable && this.databaseStorage) {
      try {
        return await this.databaseStorage.updateTradeAcceptanceStatus(id, status);
      } catch (error) {
        console.warn("Database updateTradeAcceptanceStatus failed, falling back to memory:", error);
        this.isDatabaseAvailable = false;
      }
    }
    return await this.memoryStorage.updateTradeAcceptanceStatus(id, status);
  }
  async getAvailableOffersForUser(userId) {
    if (this.isDatabaseAvailable && this.databaseStorage) {
      try {
        return await this.databaseStorage.getAvailableOffersForUser(userId);
      } catch (error) {
        console.warn("Database getAvailableOffersForUser failed, falling back to memory:", error);
        this.isDatabaseAvailable = false;
      }
    }
    return await this.memoryStorage.getAvailableOffersForUser(userId);
  }
  async shareContactInfo(acceptanceId) {
    if (this.isDatabaseAvailable && this.databaseStorage) {
      try {
        return await this.databaseStorage.shareContactInfo(acceptanceId);
      } catch (error) {
        console.warn("Database shareContactInfo failed, falling back to memory:", error);
        this.isDatabaseAvailable = false;
      }
    }
    return await this.memoryStorage.shareContactInfo(acceptanceId);
  }
  async getApplicationsToMyTrades(userId) {
    if (this.isDatabaseAvailable && this.databaseStorage) {
      try {
        return await this.databaseStorage.getApplicationsToMyTrades(userId);
      } catch (error) {
        console.warn("Database getApplicationsToMyTrades failed, falling back to memory:", error);
        this.isDatabaseAvailable = false;
      }
    }
    return await this.memoryStorage.getApplicationsToMyTrades(userId);
  }
};
var storage = (() => {
  const databaseUrl = getDatabaseUrl2();
  if (databaseUrl) {
    console.log("\u2713 DATABASE_URL found - using hybrid storage with PostgreSQL fallback");
    return new HybridStorage();
  }
  console.log("Using memory storage for development");
  return new MemStorage();
})();

// server/routes.ts
init_schema();

// server/gemini-chat.ts
import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";
dotenv.config();
console.log("Initializing Gemini AI for energy optimization chat...");
console.log("API Key present:", !!process.env.GOOGLE_API_KEY);
var genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
async function generateEnergyOptimizationResponse(userMessage, userContext) {
  try {
    console.log("Generating AI response for energy optimization query");
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    const contextInfo = userContext ? `
USER CONTEXT:
- Name: ${userContext.username}
- Location: ${userContext.location || "Not specified"}
- Households: ${userContext.households?.length || 0} registered
- Current Energy Data: ${userContext.energyData ? "Available" : "Not available"}
` : "";
    const systemPrompt = `You are a helpful SolarSense energy advisor. 

${contextInfo}

RESPONSE RULES:
- Write 2-3 sentences maximum (never exceed 10 sentences)
- Be helpful and practical
- Use simple, clear language
- Focus on actionable advice

USER QUESTION: ${userMessage}

ANSWER:`;
    const result = await model.generateContent(systemPrompt);
    const response = await result.response;
    const text2 = response.text();
    console.log("AI response generated successfully");
    return text2;
  } catch (error) {
    console.error("Gemini AI error:", error);
    if (userMessage.toLowerCase().includes("solar")) {
      return "Keep your solar panels clean and free of debris. Check for shading from trees or buildings that might reduce efficiency. Monitor peak sun hours between 10 AM and 2 PM for best performance.";
    } else if (userMessage.toLowerCase().includes("battery")) {
      return "Avoid deep discharge cycles to extend battery life. Keep batteries between 20-80% charge when possible. Monitor temperature as batteries work best in moderate conditions.";
    } else {
      return "I'm having trouble connecting to the AI service right now. Please try again in a moment. Feel free to ask about solar panels, batteries, or energy trading.";
    }
  }
}

// server/ml-engine.ts
var MLEnergyEngine = class {
  weatherPatterns = /* @__PURE__ */ new Map();
  demandPatterns = /* @__PURE__ */ new Map();
  priceModel = new PriceOptimizer();
  // Predict energy generation based on weather and historical data
  predictEnergyGeneration(household, weather, timeOfDay) {
    const baseGeneration = household.solarCapacity || 0;
    const weatherMultiplier = this.getWeatherMultiplier(weather);
    const timeMultiplier = this.getTimeMultiplier(timeOfDay);
    const seasonalMultiplier = this.getSeasonalMultiplier();
    return baseGeneration * weatherMultiplier * timeMultiplier * seasonalMultiplier;
  }
  // Predict energy demand using ML patterns with realistic consumption data
  predictEnergyDemand(household, timeOfDay, dayOfWeek) {
    const baseDemand = this.getBaseDemand(household);
    const timePattern = this.getRealisticTimePattern(timeOfDay);
    const dayPattern = this.getRealisticDayPattern(dayOfWeek);
    const householdPattern = this.getRealisticHouseholdPattern(household);
    const seasonalPattern = this.getSeasonalDemandPattern();
    const randomVariance = 0.8 + Math.random() * 0.4;
    return baseDemand * timePattern * dayPattern * householdPattern * seasonalPattern * randomVariance;
  }
  // Calculate base demand based on household type and characteristics
  getBaseDemand(household) {
    const name = household.name.toLowerCase();
    if (name.includes("commercial") || name.includes("center") || name.includes("innovation")) {
      return 3.5;
    } else if (name.includes("apartments") || name.includes("complex")) {
      return 2;
    } else if (name.includes("smart home") || name.includes("tech")) {
      return 1.8;
    } else {
      return 1.25;
    }
  }
  // Optimize energy distribution across the network
  optimizeEnergyDistribution(households2, currentWeather) {
    const networkState = this.analyzeNetworkState(households2, currentWeather);
    const tradingPairs = this.identifyTradingPairs(networkState);
    const prices = this.calculateOptimalPrices(tradingPairs, networkState);
    const batteryStrategy = this.optimizeBatteryStrategy(networkState);
    const gridBalancing = this.calculateGridBalancing(networkState);
    const loadManagement = this.optimizeLoadManagement(networkState);
    return {
      tradingPairs,
      prices,
      batteryStrategy,
      gridStability: this.calculateGridStability(networkState),
      recommendations: this.generateRecommendations(networkState),
      gridBalancing,
      loadManagement,
      equitableAccess: this.ensureEquitableAccess(networkState)
    };
  }
  // Simulate outage response and recovery
  simulateOutageResponse(affectedHouseholds, totalHouseholds) {
    const survivingCapacity = this.calculateSurvivingCapacity(affectedHouseholds, totalHouseholds);
    const emergencyRouting = this.calculateEmergencyRouting(affectedHouseholds, survivingCapacity);
    const recoveryPlan = this.generateRecoveryPlan(affectedHouseholds, totalHouseholds);
    return {
      survivingCapacity,
      emergencyRouting,
      estimatedRecoveryTime: recoveryPlan.estimatedTime,
      priorityAllocation: recoveryPlan.priorityHouseholds,
      communityResilience: this.calculateResilienceScore(totalHouseholds, affectedHouseholds.length)
    };
  }
  // Realistic weather adaptation algorithms based on solar irradiance data
  getWeatherMultiplier(weather) {
    const baseMultipliers = {
      "sunny": 1,
      // Clear sky irradiance ~1000 W/m²
      "partly-cloudy": 0.82,
      // ~820 W/m² typical
      "cloudy": 0.45,
      // ~450 W/m² heavy clouds
      "overcast": 0.25,
      // ~250 W/m² thick overcast
      "rainy": 0.15,
      // ~150 W/m² during rain
      "stormy": 0.08
      // ~80 W/m² storm conditions
    };
    const cloudCoverImpact = Math.max(0.1, 1 - weather.cloudCover / 100 * 0.7);
    const temperatureImpact = this.getTemperatureImpact(weather.temperature);
    return (baseMultipliers[weather.condition] || 0.6) * cloudCoverImpact * temperatureImpact;
  }
  // Solar panels lose efficiency in extreme heat
  getTemperatureImpact(temperature) {
    if (temperature <= 25) return 1;
    const tempLoss = (temperature - 25) * 4e-3;
    return Math.max(0.7, 1 - tempLoss);
  }
  // Calculate grid balancing to prevent overload during peak demand
  calculateGridBalancing(networkState) {
    const totalGeneration = networkState.households.reduce((sum, h) => sum + h.predictedGeneration, 0);
    const totalDemand = networkState.households.reduce((sum, h) => sum + h.predictedDemand, 0);
    const totalBatteryCapacity = networkState.households.reduce((sum, h) => sum + (h.batteryCapacity || 0), 0);
    const totalStoredEnergy = networkState.households.reduce((sum, h) => sum + (h.currentBatteryLevel || 0) * (h.batteryCapacity || 0) / 100, 0);
    const supplyDemandRatio = totalDemand > 0 ? totalGeneration / totalDemand : 1;
    const gridLoadFactor = Math.min(1, totalDemand / (totalGeneration + totalStoredEnergy));
    const loadSheddingCandidates = [];
    const gridSupportProviders = [];
    networkState.households.forEach((h) => {
      const surplus = h.predictedGeneration - h.predictedDemand;
      if (surplus < -2) {
        loadSheddingCandidates.push(h.id);
      } else if (surplus > 2) {
        gridSupportProviders.push(h.id);
      }
    });
    return {
      supplyDemandRatio,
      gridLoadFactor,
      loadSheddingRequired: gridLoadFactor > 0.9,
      loadSheddingCandidates,
      gridSupportProviders,
      recommendedLoadReduction: gridLoadFactor > 0.9 ? (gridLoadFactor - 0.85) * totalDemand : 0
    };
  }
  // Optimize load management to prevent grid overload
  optimizeLoadManagement(networkState) {
    const currentHour = (/* @__PURE__ */ new Date()).getHours();
    const isPeakHour = currentHour >= 17 && currentHour <= 21;
    const priorityLoads = {};
    const defferrableLoads = {};
    const loadShiftingOpportunities = {};
    networkState.households.forEach((h) => {
      const deficit = h.predictedDemand - h.predictedGeneration - (h.currentBatteryLevel || 0) * (h.batteryCapacity || 0) / 100;
      if (deficit > 1) {
        priorityLoads[h.id] = ["refrigeration", "medical_equipment", "lighting"];
        defferrableLoads[h.id] = ["water_heating", "air_conditioning", "electric_vehicle"];
        loadShiftingOpportunities[h.id] = {
          shiftableLoad: Math.min(deficit * 0.3, 2),
          // Max 2kW shift
          optimalShiftTime: isPeakHour ? currentHour + 4 : currentHour + 1,
          potentialSavings: deficit * 0.15
          // 15% load reduction through shifting
        };
      }
    });
    return {
      priorityLoads,
      defferrableLoads,
      loadShiftingOpportunities,
      peakDemandReduction: Object.values(loadShiftingOpportunities).reduce((sum, strategy) => sum + strategy.potentialSavings, 0)
    };
  }
  // Ensure equitable access to power across all households
  ensureEquitableAccess(networkState) {
    const householdEnergySecurity = networkState.households.map((h) => {
      const totalAvailable = h.predictedGeneration + (h.currentBatteryLevel || 0) * (h.batteryCapacity || 0) / 100;
      const securityRatio = h.predictedDemand > 0 ? totalAvailable / h.predictedDemand : 1;
      return {
        householdId: h.id,
        energySecurity: Math.min(1, securityRatio),
        isVulnerable: securityRatio < 0.7,
        // Less than 70% energy security
        priorityLevel: this.calculatePriorityLevel(h, securityRatio)
      };
    });
    const vulnerableHouseholds = householdEnergySecurity.filter((h) => h.isVulnerable);
    const averageEnergySecurity = householdEnergySecurity.reduce((sum, h) => sum + h.energySecurity, 0) / householdEnergySecurity.length;
    const redistributionPlan = this.calculateRedistributionPlan(networkState, vulnerableHouseholds);
    return {
      averageEnergySecurity,
      vulnerableHouseholds: vulnerableHouseholds.map((h) => h.householdId),
      redistributionPlan,
      equityScore: 1 - vulnerableHouseholds.length / householdEnergySecurity.length,
      emergencySupport: vulnerableHouseholds.length > networkState.households.length * 0.2
    };
  }
  calculatePriorityLevel(household, securityRatio) {
    if (securityRatio < 0.3) return "critical";
    if (securityRatio < 0.5) return "high";
    if (securityRatio < 0.7) return "medium";
    return "low";
  }
  calculateRedistributionPlan(networkState, vulnerableHouseholds) {
    const surplusHouseholds = networkState.households.filter(
      (h) => h.predictedGeneration + (h.currentBatteryLevel || 0) * (h.batteryCapacity || 0) / 100 > h.predictedDemand * 1.2
    );
    const redistributionActions = [];
    vulnerableHouseholds.forEach((vulnerable) => {
      const needsKwh = networkState.households.find((h) => h.id === vulnerable.householdId)?.predictedDemand || 0;
      const availableKwh = networkState.households.find((h) => h.id === vulnerable.householdId);
      const shortfall = needsKwh - (availableKwh?.predictedGeneration || 0) - (availableKwh?.currentBatteryLevel || 0) * (availableKwh?.batteryCapacity || 0) / 100;
      if (shortfall > 0 && surplusHouseholds.length > 0) {
        const donor = surplusHouseholds[0];
        const transferAmount = Math.min(
          shortfall,
          donor.predictedGeneration + (donor.currentBatteryLevel || 0) * (donor.batteryCapacity || 0) / 100 - donor.predictedDemand
        );
        if (transferAmount > 0.1) {
          redistributionActions.push({
            fromHouseholdId: donor.id,
            toHouseholdId: vulnerable.householdId,
            energyAmount: transferAmount,
            transferType: transferAmount < 1 ? "immediate" : "scheduled",
            priority: vulnerable.priorityLevel || "medium"
          });
        }
      }
    });
    return {
      actions: redistributionActions,
      totalRedistributed: redistributionActions.reduce((sum, action) => sum + action.energyAmount, 0),
      beneficiaryCount: new Set(redistributionActions.map((a) => a.toHouseholdId)).size
    };
  }
  getTimeMultiplier(hour) {
    if (hour < 5 || hour > 20) return 0;
    const solarCurve = [
      0,
      0,
      0,
      0,
      0,
      // 0-4 AM
      0.02,
      0.15,
      0.35,
      // 5-7 AM: sunrise
      0.58,
      0.78,
      0.92,
      // 8-10 AM: morning climb
      0.98,
      1,
      0.98,
      // 11 AM-1 PM: peak hours
      0.92,
      0.78,
      0.58,
      // 2-4 PM: afternoon decline
      0.35,
      0.15,
      0.02,
      // 5-7 PM: evening
      0,
      0,
      0,
      0
      // 8-11 PM
    ];
    return solarCurve[hour] || 0;
  }
  getSeasonalMultiplier() {
    const month = (/* @__PURE__ */ new Date()).getMonth();
    const seasonalFactors = [0.6, 0.7, 0.8, 0.9, 1, 1, 1, 0.95, 0.85, 0.75, 0.65, 0.55];
    return seasonalFactors[month];
  }
  analyzeNetworkState(households2, weather) {
    const currentHour = (/* @__PURE__ */ new Date()).getHours();
    const dayOfWeek = (/* @__PURE__ */ new Date()).getDay();
    const householdsWithPredictions = households2.map((household) => {
      const predictedGeneration = this.predictEnergyGeneration(household, weather, currentHour);
      const predictedDemand = this.predictEnergyDemand(household, currentHour, dayOfWeek);
      const batteryLevel = (household.currentBatteryLevel || 0) * (household.batteryCapacity || 0) / 100;
      const batteryCapacity = household.batteryCapacity || 0;
      return {
        ...household,
        predictedGeneration,
        predictedDemand,
        netBalance: predictedGeneration - predictedDemand,
        batteryLevel,
        batteryCapacity,
        canSupport: predictedGeneration > predictedDemand * 1.1 || batteryLevel > 0.8 * batteryCapacity,
        needsSupport: predictedGeneration < predictedDemand * 0.9 || batteryLevel < 0.3 * batteryCapacity
      };
    });
    return {
      households: householdsWithPredictions,
      totalGeneration: householdsWithPredictions.reduce((sum, h) => sum + h.predictedGeneration, 0),
      totalDemand: householdsWithPredictions.reduce((sum, h) => sum + h.predictedDemand, 0),
      weather,
      timestamp: /* @__PURE__ */ new Date()
    };
  }
  identifyTradingPairs(networkState) {
    const suppliers = networkState.households.filter(
      (h) => h.predictedGeneration > h.predictedDemand * 0.8 || h.batteryLevel > h.batteryCapacity * 0.6
    );
    const demanders = networkState.households.filter(
      (h) => h.predictedGeneration < h.predictedDemand * 1.2 || h.batteryLevel < h.batteryCapacity * 0.4
    );
    const pairs = [];
    demanders.forEach((demander) => {
      const bestSupplier = suppliers.filter((s) => s.netBalance > 0).sort((a, b) => {
        const distanceA = this.calculateDistance(a.address || "", demander.address || "");
        const distanceB = this.calculateDistance(b.address || "", demander.address || "");
        return distanceA - distanceB;
      })[0];
      if (bestSupplier) {
        const energyAmount = Math.min(
          Math.abs(demander.netBalance),
          bestSupplier.netBalance,
          2
          // Max 2kWh per trade for stability
        );
        const priority = this.determinePriority(demander);
        pairs.push({
          supplierId: bestSupplier.id,
          demanderId: demander.id,
          energyAmount,
          distance: this.calculateDistance(bestSupplier.address || "", demander.address || ""),
          priority
        });
        bestSupplier.netBalance -= energyAmount;
        demander.netBalance += energyAmount;
      }
    });
    return pairs;
  }
  calculateOptimalPrices(pairs, networkState) {
    return this.priceModel.calculateOptimalPrices(pairs, networkState);
  }
  optimizeBatteryStrategy(networkState) {
    const strategies = {};
    networkState.households.forEach((household) => {
      const batteryLevel = (household.currentBatteryLevel || 0) * (household.batteryCapacity || 0) / 100;
      const batteryRatio = batteryLevel / Math.max(household.batteryCapacity, 1);
      if (household.netBalance > 0) {
        if (batteryRatio < 0.8) {
          strategies[household.id] = "charge";
        } else {
          strategies[household.id] = "sell";
        }
      } else {
        if (batteryRatio > 0.3) {
          strategies[household.id] = "discharge";
        } else {
          strategies[household.id] = "buy";
        }
      }
    });
    return { strategies };
  }
  calculateGridStability(networkState) {
    const totalBalance = networkState.totalGeneration - networkState.totalDemand;
    if (networkState.totalDemand === 0) {
      return networkState.totalGeneration > 0 ? 1 : 0.5;
    }
    const balanceRatio = Math.abs(totalBalance) / networkState.totalDemand;
    return Math.max(0, 1 - balanceRatio);
  }
  generateRecommendations(networkState) {
    const recommendations = [];
    const stabilityScore = this.calculateGridStability(networkState);
    if (stabilityScore < 0.7) {
      recommendations.push("Grid stability low - recommend immediate battery deployment");
    }
    if (networkState.totalGeneration < networkState.totalDemand * 0.8) {
      recommendations.push("Energy deficit detected - activate demand response programs");
    }
    const highDemandHouseholds = networkState.households.filter((h) => h.needsSupport).length;
    if (highDemandHouseholds > networkState.households.length * 0.4) {
      recommendations.push("High network demand - consider temporary load shedding");
    }
    return recommendations;
  }
  calculateDistance(loc1, loc2) {
    const hash1 = loc1.split("").reduce((a, b) => a + b.charCodeAt(0), 0);
    const hash2 = loc2.split("").reduce((a, b) => a + b.charCodeAt(0), 0);
    return Math.abs(hash1 - hash2) % 15 + 1;
  }
  calculateSurvivingCapacity(affected, total) {
    const surviving = total.filter((h) => !affected.includes(h.id));
    return surviving.reduce((sum, h) => sum + (h.solarCapacity || 0), 0);
  }
  calculateEmergencyRouting(affected, survivingCapacity) {
    return {
      criticalLoadsFirst: true,
      maxDistanceKm: 10,
      emergencyReserveRatio: 0.2,
      availableCapacity: survivingCapacity * 0.8
      // Reserve 20% for stability
    };
  }
  generateRecoveryPlan(affected, total) {
    const criticalHouseholds = total.filter(
      (h) => affected.includes(h.id) && (h.currentBatteryLevel || 0) < 20
    );
    return {
      estimatedTime: affected.length * 0.5,
      // 30 min per household
      priorityHouseholds: criticalHouseholds.map((h) => h.id),
      phaseApproach: "critical-first"
    };
  }
  calculateResilienceScore(allHouseholds, affectedCount) {
    const networkSize = allHouseholds.length;
    if (networkSize === 0) {
      return 0.5;
    }
    const distributedGeneration = allHouseholds.filter((h) => (h.solarCapacity || 0) > 0).length;
    const batteryBackup = allHouseholds.filter((h) => (h.batteryCapacity || 0) > 0).length;
    const diversityScore = distributedGeneration / networkSize * 0.4;
    const backupScore = batteryBackup / networkSize * 0.3;
    const impactScore = (1 - affectedCount / networkSize) * 0.3;
    return diversityScore + backupScore + impactScore;
  }
  // Realistic demand patterns based on actual residential usage data
  getRealisticTimePattern(hour) {
    const demandCurve = [
      0.45,
      0.42,
      0.4,
      0.38,
      0.4,
      // 12-4 AM: night minimum
      0.45,
      0.55,
      0.75,
      0.85,
      0.72,
      // 5-9 AM: morning rise
      0.65,
      0.68,
      0.7,
      0.72,
      0.75,
      // 10 AM-2 PM: daytime steady
      0.78,
      0.85,
      0.95,
      1,
      0.92,
      // 3-7 PM: evening peak
      0.8,
      0.7,
      0.58,
      0.52
      // 8-11 PM: night decline
    ];
    return demandCurve[hour] || 0.6;
  }
  getRealisticDayPattern(dayOfWeek) {
    const weekPattern = [
      0.95,
      // Sunday - moderate usage
      1,
      // Monday - peak work-from-home 
      1,
      // Tuesday 
      1,
      // Wednesday
      1,
      // Thursday
      0.98,
      // Friday - slightly lower
      0.92
      // Saturday - weekend pattern
    ];
    return weekPattern[dayOfWeek] || 1;
  }
  getRealisticHouseholdPattern(household) {
    let pattern = 1;
    const batteryLevel = household.currentBatteryLevel || 50;
    if (batteryLevel < 20) pattern *= 1.15;
    if (batteryLevel > 80) pattern *= 0.92;
    const solarCapacity = household.solarCapacity || 0;
    if (solarCapacity > 8e3) pattern *= 0.88;
    if (solarCapacity === 0) pattern *= 1.05;
    const batteryCapacity = household.batteryCapacity || 0;
    if (batteryCapacity > 13e3) pattern *= 0.85;
    return Math.max(0.7, Math.min(1.3, pattern));
  }
  getSeasonalDemandPattern() {
    const month = (/* @__PURE__ */ new Date()).getMonth();
    const seasonalDemand = [
      1.2,
      // Jan - winter heating
      1.15,
      // Feb
      1,
      // Mar - mild weather
      0.9,
      // Apr
      1,
      // May 
      1.3,
      // Jun - AC season starts
      1.4,
      // Jul - peak summer AC
      1.4,
      // Aug - peak summer AC
      1.2,
      // Sep - AC still high
      0.95,
      // Oct - mild weather
      1.05,
      // Nov - heating starts
      1.2
      // Dec - winter heating
    ];
    return seasonalDemand[month];
  }
  determinePriority(household) {
    const batteryLevel = household.currentBatteryLevel || 50;
    const netBalance = household.netBalance || 0;
    if (batteryLevel < 10 && netBalance < -2) return "emergency";
    if (batteryLevel < 20 || netBalance < -1.5) return "high";
    return "normal";
  }
};
var PriceOptimizer = class {
  calculateOptimalPrices(pairs, networkState) {
    const prices = /* @__PURE__ */ new Map();
    const hour = (/* @__PURE__ */ new Date()).getHours();
    const basePrice = this.getTimeOfUsePrice(hour);
    pairs.forEach((pair) => {
      let price = basePrice;
      const transmissionLoss = Math.min(0.5, pair.distance / 100 * 0.3);
      price += transmissionLoss;
      const congestionMultiplier = this.getGridCongestion(networkState);
      price *= congestionMultiplier;
      if (pair.priority === "high") {
        price *= 1.25;
      } else if (pair.priority === "emergency") {
        price *= 1.5;
      }
      const supplyDemandRatio = networkState.totalGeneration / Math.max(networkState.totalDemand, 0.1);
      const elasticity = this.calculateElasticity(supplyDemandRatio);
      price *= elasticity;
      const carbonDiscount = 0.2;
      price -= carbonDiscount;
      const finalPrice = Math.max(2.5, Math.min(12, price));
      prices.set(pair.supplierId, Math.round(finalPrice * 100) / 100);
    });
    return prices;
  }
  getTimeOfUsePrice(hour) {
    if (hour >= 18 && hour <= 22) return 7.5;
    if (hour >= 6 && hour <= 9) return 6.2;
    if (hour >= 10 && hour <= 17) return 4.8;
    return 3.2;
  }
  getGridCongestion(networkState) {
    const utilizationRatio = networkState.totalDemand / Math.max(networkState.totalGeneration, 0.1);
    if (utilizationRatio > 0.95) return 1.4;
    if (utilizationRatio > 0.85) return 1.2;
    if (utilizationRatio < 0.6) return 0.9;
    return 1;
  }
  calculateElasticity(supplyDemandRatio) {
    if (supplyDemandRatio < 0.8) return 1.5;
    if (supplyDemandRatio < 0.95) return 1.25;
    if (supplyDemandRatio > 1.2) return 0.75;
    if (supplyDemandRatio > 1.05) return 0.9;
    return 1;
  }
};

// server/simulation-engine.ts
var SimulationDataContext = class {
  households = [];
  energyReadings = [];
  energyTrades = [];
  nextHouseholdId = 1e3;
  // Start simulation IDs at 1000 to avoid conflicts
  nextReadingId = 1e4;
  nextTradeId = 1e4;
  // Initialize with demo households for simulation only
  initializeDemoHouseholds() {
    const currentHour = (/* @__PURE__ */ new Date()).getHours();
    const baseTime = Date.now();
    this.households = [
      {
        id: this.nextHouseholdId++,
        name: "Solar Pioneers (Demo)",
        address: "Simulation District A",
        solarCapacity: 5,
        // Realistic 5kW system
        batteryCapacity: 15,
        currentBatteryLevel: 15,
        // Low battery - needs energy
        isOnline: true,
        userId: 999,
        // Mark as simulation data with special user ID
        createdAt: new Date(baseTime - 24 * 60 * 60 * 1e3),
        // 1 day ago
        coordinates: null
      },
      {
        id: this.nextHouseholdId++,
        name: "Green Energy Hub (Demo)",
        address: "Simulation District B",
        solarCapacity: 8,
        // Larger 8kW system
        batteryCapacity: 20,
        currentBatteryLevel: 95,
        // High battery - can supply
        isOnline: true,
        userId: 999,
        createdAt: new Date(baseTime - 12 * 60 * 60 * 1e3),
        // 12 hours ago
        coordinates: null
      },
      {
        id: this.nextHouseholdId++,
        name: "Community Center (Demo)",
        address: "Simulation Commercial Zone",
        solarCapacity: 12,
        // Commercial 12kW system
        batteryCapacity: 40,
        currentBatteryLevel: 55,
        // Medium battery
        isOnline: true,
        userId: 999,
        createdAt: new Date(baseTime - 6 * 60 * 60 * 1e3),
        // 6 hours ago
        coordinates: null
      },
      {
        id: this.nextHouseholdId++,
        name: "Eco Apartments (Demo)",
        address: "Simulation District C",
        solarCapacity: 3,
        // Small 3kW system
        batteryCapacity: 10,
        currentBatteryLevel: 25,
        // Low battery - needs energy
        isOnline: true,
        userId: 999,
        createdAt: new Date(baseTime - 18 * 60 * 60 * 1e3),
        // 18 hours ago
        coordinates: null
      },
      {
        id: this.nextHouseholdId++,
        name: "Smart Home Alpha (Demo)",
        address: "Simulation District A",
        solarCapacity: 6,
        // Medium 6kW system
        batteryCapacity: 18,
        currentBatteryLevel: 80,
        // High battery - can supply
        isOnline: true,
        userId: 999,
        createdAt: new Date(baseTime - 3 * 60 * 60 * 1e3),
        // 3 hours ago
        coordinates: null
      },
      {
        id: this.nextHouseholdId++,
        name: "Tech Innovation Center (Demo)",
        address: "Simulation Tech District",
        solarCapacity: 10,
        // Large 10kW system
        batteryCapacity: 30,
        currentBatteryLevel: 40,
        // Medium-low battery
        isOnline: true,
        userId: 999,
        createdAt: new Date(baseTime - 30 * 60 * 1e3),
        // 30 minutes ago
        coordinates: null
      },
      {
        id: this.nextHouseholdId++,
        name: "Residential Complex Beta (Demo)",
        address: "Simulation District D",
        solarCapacity: 4,
        // Small-medium 4kW system
        batteryCapacity: 12,
        currentBatteryLevel: 10,
        // Very low battery - urgent need
        isOnline: true,
        userId: 999,
        createdAt: new Date(baseTime - 2 * 60 * 60 * 1e3),
        // 2 hours ago
        coordinates: null
      }
    ];
    this.households.forEach((h) => {
      const variation = Math.sin((h.id + currentHour) * Math.PI / 6) * 15;
      h.currentBatteryLevel = Math.max(5, Math.min(95, h.currentBatteryLevel + variation));
    });
  }
  getHouseholds() {
    return this.households;
  }
  updateHousehold(id, updates) {
    const household = this.households.find((h) => h.id === id);
    if (household) {
      Object.assign(household, updates);
    }
  }
  addEnergyReading(reading) {
    this.energyReadings.push({
      id: this.nextReadingId++,
      ...reading,
      timestamp: /* @__PURE__ */ new Date()
    });
    if (this.energyReadings.length > 1e3) {
      this.energyReadings = this.energyReadings.slice(-500);
    }
  }
  addEnergyTrade(trade) {
    this.energyTrades.push({
      id: this.nextTradeId++,
      ...trade,
      createdAt: /* @__PURE__ */ new Date(),
      status: "completed",
      completedAt: /* @__PURE__ */ new Date()
    });
    if (this.energyTrades.length > 500) {
      this.energyTrades = this.energyTrades.slice(-250);
    }
  }
  getRecentTrades(limit = 50) {
    return this.energyTrades.slice(-limit);
  }
  getRecentReadings(limit = 100) {
    return this.energyReadings.slice(-limit);
  }
  clearAll() {
    this.households = [];
    this.energyReadings = [];
    this.energyTrades = [];
  }
};
var SimulationEngine = class {
  mlEngine;
  storage;
  simulationData;
  simulationInterval = null;
  weatherSimulator;
  outageSimulator;
  isRunning = false;
  lastOptimizationResult = null;
  constructor(storage2) {
    this.storage = storage2;
    this.simulationData = new SimulationDataContext();
    this.mlEngine = new MLEnergyEngine();
    this.weatherSimulator = new WeatherSimulator();
    this.outageSimulator = new OutageSimulator();
  }
  // Start live simulation
  async startSimulation() {
    if (this.isRunning) return;
    this.isRunning = true;
    console.log("\u{1F680} Starting SolarSense live simulation...");
    this.simulationData.initializeDemoHouseholds();
    this.simulationInterval = setInterval(async () => {
      await this.runSimulationCycle();
    }, 1e4);
    console.log("\u2705 Live simulation started - updating every 10 seconds");
    console.log(`\u{1F4CA} Simulation running with ${this.simulationData.getHouseholds().length} demo households (isolated from real data)`);
  }
  // Stop simulation
  stopSimulation() {
    if (this.simulationInterval) {
      clearInterval(this.simulationInterval);
      this.simulationInterval = null;
    }
    this.isRunning = false;
    console.log("\u23F9\uFE0F Simulation stopped");
  }
  // Get simulation status
  getStatus() {
    return {
      isRunning: this.isRunning,
      currentWeather: this.weatherSimulator.getCurrentWeather(),
      activeOutages: this.outageSimulator.getActiveOutages(),
      networkStats: this.getNetworkStats()
    };
  }
  // Trigger weather change for demonstration
  async triggerWeatherChange(condition) {
    const newWeather = this.weatherSimulator.setWeather(condition);
    console.log(`\u{1F324}\uFE0F Simulation weather changed to: ${condition} (isolated from real-time dashboard)`);
    await this.runSimulationCycle();
    return newWeather;
  }
  // Trigger power outage simulation
  async triggerOutage(householdIds = []) {
    if (householdIds.length === 0) {
      const allHouseholds = this.simulationData.getHouseholds();
      const outageCount = Math.max(1, Math.floor(allHouseholds.length * 0.25));
      householdIds = this.selectRandomHouseholds(allHouseholds, outageCount);
    }
    const response = await this.outageSimulator.simulateOutage(householdIds, this.simulationData.getHouseholds());
    console.log(`\u26A1 Simulation outage: ${householdIds.length} demo households affected (isolated from real data)`);
    console.log(`\u{1F50B} Community resilience score: ${response.communityResilience.toFixed(2)}`);
    for (const householdId of householdIds) {
      this.simulationData.updateHousehold(householdId, {
        isOnline: false
      });
    }
    return response;
  }
  // Restore power after outage
  async restorePower(householdIds) {
    for (const householdId of householdIds) {
      this.simulationData.updateHousehold(householdId, {
        isOnline: true
      });
    }
    this.outageSimulator.clearOutage(householdIds);
    console.log(`\u{1F50C} Simulation power restored to ${householdIds.length} demo households`);
  }
  // Main simulation cycle
  async runSimulationCycle() {
    try {
      const households2 = this.simulationData.getHouseholds();
      const currentWeather = this.weatherSimulator.getCurrentWeather();
      const optimization = this.mlEngine.optimizeEnergyDistribution(households2, currentWeather);
      this.lastOptimizationResult = optimization;
      this.generateEnergyReadings(households2, currentWeather);
      this.executeTrades(optimization.tradingPairs, optimization.prices);
      this.updateBatteryLevels(households2, optimization.batteryStrategy);
      this.logSimulationMetrics(optimization, currentWeather);
    } catch (error) {
      console.error("\u274C Simulation cycle error:", error);
    }
  }
  generateEnergyReadings(households2, weather) {
    const currentTime = /* @__PURE__ */ new Date();
    const hour = currentTime.getHours();
    for (const household of households2) {
      if (!household.isOnline) continue;
      const generation = this.mlEngine.predictEnergyGeneration(household, weather, hour);
      const consumption = this.mlEngine.predictEnergyDemand(household, hour, currentTime.getDay());
      const timeVariance = Math.sin((hour + household.id) * Math.PI / 12) * 0.1;
      const generationVariance = generation * timeVariance;
      const consumptionVariance = consumption * timeVariance * 1.5;
      const reading = {
        householdId: household.id,
        solarGeneration: Math.max(0, Math.round((generation + generationVariance) * 100)),
        // Convert to Wh (realistic scale)
        energyConsumption: Math.max(0, Math.round((consumption + consumptionVariance) * 100)),
        // Convert to Wh (realistic scale)
        batteryLevel: household.currentBatteryLevel || 0,
        weatherCondition: weather.condition,
        temperature: Math.round(weather.temperature)
      };
      this.simulationData.addEnergyReading(reading);
    }
  }
  executeTrades(tradingPairs, prices) {
    console.log(`\u{1F504} Executing ${tradingPairs.length} energy trades in simulation`);
    for (const pair of tradingPairs) {
      const price = prices.get(pair.supplierId) || 0.12;
      const totalCost = pair.energyAmount * price;
      const trade = {
        sellerHouseholdId: pair.supplierId,
        buyerHouseholdId: pair.demanderId,
        energyAmount: Math.round(pair.energyAmount * 1e3),
        // Convert to Wh
        pricePerKwh: Math.round(price * 100),
        // Convert to cents
        tradeType: "surplus_sale",
        createdAt: /* @__PURE__ */ new Date(),
        completedAt: /* @__PURE__ */ new Date()
      };
      console.log(`\u{1F4B0} Trade: Household ${pair.supplierId} \u2192 ${pair.demanderId}: ${pair.energyAmount.toFixed(2)} kWh @ $${price.toFixed(3)}/kWh`);
      this.simulationData.addEnergyTrade(trade);
    }
    if (tradingPairs.length === 0) {
      console.log(`\u26A0\uFE0F No trading pairs identified - checking household energy balances...`);
    }
  }
  updateBatteryLevels(households2, batteryStrategy) {
    for (const household of households2) {
      const strategy = batteryStrategy.strategies[household.id];
      let newBatteryLevel = household.currentBatteryLevel || 0;
      const maxCapacity = household.batteryCapacity || 0;
      if (!household.isOnline || maxCapacity === 0) continue;
      switch (strategy) {
        case "charge":
          newBatteryLevel = Math.min(maxCapacity, newBatteryLevel + 2);
          break;
        case "discharge":
          newBatteryLevel = Math.max(0, newBatteryLevel - 1.5);
          break;
        case "sell":
        case "buy":
          break;
      }
      if (newBatteryLevel !== household.currentBatteryLevel) {
        this.simulationData.updateHousehold(household.id, {
          currentBatteryLevel: newBatteryLevel
        });
      }
    }
  }
  // Get simulation-specific data (not mixed with real operational data)
  getSimulationData() {
    return {
      households: this.simulationData.getHouseholds(),
      recentTrades: this.simulationData.getRecentTrades(20),
      recentReadings: this.simulationData.getRecentReadings(50),
      weather: this.weatherSimulator.getCurrentWeather()
    };
  }
  // Get the latest ML optimization result
  getOptimizationResult() {
    if (!this.lastOptimizationResult) {
      const households2 = this.simulationData.getHouseholds();
      const currentWeather = this.weatherSimulator.getCurrentWeather();
      if (households2.length > 0) {
        return this.mlEngine.optimizeEnergyDistribution(households2, currentWeather);
      } else {
        return {
          tradingPairs: [],
          prices: /* @__PURE__ */ new Map(),
          batteryStrategy: { strategies: {} },
          gridStability: 0.95,
          recommendations: ["No households available for optimization"],
          timestamp: /* @__PURE__ */ new Date()
        };
      }
    }
    return this.lastOptimizationResult;
  }
  selectRandomHouseholds(households2, count2) {
    const sorted = [...households2].sort((a, b) => (a.currentBatteryLevel || 0) - (b.currentBatteryLevel || 0));
    return sorted.slice(0, count2).map((h) => h.id);
  }
  getNetworkStats() {
    const households2 = this.simulationData.getHouseholds();
    const activeHouseholds = households2.filter((h) => h.isOnline);
    const currentWeather = this.weatherSimulator.getCurrentWeather();
    const hour = (/* @__PURE__ */ new Date()).getHours();
    let totalGeneration = 0;
    let totalConsumption = 0;
    let batteryStorageTotal = 0;
    for (const household of households2) {
      if (household.isOnline) {
        const generation = this.mlEngine.predictEnergyGeneration(household, currentWeather, hour);
        const consumption = this.mlEngine.predictEnergyDemand(household, hour, (/* @__PURE__ */ new Date()).getDay());
        totalGeneration += generation;
        totalConsumption += consumption;
        batteryStorageTotal += (household.currentBatteryLevel || 0) * (household.batteryCapacity || 0) / 100;
      }
    }
    const recentTrades = this.simulationData.getRecentTrades(10);
    const tradingVelocity = recentTrades.length > 0 ? recentTrades.reduce((sum, trade) => sum + trade.energyAmount, 0) / 1e3 : 0;
    const carbonReduction = recentTrades.reduce(
      (sum, trade) => sum + trade.energyAmount / 1e3 * 0.45,
      0
      // 0.45kg CO2 per kWh saved
    );
    return {
      totalHouseholds: households2.length,
      activeConnections: activeHouseholds.length,
      totalGeneration: Math.round(totalGeneration * 10) / 10,
      totalConsumption: Math.round(totalConsumption * 10) / 10,
      batteryStorageTotal: Math.round(batteryStorageTotal * 10) / 10,
      tradingVelocity: Math.round(tradingVelocity * 10) / 10,
      carbonReduction: Math.round(carbonReduction * 10) / 10
    };
  }
  logSimulationMetrics(optimization, weather) {
    console.log(`\u{1F4CA} Simulation Update - Weather: ${weather.condition}`);
    console.log(`\u26A1 Grid Stability: ${(optimization.gridStability * 100).toFixed(1)}%`);
    console.log(`\u{1F504} Active Trades: ${optimization.tradingPairs.length}`);
    console.log(`\u{1F4A1} Recommendations: ${optimization.recommendations.length}`);
    if (optimization.recommendations.length > 0) {
      console.log(`\u{1F3AF} Key Recommendation: ${optimization.recommendations[0]}`);
    }
  }
};
var WeatherSimulator = class {
  currentWeather;
  weatherCycle = [];
  cycleIndex = 0;
  constructor() {
    this.initializeWeatherCycle();
    this.currentWeather = this.weatherCycle[0];
  }
  getCurrentWeather() {
    return this.currentWeather;
  }
  setWeather(condition) {
    this.currentWeather = {
      condition,
      temperature: this.getTemperatureForCondition(condition),
      cloudCover: this.getCloudCoverForCondition(condition),
      windSpeed: this.getWindSpeedForCondition(condition)
    };
    return this.currentWeather;
  }
  initializeWeatherCycle() {
    this.weatherCycle = [
      { condition: "sunny", temperature: 28, cloudCover: 10, windSpeed: 8 },
      { condition: "partly-cloudy", temperature: 25, cloudCover: 40, windSpeed: 12 },
      { condition: "cloudy", temperature: 22, cloudCover: 80, windSpeed: 15 },
      { condition: "overcast", temperature: 20, cloudCover: 95, windSpeed: 18 },
      { condition: "rainy", temperature: 18, cloudCover: 100, windSpeed: 22 }
    ];
  }
  getTemperatureForCondition(condition) {
    const temps = {
      "sunny": 28,
      "partly-cloudy": 25,
      "cloudy": 22,
      "overcast": 20,
      "rainy": 18,
      "stormy": 16
    };
    const hour = (/* @__PURE__ */ new Date()).getHours();
    const dailyVariation = Math.sin((hour - 6) / 12 * Math.PI) * 3;
    return Math.round(temps[condition] + dailyVariation);
  }
  getCloudCoverForCondition(condition) {
    const covers = {
      "sunny": 10,
      "partly-cloudy": 40,
      "cloudy": 80,
      "overcast": 95,
      "rainy": 100,
      "stormy": 100
    };
    return covers[condition];
  }
  getWindSpeedForCondition(condition) {
    const windSpeeds = {
      "sunny": 8,
      "partly-cloudy": 12,
      "cloudy": 15,
      "overcast": 18,
      "rainy": 22,
      "stormy": 35
    };
    return windSpeeds[condition];
  }
};
var OutageSimulator = class {
  activeOutages = /* @__PURE__ */ new Set();
  async simulateOutage(householdIds, allHouseholds) {
    householdIds.forEach((id) => this.activeOutages.add(id));
    const mlEngine = new MLEnergyEngine();
    return mlEngine.simulateOutageResponse(householdIds, allHouseholds);
  }
  getActiveOutages() {
    return Array.from(this.activeOutages);
  }
  clearOutage(householdIds) {
    householdIds.forEach((id) => this.activeOutages.delete(id));
  }
};

// server/email-service.ts
import nodemailer from "nodemailer";
var EmailService = class {
  transporter = null;
  constructor() {
    this.initializeTransporter();
  }
  async initializeTransporter() {
    try {
      this.transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASSWORD
          // Use app password for Gmail
        }
      });
      if (this.transporter) {
        await this.transporter.verify();
        console.log("\u{1F4E7} Email service initialized successfully");
      }
    } catch (error) {
      console.warn("\u26A0\uFE0F Email service initialization failed:", error);
      this.transporter = null;
    }
  }
  async sendTradeAcceptanceNotification(data) {
    if (!this.transporter) {
      console.log("\u{1F4E7} Email service not available, skipping notification");
      return false;
    }
    try {
      const { offerCreator, acceptor, trade, household } = data;
      const subject = `\u2705 Your Energy Trade Offer Has Been Accepted! - SolarSense`;
      const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #10b981, #059669); color: white; padding: 20px; border-radius: 8px 8px 0 0;">
            <h1 style="margin: 0; font-size: 24px;">\u{1F31E} SolarSense Energy Trading</h1>
            <p style="margin: 5px 0 0 0; opacity: 0.9;">Sustainable Energy Trading Platform</p>
          </div>
          
          <div style="background: #f8fafc; padding: 30px; border-radius: 0 0 8px 8px; border: 1px solid #e2e8f0;">
            <h2 style="color: #10b981; margin-top: 0;">Great News! Your Energy Offer Has Been Accepted \u{1F389}</h2>
            
            <p>Hello <strong>${offerCreator.username}</strong>,</p>
            
            <p>Someone has accepted your energy trade offer! Here are the details:</p>
            
            <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10b981;">
              <h3 style="margin-top: 0; color: #374151;">\u{1F4CA} Trade Details</h3>
              <ul style="list-style: none; padding: 0;">
                <li style="margin: 8px 0;"><strong>Energy Amount:</strong> ${trade.energyAmount} kWh</li>
                <li style="margin: 8px 0;"><strong>Price per kWh:</strong> \u20B9${trade.pricePerKwh}</li>
                <li style="margin: 8px 0;"><strong>Total Value:</strong> \u20B9${(trade.energyAmount * trade.pricePerKwh).toFixed(2)}</li>
                <li style="margin: 8px 0;"><strong>Trade Type:</strong> ${trade.tradeType === "sell" ? "\u{1F50B} Selling Energy" : "\u26A1 Buying Energy"}</li>
              </ul>
            </div>
            
            <div style="background: #eff6ff; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #3b82f6;">
              <h3 style="margin-top: 0; color: #374151;">\u{1F464} Accepted By</h3>
              <ul style="list-style: none; padding: 0;">
                <li style="margin: 8px 0;"><strong>Username:</strong> ${acceptor.username}</li>
                <li style="margin: 8px 0;"><strong>Household:</strong> ${household.name}</li>
                <li style="margin: 8px 0;"><strong>Location:</strong> ${acceptor.district}, ${acceptor.state}</li>
              </ul>
            </div>
            
            <div style="background: #fef3c7; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b;">
              <h3 style="margin-top: 0; color: #374151;">\u{1F504} Next Steps</h3>
              <ol style="color: #374151; line-height: 1.6;">
                <li>Log into your SolarSense dashboard to view full contact details</li>
                <li>Coordinate with the other party for energy delivery/pickup</li>
                <li>Confirm the energy transfer once completed</li>
                <li>Rate your trading experience</li>
              </ol>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${"https://solarsense-ai.onrender.com/"}" 
                 style="background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
                \u{1F4F1} View Dashboard
              </a>
            </div>
            
            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;">
            
            <p style="color: #6b7280; font-size: 14px; text-align: center;">
              \u{1F30D} SolarSense - Building a sustainable energy future together<br>
              Decentralized \u2022 Resilient \u2022 Equitable
            </p>
          </div>
        </div>
      `;
      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: offerCreator.email,
        subject,
        html: htmlContent
      };
      await this.transporter.sendMail(mailOptions);
      console.log(`\u{1F4E7} Trade acceptance notification sent to ${offerCreator.email}`);
      return true;
    } catch (error) {
      console.error("\u274C Failed to send trade acceptance notification:", error);
      return false;
    }
  }
  async sendContactSharingNotification(recipient, sender, trade) {
    if (!this.transporter) {
      console.log("\u{1F4E7} Email service not available, skipping notification");
      return false;
    }
    try {
      const subject = `\u{1F4DE} Contact Details Shared - Energy Trade #${trade.id} - SolarSense`;
      const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #3b82f6, #2563eb); color: white; padding: 20px; border-radius: 8px 8px 0 0;">
            <h1 style="margin: 0; font-size: 24px;">\u{1F4DE} Contact Information Shared</h1>
            <p style="margin: 5px 0 0 0; opacity: 0.9;">Energy Trade #${trade.id}</p>
          </div>
          
          <div style="background: #f8fafc; padding: 30px; border-radius: 0 0 8px 8px; border: 1px solid #e2e8f0;">
            <h2 style="color: #3b82f6; margin-top: 0;">Contact Details Available \u{1F4F1}</h2>
            
            <p>Hello <strong>${recipient.username}</strong>,</p>
            
            <p>Contact information has been shared for your energy trade. You can now coordinate directly with:</p>
            
            <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #3b82f6;">
              <h3 style="margin-top: 0; color: #374151;">\u{1F464} Contact Information</h3>
              <ul style="list-style: none; padding: 0;">
                <li style="margin: 8px 0;"><strong>Name:</strong> ${sender.username}</li>
                <li style="margin: 8px 0;"><strong>Email:</strong> ${sender.email}</li>
                <li style="margin: 8px 0;"><strong>Phone:</strong> ${sender.phone || "Not provided"}</li>
                <li style="margin: 8px 0;"><strong>Location:</strong> ${sender.district}, ${sender.state}</li>
              </ul>
            </div>
            
            <p style="color: #374151; line-height: 1.6;">
              Please reach out to coordinate the energy transfer details, timing, and any technical requirements.
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${"https://solarsense-ai.onrender.com/"}" 
                 style="background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
                \u{1F4F1} View Dashboard
              </a>
            </div>
          </div>
        </div>
      `;
      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: recipient.email,
        subject,
        html: htmlContent
      };
      await this.transporter.sendMail(mailOptions);
      console.log(`\u{1F4E7} Contact sharing notification sent to ${recipient.email}`);
      return true;
    } catch (error) {
      console.error("\u274C Failed to send contact sharing notification:", error);
      return false;
    }
  }
  // Test email functionality
  async sendTestEmail(to) {
    if (!this.transporter) {
      console.log("\u{1F4E7} Email service not available");
      return false;
    }
    try {
      const mailOptions = {
        from: process.env.EMAIL_USER,
        to,
        subject: "\u{1F527} SolarSense Email Service Test",
        html: `
          <div style="font-family: Arial, sans-serif; padding: 20px;">
            <h2 style="color: #10b981;">\u2705 Email Service Working!</h2>
            <p>This is a test email from your SolarSense application.</p>
            <p>Email notifications are now properly configured.</p>
          </div>
        `
      };
      await this.transporter.sendMail(mailOptions);
      console.log(`\u{1F4E7} Test email sent to ${to}`);
      return true;
    } catch (error) {
      console.error("\u274C Failed to send test email:", error);
      return false;
    }
  }
};
var emailService = new EmailService();

// server/routes.ts
function setupRoutes(app) {
  const simulationEngine = new SimulationEngine(storage);
  app.get("/api/health", async (req, res) => {
    try {
      const timestamp2 = (/* @__PURE__ */ new Date()).toISOString();
      res.json({ status: "healthy", timestamp: timestamp2 });
    } catch (error) {
      res.status(500).json({ error: "Health check failed" });
    }
  });
  app.get("/api/households", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }
    try {
      const households2 = await storage.getHouseholdsByUser(req.user.id);
      res.json(households2);
    } catch (error) {
      res.status(500).json({ error: "Failed to get households" });
    }
  });
  app.post("/api/households", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }
    try {
      const validation = insertHouseholdSchema.safeParse({
        ...req.body,
        userId: req.user.id
      });
      if (!validation.success) {
        return res.status(400).json({ error: validation.error.issues });
      }
      const household = await storage.createHousehold(validation.data);
      res.json(household);
    } catch (error) {
      res.status(500).json({ error: "Failed to create household" });
    }
  });
  app.get("/api/analyses", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Authentication required" });
      }
      const userTrades = await storage.getEnergyTradesByUser(req.user.id);
      const userHouseholds = await storage.getHouseholdsByUser(req.user.id);
      const analyses = userTrades.map((trade) => ({
        id: trade.id,
        userId: req.user.id,
        type: trade.tradeType,
        // 'buy' or 'sell'
        createdAt: trade.createdAt,
        results: {
          energyAmount: trade.energyAmount,
          // Energy is stored as kWh, no conversion needed
          pricePerKwh: trade.pricePerKwh / 100,
          // Convert to rupees (stored as cents)
          totalValue: trade.energyAmount * (trade.pricePerKwh / 100),
          status: trade.status,
          tradeType: trade.tradeType,
          householdType: trade.sellerHouseholdId ? "seller" : "buyer"
        },
        status: trade.status,
        householdId: trade.sellerHouseholdId || trade.buyerHouseholdId
      }));
      res.json(analyses);
    } catch (error) {
      res.status(500).json({ error: "Failed to get user energy activity" });
    }
  });
  app.get("/api/energy-trades", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Authentication required. Please log in to view energy trades." });
      }
      const trades = await storage.getEnergyTrades();
      res.json(trades);
    } catch (error) {
      res.status(500).json({ error: "Failed to get energy trades" });
    }
  });
  app.post("/api/energy-trades", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }
    try {
      const userHouseholds = await storage.getHouseholdsByUser(req.user.id);
      if (userHouseholds.length === 0) {
        return res.status(400).json({ error: "No household found. Please create a household first." });
      }
      const userHouseholdId = userHouseholds[0].id;
      const { energyAmount, pricePerKwh, tradeType } = req.body;
      if (!energyAmount || !pricePerKwh || !tradeType) {
        return res.status(400).json({ error: "Missing required fields: energyAmount, pricePerKwh, tradeType" });
      }
      if (energyAmount <= 0 || pricePerKwh <= 0) {
        return res.status(400).json({ error: "Energy amount and price must be positive" });
      }
      const tradeData = {
        sellerHouseholdId: tradeType === "sell" ? userHouseholdId : void 0,
        buyerHouseholdId: tradeType === "buy" ? userHouseholdId : void 0,
        energyAmount: parseFloat(energyAmount),
        // Store as actual kWh value
        pricePerKwh: Math.round(parseFloat(pricePerKwh) * 100),
        // Convert to cents
        tradeType
      };
      const trade = await storage.createEnergyTrade(tradeData);
      res.json({ success: true, trade });
    } catch (error) {
      console.error("Failed to create trade:", error);
      res.status(500).json({ error: "Failed to create trade" });
    }
  });
  app.put("/api/energy-trades/:id", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }
    try {
      const tradeId = parseInt(req.params.id);
      const { energyAmount, pricePerKwh, tradeType } = req.body;
      const existingTrade = await storage.getEnergyTradeById(tradeId);
      if (!existingTrade) {
        return res.status(404).json({ error: "Trade not found" });
      }
      const userHouseholds = await storage.getHouseholdsByUser(req.user.id);
      const userHouseholdId = userHouseholds[0]?.id;
      if (!userHouseholdId || existingTrade.sellerHouseholdId !== userHouseholdId && existingTrade.buyerHouseholdId !== userHouseholdId) {
        return res.status(403).json({ error: "You can only edit your own trades" });
      }
      if (!energyAmount || !pricePerKwh || !tradeType) {
        return res.status(400).json({ error: "Missing required fields: energyAmount, pricePerKwh, tradeType" });
      }
      if (energyAmount <= 0 || pricePerKwh <= 0) {
        return res.status(400).json({ error: "Energy amount and price must be positive" });
      }
      const updatedTradeData = {
        energyAmount: parseFloat(energyAmount),
        pricePerKwh: Math.round(parseFloat(pricePerKwh) * 100),
        // Convert to cents
        tradeType,
        sellerHouseholdId: tradeType === "sell" ? userHouseholdId : void 0,
        buyerHouseholdId: tradeType === "buy" ? userHouseholdId : void 0
      };
      const updatedTrade = await storage.updateEnergyTrade(tradeId, updatedTradeData);
      res.json({ success: true, trade: updatedTrade });
    } catch (error) {
      console.error("Failed to update trade:", error);
      res.status(500).json({ error: "Failed to update trade" });
    }
  });
  app.delete("/api/energy-trades/:id", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }
    try {
      const tradeId = parseInt(req.params.id);
      const existingTrade = await storage.getEnergyTradeById(tradeId);
      if (!existingTrade) {
        return res.status(404).json({ error: "Trade not found" });
      }
      const userHouseholds = await storage.getHouseholdsByUser(req.user.id);
      const userHouseholdId = userHouseholds[0]?.id;
      if (!userHouseholdId || existingTrade.sellerHouseholdId !== userHouseholdId && existingTrade.buyerHouseholdId !== userHouseholdId) {
        return res.status(403).json({ error: "You can only delete your own trades" });
      }
      await storage.deleteEnergyTrade(tradeId);
      res.json({ success: true, message: "Trade deleted successfully" });
    } catch (error) {
      console.error("Failed to delete trade:", error);
      res.status(500).json({ error: "Failed to delete trade" });
    }
  });
  app.get("/api/energy-readings", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Authentication required. Please log in to view energy readings." });
      }
      const readings = await storage.getEnergyReadings();
      res.json(readings);
    } catch (error) {
      res.status(500).json({ error: "Failed to get energy readings" });
    }
  });
  app.get("/api/market/realtime", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Authentication required. Please log in to view market data." });
      }
      const { latitude, longitude } = req.query;
      if (!latitude || !longitude) {
        return res.status(400).json({ error: "Location required for accurate market data. Please provide latitude and longitude." });
      }
      const lat = parseFloat(latitude);
      const lon = parseFloat(longitude);
      if (isNaN(lat) || isNaN(lon)) {
        return res.status(400).json({ error: "Invalid coordinates. Latitude and longitude must be numbers." });
      }
      const marketData = await storage.getRealtimeMarketData(lat, lon);
      res.json(marketData);
    } catch (error) {
      console.error("Real-time market data error:", error);
      res.status(500).json({ error: "Failed to get market data" });
    }
  });
  app.get("/api/analytics/network", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Authentication required. Please log in to view network analytics." });
      }
      const analytics = await storage.getNetworkAnalytics();
      res.json(analytics);
    } catch (error) {
      res.status(500).json({ error: "Failed to get network analytics" });
    }
  });
  app.post("/api/ai/chat", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Authentication required. Please log in to use the chat." });
      }
      const { message } = req.body;
      if (!message) {
        return res.status(400).json({ error: "Message is required" });
      }
      const userId = req.user?.id || null;
      const sessionId = req.sessionId || `session_${Date.now()}`;
      const username = req.user?.username || "Anonymous";
      console.log("\u{1F4AC} Chat session debug:", {
        sessionId: req.sessionId,
        userId: req.user?.id,
        username: req.user?.username,
        isAuthenticated: req.isAuthenticated(),
        cookies: req.cookies,
        headers: req.headers["x-session-id"]
      });
      try {
        await storage.createChatMessage({
          userId,
          sessionId,
          username,
          message,
          type: "user",
          category: "energy-consultation"
        });
      } catch (error) {
        console.warn("Failed to save user message:", error);
      }
      try {
        const households2 = req.user ? await storage.getHouseholdsByUser(req.user.id) : [];
        const userContext = {
          username,
          location: "Ludhiana, Punjab, India",
          // From the logs we can see user is in Ludhiana
          households: households2,
          energyData: households2.length > 0
        };
        const response = await generateEnergyOptimizationResponse(message, userContext);
        try {
          await storage.createChatMessage({
            userId,
            sessionId,
            username: "SolarSense AI",
            message: response,
            type: "ai",
            category: "energy-consultation"
          });
        } catch (error) {
          console.warn("Failed to save AI response:", error);
        }
        res.json({
          response,
          category: "energy-consultation"
        });
      } catch (aiError) {
        console.error("Gemini AI error:", aiError);
        const errorResponse = "Energy assistant is temporarily unavailable. Please try again later.";
        try {
          await storage.createChatMessage({
            userId,
            sessionId,
            username: "SolarSense AI",
            message: errorResponse,
            type: "system",
            category: "error"
          });
        } catch (error) {
          console.warn("Failed to save error response:", error);
        }
        res.json({
          response: errorResponse,
          category: "error"
        });
      }
    } catch (error) {
      console.error("Chat error:", error);
      const errorResponse = "I'm having trouble right now. Please try again in a moment.";
      try {
        const userId = req.user?.id || null;
        const sessionId = req.sessionID || `session_${Date.now()}`;
        await storage.createChatMessage({
          userId,
          sessionId,
          username: "SolarSense AI",
          message: errorResponse,
          type: "system",
          category: "error"
        });
      } catch (dbError) {
        console.warn("Failed to save error message to database:", dbError);
      }
      res.json({
        response: errorResponse,
        category: "error"
      });
    }
  });
  app.get("/api/chat/messages", async (req, res) => {
    try {
      const { limit } = req.query;
      const messageLimit = limit ? parseInt(limit) : 50;
      let messages;
      if (req.user?.id) {
        messages = await storage.getChatMessagesByUser(req.user.id, messageLimit);
      } else if (req.sessionID) {
        messages = await storage.getChatMessagesBySession(req.sessionID, messageLimit);
      } else {
        messages = [];
      }
      res.json(messages);
    } catch (error) {
      console.error("Failed to get chat messages:", error);
      res.status(500).json({ error: "Failed to get chat history" });
    }
  });
  app.post("/api/chat/clear", async (req, res) => {
    try {
      if (req.sessionID) {
        await storage.clearSessionData(req.sessionID);
        res.json({ success: true, message: "Chat history cleared" });
      } else {
        res.status(400).json({ error: "No session found" });
      }
    } catch (error) {
      console.error("Failed to clear chat history:", error);
      res.status(500).json({ error: "Failed to clear chat history" });
    }
  });
  app.get("/api/simulation/status", async (req, res) => {
    try {
      const status = simulationEngine.getStatus();
      res.json(status);
    } catch (error) {
      console.error("Failed to get simulation status:", error);
      res.status(500).json({ error: "Failed to get simulation status" });
    }
  });
  app.post("/api/simulation/start", async (req, res) => {
    try {
      await simulationEngine.startSimulation();
      res.json({
        success: true,
        message: "Simulation started successfully",
        isRunning: true
      });
    } catch (error) {
      console.error("Failed to start simulation:", error);
      res.status(500).json({ error: "Failed to start simulation" });
    }
  });
  app.post("/api/simulation/stop", async (req, res) => {
    try {
      simulationEngine.stopSimulation();
      res.json({
        success: true,
        message: "Simulation stopped successfully",
        isRunning: false
      });
    } catch (error) {
      console.error("Failed to stop simulation:", error);
      res.status(500).json({ error: "Failed to stop simulation" });
    }
  });
  app.post("/api/simulation/weather", async (req, res) => {
    try {
      const { condition } = req.body;
      if (!condition) {
        return res.status(400).json({ error: "Weather condition is required" });
      }
      const weather = await simulationEngine.triggerWeatherChange(condition);
      res.json({
        success: true,
        message: `Weather changed to ${condition}`,
        impact: `Solar efficiency: ${weather.condition === "sunny" ? "95%" : weather.condition === "stormy" ? "5%" : "50%"}`,
        weather
      });
    } catch (error) {
      console.error("Failed to change weather:", error);
      res.status(500).json({ error: "Failed to change weather" });
    }
  });
  app.post("/api/simulation/outage", async (req, res) => {
    try {
      const { householdIds } = req.body;
      const outageResponse = await simulationEngine.triggerOutage(householdIds);
      res.json({
        success: true,
        message: `Power outage affecting ${householdIds?.length || "random"} households`,
        outageResponse
      });
    } catch (error) {
      console.error("Failed to trigger outage:", error);
      res.status(500).json({ error: "Failed to trigger outage" });
    }
  });
  app.get("/api/ml/optimization", async (req, res) => {
    try {
      const optimization = simulationEngine.getOptimizationResult();
      res.json({ optimization });
    } catch (error) {
      console.error("Failed to get optimization:", error);
      res.status(500).json({ error: "Failed to get optimization results" });
    }
  });
  app.get("/api/simulation/analytics", async (req, res) => {
    try {
      const stats = simulationEngine.getNetworkStats();
      const analytics = {
        network: {
          totalHouseholds: stats.totalHouseholds,
          activeHouseholds: stats.activeConnections,
          totalGenerationCapacity: `${stats.totalGeneration} kW`,
          totalStorageCapacity: `${stats.batteryStorageTotal} kWh`,
          currentStorageLevel: `${Math.round(stats.batteryStorageTotal * 0.6)} kWh`,
          storageUtilization: `${Math.round(stats.batteryStorageTotal * 0.6 / stats.batteryStorageTotal * 100)}%`
        },
        trading: {
          totalTrades: Math.round(stats.tradingVelocity * 10),
          totalEnergyTraded: `${stats.tradingVelocity * 24} kWh`,
          averagePrice: "\u20B94.2/kWh",
          carbonSaved: `${stats.carbonReduction} kg CO2`
        },
        efficiency: {
          averageDistance: "1.2 km",
          networkEfficiency: "89%"
        }
      };
      res.json(analytics);
    } catch (error) {
      console.error("Failed to get simulation analytics:", error);
      res.status(500).json({ error: "Failed to get simulation analytics" });
    }
  });
  app.get("/api/trade-offers", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }
    try {
      const availableOffers = await storage.getAvailableOffersForUser(req.user.id);
      res.json(availableOffers);
    } catch (error) {
      console.error("Failed to get available offers:", error);
      res.status(500).json({ error: "Failed to get available offers" });
    }
  });
  app.post("/api/trade-acceptances", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }
    try {
      const validation = insertTradeAcceptanceSchema.safeParse({
        ...req.body,
        acceptorUserId: req.user.id
      });
      if (!validation.success) {
        return res.status(400).json({ error: validation.error.issues });
      }
      const acceptance = await storage.createTradeAcceptance(validation.data);
      try {
        const trade = await storage.getEnergyTradeById(validation.data.tradeId);
        if (trade) {
          let offerCreatorUser = null;
          let household = null;
          if (trade.sellerHouseholdId) {
            household = await storage.getHousehold(trade.sellerHouseholdId);
            if (household) {
              offerCreatorUser = await storage.getUser(household.userId);
            }
          } else if (trade.buyerHouseholdId) {
            household = await storage.getHousehold(trade.buyerHouseholdId);
            if (household) {
              offerCreatorUser = await storage.getUser(household.userId);
            }
          }
          if (offerCreatorUser && household) {
            await emailService.sendTradeAcceptanceNotification({
              offerCreator: offerCreatorUser,
              acceptor: req.user,
              trade,
              household
            });
            console.log(`\u{1F4E7} Email notification sent to offer creator: ${offerCreatorUser.email}`);
          }
        }
      } catch (emailError) {
        console.error("Failed to send email notification:", emailError);
      }
      res.json({
        success: true,
        acceptance,
        message: "Trade offer accepted! The offer creator has been notified via email. Contact information will be shared for energy delivery coordination."
      });
    } catch (error) {
      console.error("Failed to accept trade:", error);
      res.status(500).json({ error: "Failed to accept trade offer" });
    }
  });
  app.get("/api/trade-acceptances", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }
    try {
      const acceptances = await storage.getTradeAcceptancesByUser(req.user.id);
      res.json(acceptances);
    } catch (error) {
      console.error("Failed to get trade acceptances:", error);
      res.status(500).json({ error: "Failed to get trade acceptances" });
    }
  });
  app.get("/api/my-trade-applications", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }
    try {
      const applications = await storage.getApplicationsToMyTrades(req.user.id);
      res.json(applications);
    } catch (error) {
      console.error("Failed to get trade applications:", error);
      res.status(500).json({ error: "Failed to get trade applications" });
    }
  });
  app.post("/api/trade-acceptances/:id/share-contact", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }
    try {
      const acceptanceId = parseInt(req.params.id);
      const contactInfo = await storage.shareContactInfo(acceptanceId);
      try {
        if (contactInfo.contactInfo && contactInfo.trade) {
          let recipientUser = null;
          if (contactInfo.acceptance?.acceptorUserId === req.user.id) {
            if (contactInfo.trade.sellerHouseholdId) {
              const household = await storage.getHousehold(contactInfo.trade.sellerHouseholdId);
              if (household) {
                recipientUser = await storage.getUser(household.userId);
              }
            } else if (contactInfo.trade.buyerHouseholdId) {
              const household = await storage.getHousehold(contactInfo.trade.buyerHouseholdId);
              if (household) {
                recipientUser = await storage.getUser(household.userId);
              }
            }
          } else {
            recipientUser = await storage.getUser(contactInfo.acceptance.acceptorUserId);
          }
          if (recipientUser) {
            await emailService.sendContactSharingNotification(
              recipientUser,
              req.user,
              contactInfo.trade
            );
            console.log(`\u{1F4E7} Contact sharing notification sent to: ${recipientUser.email}`);
          }
        }
      } catch (emailError) {
        console.error("Failed to send contact sharing notification:", emailError);
      }
      res.json({
        success: true,
        message: "Contact information shared for energy delivery coordination. The other party has been notified via email.",
        contactInfo: contactInfo.contactInfo,
        trade: contactInfo.trade
      });
    } catch (error) {
      console.error("Failed to share contact info:", error);
      res.status(500).json({ error: "Failed to share contact information" });
    }
  });
  app.patch("/api/trade-acceptances/:id", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }
    try {
      const acceptanceId = parseInt(req.params.id);
      const { status } = req.body;
      if (!status) {
        return res.status(400).json({ error: "Status is required" });
      }
      const acceptance = await storage.updateTradeAcceptanceStatus(acceptanceId, status);
      if (!acceptance) {
        return res.status(404).json({ error: "Trade acceptance not found" });
      }
      res.json({
        success: true,
        acceptance,
        message: `Trade acceptance status updated to ${status}`
      });
    } catch (error) {
      console.error("Failed to update trade acceptance:", error);
      res.status(500).json({ error: "Failed to update trade acceptance" });
    }
  });
  app.post("/api/test-email", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }
    try {
      const { email } = req.body;
      const testEmail = email || req.user.email;
      const success = await emailService.sendTestEmail(testEmail);
      if (success) {
        res.json({
          success: true,
          message: `Test email sent successfully to ${testEmail}`
        });
      } else {
        res.status(500).json({
          error: "Email service not configured. Please set EMAIL_USER and EMAIL_PASSWORD environment variables."
        });
      }
    } catch (error) {
      console.error("Failed to send test email:", error);
      res.status(500).json({ error: "Failed to send test email" });
    }
  });
}

// server/auth.ts
init_schema();
import bcrypt from "bcryptjs";
import crypto from "crypto";
function generateSessionId() {
  return crypto.randomBytes(32).toString("hex");
}
async function hashPassword(password) {
  const saltRounds = 12;
  return await bcrypt.hash(password, saltRounds);
}
async function comparePasswords(supplied, stored) {
  return await bcrypt.compare(supplied, stored);
}
function setupAuth(app) {
  app.use(async (req, res, next) => {
    let sessionId = req.cookies?.sessionId || req.headers["x-session-id"];
    if (!sessionId) {
      sessionId = generateSessionId();
    }
    const user = await storage.getSessionUser(sessionId);
    if (user) {
      req.user = user;
      res.cookie("sessionId", sessionId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 24 * 60 * 60 * 1e3
        // 24 hours
      });
    }
    req.isAuthenticated = () => !!req.user;
    req.sessionId = sessionId;
    next();
  });
  app.post("/api/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ error: "Email and password required" });
      }
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(401).json({ error: "Invalid credentials" });
      }
      const passwordMatch = await comparePasswords(password, user.password);
      if (!passwordMatch) {
        return res.status(401).json({ error: "Invalid credentials" });
      }
      const sessionId = generateSessionId();
      await storage.createSession(sessionId, user.id);
      res.cookie("sessionId", sessionId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 24 * 60 * 60 * 1e3
        // 24 hours
      });
      res.json({
        user: {
          id: user.id,
          username: user.username,
          email: user.email
        },
        sessionId
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ error: "Login failed" });
    }
  });
  app.post("/api/logout", async (req, res) => {
    const sessionId = req.sessionId;
    if (sessionId) {
      await storage.deleteSession(sessionId);
    }
    res.clearCookie("sessionId");
    res.json({ message: "Logged out successfully" });
  });
  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    const user = req.user;
    res.json({
      id: user.id,
      username: user.username,
      email: user.email
    });
  });
  app.post("/api/register", async (req, res) => {
    try {
      const validationResult = signupSchema.safeParse(req.body);
      if (!validationResult.success) {
        const errorMessage = validationResult.error.errors[0]?.message || "Invalid input data";
        return res.status(400).json({ error: errorMessage });
      }
      const { username, email, password, phone, state, district, householdName, address, solarCapacity, batteryCapacity } = validationResult.data;
      const sanitizedData = {
        username: username.trim(),
        email: email.toLowerCase().trim(),
        phone: phone.trim(),
        state: state.trim(),
        district: district.trim(),
        householdName: householdName.trim(),
        address: address.trim()
      };
      const existingUser = await storage.getUserByEmail(sanitizedData.email);
      if (existingUser) {
        return res.status(400).json({ error: "Email already registered" });
      }
      const existingUsername = await storage.getUserByUsername(sanitizedData.username);
      if (existingUsername) {
        return res.status(400).json({ error: "Username already taken" });
      }
      const hashedPassword = await hashPassword(password);
      const newUser = await storage.createUser({
        username: sanitizedData.username,
        email: sanitizedData.email,
        password: hashedPassword,
        phone: sanitizedData.phone || null,
        state: sanitizedData.state || null,
        district: sanitizedData.district || null
      });
      await storage.createHousehold({
        userId: newUser.id,
        name: sanitizedData.householdName,
        address: sanitizedData.address,
        solarCapacity,
        batteryCapacity,
        currentBatteryLevel: 50
        // Default 50%
      });
      const sessionId = generateSessionId();
      await storage.createSession(sessionId, newUser.id);
      res.cookie("sessionId", sessionId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 24 * 60 * 60 * 1e3
        // 24 hours
      });
      res.json({
        user: {
          id: newUser.id,
          username: newUser.username,
          email: newUser.email
        },
        sessionId
      });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({ error: "Registration failed" });
    }
  });
}

// server/vite.ts
import express from "express";
import fs from "fs";
import path2 from "path";
import { createServer as createViteServer, createLogger } from "vite";

// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
var vite_config_default = defineConfig({
  plugins: [
    react(),
    ...process.env.NODE_ENV !== "production" && process.env.REPL_ID !== void 0 ? [
      await import("@replit/vite-plugin-cartographer").then(
        (m) => m.cartographer()
      )
    ] : []
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets")
    }
  },
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true
  },
  server: {
    fs: {
      strict: true,
      deny: ["**/.*"]
    }
  }
});

// server/vite.ts
import { nanoid } from "nanoid";
var viteLogger = createLogger();
function log(message, source = "express") {
  const formattedTime = (/* @__PURE__ */ new Date()).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}
async function setupVite(app, server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true
  };
  const vite = await createViteServer({
    ...vite_config_default,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      }
    },
    server: serverOptions,
    appType: "custom"
  });
  app.use(vite.middlewares);
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    try {
      const clientTemplate = path2.resolve(
        import.meta.dirname,
        "..",
        "client",
        "index.html"
      );
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e);
      next(e);
    }
  });
}
function serveStatic(app) {
  const distPath = path2.resolve(import.meta.dirname, "public");
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }
  app.use(express.static(distPath));
  app.use("*", (_req, res) => {
    res.sendFile(path2.resolve(distPath, "index.html"));
  });
}

// server/index.ts
init_db();
import dotenv2 from "dotenv";
dotenv2.config();
function createServer() {
  const app = express2();
  app.use(
    cors({
      origin: true,
      // Allow all origins in development
      credentials: true
      // Enable cookies and auth headers
    })
  );
  app.use(cookieParser());
  app.use(express2.json());
  app.use(express2.urlencoded({ extended: false }));
  app.use((req, res, next) => {
    const start = Date.now();
    const path3 = req.path;
    let capturedJsonResponse = void 0;
    const originalResJson = res.json;
    res.json = function(bodyJson, ...args) {
      capturedJsonResponse = bodyJson;
      return originalResJson.apply(res, [bodyJson, ...args]);
    };
    res.on("finish", () => {
      const duration = Date.now() - start;
      if (path3.startsWith("/api")) {
        let logLine = `${req.method} ${path3} ${res.statusCode} in ${duration}ms`;
        if (capturedJsonResponse) {
          logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
        }
        if (logLine.length > 80) {
          logLine = logLine.slice(0, 79) + "\u2026";
        }
        log(logLine);
      }
    });
    next();
  });
  return app;
}
if (process.env.NODE_ENV !== "production") {
  (async () => {
    const isDatabaseConnected = await initializeDatabase();
    if ("waitForConnectionCheck" in storage && typeof storage.waitForConnectionCheck === "function") {
      await storage.waitForConnectionCheck();
    }
    let storageStatus;
    if ("getStorageStatus" in storage && typeof storage.getStorageStatus === "function") {
      storageStatus = storage.getStorageStatus();
    } else {
      storageStatus = { type: "database", available: true };
    }
    log(
      `Database connection: ${isDatabaseConnected ? "\u2713 Connected" : "\u2717 Not connected"}`
    );
    log(`Storage type: ${storageStatus.type}`);
    const app = createServer();
    setupAuth(app);
    setupRoutes(app);
    const port = 5e3;
    const host = "0.0.0.0";
    const canReuse = process.platform !== "win32";
    const server = app.listen(
      {
        port,
        host,
        ...canReuse ? { reusePort: true } : {}
      },
      () => {
        log(`serving on http://${host}:${port}`);
      }
    );
    if (app.get("env") === "development") {
      await setupVite(app, server);
    } else {
      serveStatic(app);
    }
  })();
}
async function startProductionServer() {
  const isDatabaseConnected = await initializeDatabase();
  if ("waitForConnectionCheck" in storage && typeof storage.waitForConnectionCheck === "function") {
    await storage.waitForConnectionCheck();
  }
  let storageStatus;
  if ("getStorageStatus" in storage && typeof storage.getStorageStatus === "function") {
    storageStatus = storage.getStorageStatus();
  } else {
    storageStatus = { type: "database", available: true };
  }
  console.log(
    `Database connection: ${isDatabaseConnected ? "\u2713 Connected" : "\u2717 Not connected"}`
  );
  console.log(`Storage type: ${storageStatus.type}`);
  const app = createServer();
  setupAuth(app);
  setupRoutes(app);
  serveStatic(app);
  const port = parseInt(process.env.PORT || "10000", 10);
  const host = "0.0.0.0";
  const server = app.listen(port, host, () => {
    console.log(`\u{1F680} SolarSense AI server running on port ${port}`);
    console.log(
      `\u{1F310} Health check available at: http://${host}:${port}/api/health`
    );
  });
  return server;
}
if (process.env.NODE_ENV === "production" && import.meta.url === `file://${process.argv[1]}`) {
  startProductionServer().catch((error) => {
    console.error("\u274C Failed to start production server:", error);
    process.exit(1);
  });
}
export {
  createServer,
  startProductionServer
};
