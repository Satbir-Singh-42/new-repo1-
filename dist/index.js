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
  analyses: () => analyses,
  chatMessages: () => chatMessages,
  faultResultSchema: () => faultResultSchema,
  insertAnalysisSchema: () => insertAnalysisSchema,
  insertChatMessageSchema: () => insertChatMessageSchema,
  insertUserSchema: () => insertUserSchema,
  installationResultSchema: () => installationResultSchema,
  loginSchema: () => loginSchema,
  roofInputSchema: () => roofInputSchema,
  signupSchema: () => signupSchema,
  users: () => users
});
import { pgTable, text, serial, integer, jsonb, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
var users, analyses, chatMessages, insertUserSchema, loginSchema, signupSchema, insertAnalysisSchema, insertChatMessageSchema, roofInputSchema, installationResultSchema, faultResultSchema;
var init_schema = __esm({
  "shared/schema.ts"() {
    "use strict";
    users = pgTable("users", {
      id: serial("id").primaryKey(),
      username: text("username").notNull().unique(),
      email: text("email").notNull().unique(),
      password: text("password").notNull(),
      createdAt: timestamp("created_at").defaultNow().notNull()
    });
    analyses = pgTable("analyses", {
      id: serial("id").primaryKey(),
      userId: integer("user_id"),
      sessionId: text("session_id"),
      // For non-authenticated users
      userSequenceNumber: integer("user_sequence_number").notNull().default(1),
      // User-specific serial number
      type: text("type").notNull(),
      // 'installation' or 'fault-detection'
      imagePath: text("image_path").notNull(),
      results: jsonb("results").notNull(),
      originalImageUrl: text("original_image_url"),
      analysisImageUrl: text("analysis_image_url"),
      createdAt: timestamp("created_at").defaultNow().notNull()
    });
    chatMessages = pgTable("chat_messages", {
      id: serial("id").primaryKey(),
      userId: integer("user_id"),
      sessionId: text("session_id"),
      // For non-authenticated users
      username: text("username").notNull(),
      message: text("message").notNull(),
      type: text("type").notNull().default("user"),
      // 'user', 'system', 'ai'
      category: text("category").default("general"),
      // 'installation', 'maintenance', 'fault', 'general'
      createdAt: timestamp("created_at").defaultNow().notNull()
    });
    insertUserSchema = createInsertSchema(users).pick({
      username: true,
      email: true,
      password: true
    });
    loginSchema = z.object({
      email: z.string().email("Please enter a valid email address"),
      password: z.string().min(1, "Password is required")
    });
    signupSchema = z.object({
      username: z.string().min(3, "Username must be at least 3 characters"),
      email: z.string().email("Please enter a valid email address"),
      password: z.string().min(8, "Password must be at least 8 characters").regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, "Password must contain at least one uppercase letter, one lowercase letter, and one number"),
      confirmPassword: z.string().min(1, "Please confirm your password")
    }).refine((data) => data.password === data.confirmPassword, {
      message: "Passwords don't match",
      path: ["confirmPassword"]
    });
    insertAnalysisSchema = createInsertSchema(analyses).pick({
      userId: true,
      sessionId: true,
      userSequenceNumber: true,
      type: true,
      imagePath: true,
      results: true,
      originalImageUrl: true,
      analysisImageUrl: true
    });
    insertChatMessageSchema = createInsertSchema(chatMessages).pick({
      userId: true,
      sessionId: true,
      username: true,
      message: true,
      type: true,
      category: true
    });
    roofInputSchema = z.object({
      roofSize: z.number().min(100).max(1e4).optional(),
      // Square feet
      roofShape: z.enum(["gable", "hip", "shed", "flat", "complex", "auto-detect"]).optional(),
      panelSize: z.enum(["standard", "large", "auto-optimize"]).optional()
    });
    installationResultSchema = z.object({
      totalPanels: z.number(),
      coverage: z.number(),
      efficiency: z.number(),
      confidence: z.number(),
      powerOutput: z.number(),
      orientation: z.string(),
      shadingAnalysis: z.string(),
      notes: z.string(),
      roofType: z.string().optional(),
      estimatedRoofArea: z.number().optional(),
      usableRoofArea: z.number().optional(),
      obstructions: z.array(z.object({
        type: z.string(),
        x: z.number(),
        y: z.number(),
        width: z.number(),
        height: z.number()
      })).optional(),
      roofSections: z.array(z.object({
        name: z.string(),
        orientation: z.string(),
        tiltAngle: z.number(),
        area: z.number(),
        panelCount: z.number(),
        efficiency: z.number()
      })).optional(),
      regions: z.array(z.object({
        x: z.number(),
        y: z.number(),
        width: z.number(),
        height: z.number(),
        roofSection: z.string().optional()
      })),
      calculationDetails: z.object({
        marketStandards: z.object({
          panelWidth: z.number(),
          panelHeight: z.number(),
          panelArea: z.number(),
          panelPower: z.number(),
          panelPowerKW: z.number()
        }),
        annualSavings: z.number(),
        installationCost: z.number(),
        paybackPeriod: z.number()
      }).optional()
    });
    faultResultSchema = z.object({
      panelId: z.string(),
      faults: z.array(z.object({
        type: z.string(),
        severity: z.string(),
        x: z.number(),
        y: z.number(),
        description: z.string()
      })),
      overallHealth: z.string(),
      recommendations: z.array(z.string())
    });
  }
});

// server/auth.ts
var auth_exports = {};
__export(auth_exports, {
  comparePasswords: () => comparePasswords,
  hashPassword: () => hashPassword,
  setupAuth: () => setupAuth
});
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
async function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const buf = await scryptAsync(password, salt, 64);
  return `${buf.toString("hex")}.${salt}`;
}
async function comparePasswords(supplied, stored) {
  try {
    const [hashed, salt] = stored.split(".");
    if (!salt) {
      console.error("Password hash missing salt:", stored);
      return false;
    }
    const hashedBuf = Buffer.from(hashed, "hex");
    const suppliedBuf = await scryptAsync(supplied, salt, 64);
    return timingSafeEqual(hashedBuf, suppliedBuf);
  } catch (error) {
    console.error("Password comparison error:", error);
    return false;
  }
}
function setupAuth(app) {
  const sessionSettings = {
    secret: process.env.SESSION_SECRET || "your-secret-key-here",
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1e3
      // 24 hours
    }
  };
  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());
  passport.use(
    new LocalStrategy(
      {
        usernameField: "email",
        passwordField: "password"
      },
      async (email, password, done) => {
        try {
          const user = await storage.getUserByEmail(email);
          if (!user || !await comparePasswords(password, user.password)) {
            return done(null, false);
          }
          return done(null, user);
        } catch (error) {
          return done(error);
        }
      }
    )
  );
  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id, done) => {
    try {
      const user = await storage.getUser(id);
      if (!user) {
        return done(null, null);
      }
      done(null, user);
    } catch (error) {
      console.error("User deserialization error:", error);
      done(null, null);
    }
  });
  app.post("/api/register", async (req, res, next) => {
    try {
      const { username, email, password } = req.body;
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ error: "Email already registered" });
      }
      const existingUsername = await storage.getUserByUsername(username);
      if (existingUsername) {
        return res.status(400).json({ error: "Username already taken" });
      }
      const hashedPassword = await hashPassword(password);
      const user = await storage.createUser({
        username,
        email,
        password: hashedPassword
      });
      req.login(user, (err) => {
        if (err) return next(err);
        res.status(201).json({
          success: true,
          user: { id: user.id, username: user.username, email: user.email }
        });
      });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });
  app.post("/api/login", passport.authenticate("local"), (req, res) => {
    const user = req.user;
    res.status(200).json({
      success: true,
      user: { id: user.id, username: user.username, email: user.email }
    });
  });
  app.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      req.session.destroy((err2) => {
        if (err2) {
          console.error("Session destruction error:", err2);
          return next(err2);
        }
        res.clearCookie("connect.sid");
        res.status(200).json({ success: true });
      });
    });
  });
  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    const user = req.user;
    res.json({
      success: true,
      user: { id: user.id, username: user.username, email: user.email }
    });
  });
}
var scryptAsync;
var init_auth = __esm({
  "server/auth.ts"() {
    "use strict";
    init_storage();
    scryptAsync = promisify(scrypt);
  }
});

// server/db.ts
var db_exports = {};
__export(db_exports, {
  db: () => db,
  initializeDatabase: () => initializeDatabase,
  pool: () => pool
});
import { Pool, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import ws from "ws";
function getDatabaseUrl() {
  const databaseUrl = process.env.DATABASE_URL;
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
      neonConfig.webSocketConstructor = ws;
      pool = new Pool({ connectionString: databaseUrl });
      db = drizzle({ client: pool, schema: schema_exports });
      await pool.query("SELECT 1");
      console.log("Database connected successfully");
      return true;
    } catch (error) {
      console.warn("Database connection failed, falling back to memory storage:", error);
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

// server/storage.ts
import { eq, desc, and } from "drizzle-orm";
import session2 from "express-session";
import createMemoryStore from "memorystore";
import connectPg from "connect-pg-simple";
import { config } from "dotenv";
function getDatabaseUrl2() {
  return process.env.DATABASE_URL || null;
}
var MemStorage, DatabaseStorage, HybridStorage, storage;
var init_storage = __esm({
  "server/storage.ts"() {
    "use strict";
    init_schema();
    config();
    MemStorage = class {
      users;
      analyses;
      chatMessages;
      currentUserId;
      currentAnalysisId;
      currentChatMessageId;
      sessionStore;
      constructor() {
        this.users = /* @__PURE__ */ new Map();
        this.analyses = /* @__PURE__ */ new Map();
        this.chatMessages = /* @__PURE__ */ new Map();
        this.currentUserId = 1;
        this.currentAnalysisId = 1;
        this.currentChatMessageId = 1;
        const MemoryStore = createMemoryStore(session2);
        this.sessionStore = new MemoryStore({
          checkPeriod: 864e5
          // 24 hours
        });
        this.addTestingUser();
      }
      async addTestingUser() {
        const { hashPassword: hashPassword2 } = await Promise.resolve().then(() => (init_auth(), auth_exports));
        const hashedPassword = await hashPassword2("password123");
        const testUser = {
          id: 1,
          username: "test_user",
          email: "test@example.com",
          password: hashedPassword,
          createdAt: /* @__PURE__ */ new Date()
        };
        this.users.set(testUser.id, testUser);
        this.currentUserId = 2;
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
        const user = { ...insertUser, id, createdAt: /* @__PURE__ */ new Date() };
        this.users.set(id, user);
        return user;
      }
      async createAnalysis(insertAnalysis) {
        const id = this.currentAnalysisId++;
        let nextSequenceNumber = 1;
        if (insertAnalysis.userId) {
          const userAnalyses = Array.from(this.analyses.values()).filter((a) => a.userId === insertAnalysis.userId && a.type === insertAnalysis.type).sort((a, b) => b.userSequenceNumber - a.userSequenceNumber);
          if (userAnalyses.length > 0) {
            nextSequenceNumber = userAnalyses[0].userSequenceNumber + 1;
          }
        }
        const analysis = {
          ...insertAnalysis,
          id,
          userSequenceNumber: nextSequenceNumber,
          originalImageUrl: insertAnalysis.originalImageUrl || null,
          analysisImageUrl: insertAnalysis.analysisImageUrl || null,
          createdAt: /* @__PURE__ */ new Date(),
          userId: insertAnalysis.userId ?? null,
          sessionId: insertAnalysis.sessionId ?? null
        };
        this.analyses.set(id, analysis);
        return analysis;
      }
      async getAnalysesByUser(userId) {
        return Array.from(this.analyses.values()).filter(
          (analysis) => analysis.userId === userId
        );
      }
      async getAnalysesBySession(sessionId) {
        return Array.from(this.analyses.values()).filter(
          (analysis) => analysis.sessionId === sessionId
        );
      }
      async getAnalysis(id) {
        return this.analyses.get(id);
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
        for (const [id, analysis] of this.analyses.entries()) {
          if (analysis.sessionId === sessionId) {
            this.analyses.delete(id);
          }
        }
        for (const [id, message] of this.chatMessages.entries()) {
          if (message.sessionId === sessionId) {
            this.chatMessages.delete(id);
          }
        }
      }
      async clearAllUsersExceptTesting() {
        const testUser = this.users.get(1);
        this.users.clear();
        if (testUser) {
          this.users.set(1, testUser);
        }
        this.currentUserId = 2;
        this.analyses.clear();
        this.chatMessages.clear();
        this.currentAnalysisId = 1;
        this.currentChatMessageId = 1;
      }
      // Helper method to get current storage status
      getStorageStatus() {
        return {
          type: "memory",
          available: true
        };
      }
    };
    DatabaseStorage = class {
      sessionStore;
      constructor() {
        this.initializeSessionStore();
        this.addTestingUser().catch(console.error);
      }
      async initializeSessionStore() {
        try {
          const { pool: pool2 } = await Promise.resolve().then(() => (init_db(), db_exports));
          if (pool2) {
            const PostgresSessionStore = connectPg(session2);
            this.sessionStore = new PostgresSessionStore({
              pool: pool2,
              createTableIfMissing: true,
              tableName: "session"
            });
            console.log("PostgreSQL session store initialized");
          } else {
            const MemoryStore = await import("memorystore").then((m) => m.default);
            this.sessionStore = new MemoryStore(session2)({
              checkPeriod: 864e5
              // 24 hours
            });
            console.log("Memory session store initialized (fallback)");
          }
        } catch (error) {
          console.warn("Session store initialization failed, using memory fallback:", error);
          const MemoryStore = await import("memorystore").then((m) => m.default);
          this.sessionStore = new MemoryStore(session2)({
            checkPeriod: 864e5
            // 24 hours
          });
        }
      }
      async addTestingUser() {
        try {
          const db2 = await this.getDb();
          const existingUser = await this.getUserByEmail("test@example.com");
          if (existingUser) {
            console.log("Testing user already exists in database");
            return;
          }
          const { scrypt: scrypt2, randomBytes: randomBytes2 } = await import("crypto");
          const { promisify: promisify2 } = await import("util");
          const scryptAsync2 = promisify2(scrypt2);
          const salt = randomBytes2(16).toString("hex");
          const buf = await scryptAsync2("password123", salt, 64);
          const hashedPassword = `${buf.toString("hex")}.${salt}`;
          const testUser = {
            username: "test_user",
            email: "test@example.com",
            password: hashedPassword
          };
          await this.createUser(testUser);
          console.log("Testing user created in database: test@example.com / password123");
        } catch (error) {
          console.warn("Failed to create testing user:", error);
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
      async createAnalysis(insertAnalysis) {
        const db2 = await this.getDb();
        let nextSequenceNumber = 1;
        if (insertAnalysis.userId) {
          const userAnalyses = await db2.select().from(analyses).where(and(eq(analyses.userId, insertAnalysis.userId), eq(analyses.type, insertAnalysis.type))).orderBy(desc(analyses.userSequenceNumber));
          if (userAnalyses.length > 0) {
            nextSequenceNumber = userAnalyses[0].userSequenceNumber + 1;
          }
        }
        const analysisData = {
          ...insertAnalysis,
          userSequenceNumber: nextSequenceNumber
        };
        const [analysis] = await db2.insert(analyses).values(analysisData).returning();
        return analysis;
      }
      async getAnalysesByUser(userId) {
        try {
          const db2 = await this.getDb();
          return await db2.select().from(analyses).where(eq(analyses.userId, userId)).orderBy(desc(analyses.createdAt));
        } catch (error) {
          console.error("Database getAnalysesByUser error:", error);
          throw error;
        }
      }
      async getAnalysesBySession(sessionId) {
        const db2 = await this.getDb();
        return await db2.select().from(analyses).where(eq(analyses.sessionId, sessionId)).orderBy(desc(analyses.createdAt));
      }
      async getAnalysis(id) {
        const db2 = await this.getDb();
        const [analysis] = await db2.select().from(analyses).where(eq(analyses.id, id));
        return analysis || void 0;
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
        return await db2.select().from(chatMessages).where(eq(chatMessages.userId, null)).orderBy(desc(chatMessages.createdAt)).limit(limit);
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
        await db2.delete(analyses).where(eq(analyses.sessionId, sessionId));
        await db2.delete(chatMessages).where(eq(chatMessages.sessionId, sessionId));
      }
      async clearAllUsersExceptTesting() {
        const db2 = await this.getDb();
        await db2.delete(users);
        await db2.delete(analyses);
        await db2.delete(chatMessages);
        await this.addTestingUser();
      }
      // Helper method to get current storage status
      getStorageStatus() {
        return {
          type: this.isDatabaseAvailable ? "database" : "memory",
          available: this.isDatabaseAvailable
        };
      }
    };
    HybridStorage = class {
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
            this.databaseStorage.getDb().then((db2) => db2.execute("SELECT 1")),
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
      async createAnalysis(analysis) {
        if (this.isDatabaseAvailable && this.databaseStorage) {
          try {
            return await this.databaseStorage.createAnalysis(analysis);
          } catch (error) {
            console.warn("Database createAnalysis failed, falling back to memory:", error);
            this.isDatabaseAvailable = false;
          }
        }
        return await this.memoryStorage.createAnalysis(analysis);
      }
      async getAnalysesByUser(userId) {
        if (this.isDatabaseAvailable && this.databaseStorage) {
          try {
            return await this.databaseStorage.getAnalysesByUser(userId);
          } catch (error) {
            console.warn("Database getAnalysesByUser failed, falling back to memory:", error);
            this.isDatabaseAvailable = false;
          }
        }
        return await this.memoryStorage.getAnalysesByUser(userId);
      }
      async getAnalysis(id) {
        if (this.isDatabaseAvailable && this.databaseStorage) {
          try {
            return await this.databaseStorage.getAnalysis(id);
          } catch (error) {
            console.warn("Database getAnalysis failed, falling back to memory:", error);
            this.isDatabaseAvailable = false;
          }
        }
        return await this.memoryStorage.getAnalysis(id);
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
      async getAnalysesBySession(sessionId) {
        if (this.isDatabaseAvailable && this.databaseStorage) {
          try {
            return await this.databaseStorage.getAnalysesBySession(sessionId);
          } catch (error) {
            console.warn("Database getAnalysesBySession failed, falling back to memory:", error);
            this.isDatabaseAvailable = false;
          }
        }
        return await this.memoryStorage.getAnalysesBySession(sessionId);
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
      async clearAllUsersExceptTesting() {
        if (this.isDatabaseAvailable && this.databaseStorage) {
          try {
            await this.databaseStorage.clearAllUsersExceptTesting();
            return;
          } catch (error) {
            console.warn("Database clearAllUsersExceptTesting failed, falling back to memory:", error);
            this.isDatabaseAvailable = false;
          }
        }
        await this.memoryStorage.clearAllUsersExceptTesting();
      }
      // Helper method to get current storage status
      getStorageStatus() {
        return {
          type: this.isDatabaseAvailable ? "database" : "memory",
          available: true
        };
      }
    };
    storage = (() => {
      const databaseUrl = getDatabaseUrl2();
      if (databaseUrl) {
        console.log("\u2713 DATABASE_URL found - using hybrid storage with PostgreSQL fallback");
        return new HybridStorage();
      }
      console.log("Using memory storage for development");
      return new MemStorage();
    })();
  }
});

// server/ai-service.ts
var ai_service_exports = {};
__export(ai_service_exports, {
  analyzeFaultsWithAI: () => analyzeFaultsWithAI,
  analyzeInstallationWithAI: () => analyzeInstallationWithAI,
  classifyImage: () => classifyImage
});
import * as fs from "fs";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
function validateImage(imagePath) {
  try {
    const stats = fs.statSync(imagePath);
    const fileSizeInMB = stats.size / (1024 * 1024);
    if (fileSizeInMB > 8) {
      console.warn(`Image size ${fileSizeInMB.toFixed(2)}MB exceeds 8MB performance limit`);
      return false;
    }
    fs.accessSync(imagePath, fs.constants.R_OK);
    const buffer = fs.readFileSync(imagePath, { flag: "r" });
    if (buffer.length === 0) {
      console.error("Image file is empty or corrupted");
      return false;
    }
    return true;
  } catch (error) {
    console.error("Image validation failed:", error);
    return false;
  }
}
async function classifyImage(imagePath, expectedType) {
  try {
    console.log(`Classifying image for ${expectedType} content`);
    const stats = fs.statSync(imagePath);
    const cacheKey = `${stats.size}-${stats.mtime.getTime()}-${expectedType}`;
    const cached = classificationCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      console.log("Using cached classification result");
      return cached.result;
    }
    const now = Date.now();
    for (const [key, entry] of classificationCache.entries()) {
      if (now - entry.timestamp > CACHE_DURATION) {
        classificationCache.delete(key);
      }
    }
    const imageBytes = fs.readFileSync(imagePath);
    const mimeType = getMimeType(imagePath);
    const classificationPrompt = expectedType === "rooftop" ? `Analyze this image quickly. Reply with JSON: {"isValid": boolean, "reason": string}
         
         VALID if shows: rooftop, building roof, house exterior with roof visible.
         INVALID if shows: no roof, indoors, people, cars, landscapes, existing solar panels.` : `Analyze this image quickly. Reply with JSON: {"isValid": boolean, "reason": string}
         
         VALID if shows: solar panels, photovoltaic modules, solar arrays.
         INVALID if shows: no solar panels, rooftops only, other objects.`;
    const result = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: [
        {
          parts: [
            { text: classificationPrompt },
            {
              inlineData: {
                mimeType,
                data: imageBytes.toString("base64")
              }
            }
          ]
        }
      ],
      generationConfig: {
        maxOutputTokens: 50,
        // Reduced tokens for faster classification
        temperature: 0.1,
        // Lower temperature for faster responses
        topP: 0.9
        // Optimized for efficiency
      }
    });
    const responseText = result.text;
    console.log("AI Classification Response:", responseText);
    const cleanedText = responseText.replace(/```json\n?|```\n?/g, "").trim();
    const result_data = JSON.parse(cleanedText);
    console.log("Classification result:", result_data);
    const isValid = result_data.isValid === true;
    classificationCache.set(cacheKey, {
      result: isValid,
      timestamp: Date.now(),
      type: expectedType
    });
    return isValid;
  } catch (error) {
    console.error("Image classification failed:", error);
    console.log("Classification error - allowing image to proceed with analysis");
    return true;
  }
}
function getMimeType(imagePath) {
  const extension = imagePath.toLowerCase().split(".").pop();
  switch (extension) {
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    case "png":
      return "image/png";
    case "webp":
      return "image/webp";
    default:
      return "image/jpeg";
  }
}
async function analyzeInstallationWithAI(imagePath, roofInput) {
  console.log("Starting AI-powered installation analysis");
  const maxRetries = 3;
  let lastError;
  if (!validateImage(imagePath)) {
    console.error("Image validation failed");
    throw new Error("Invalid image format. Please upload a valid image file.");
  }
  console.log("Validating image content for rooftop analysis...");
  const isValidRooftop = await classifyImage(imagePath, "rooftop");
  if (!isValidRooftop) {
    console.error("Image classification failed: Not a valid rooftop image");
    throw new Error("This image does not show a rooftop suitable for solar panel installation. Please upload an image showing a building roof from above or at an angle.");
  }
  console.log("Image validation passed: Valid rooftop detected");
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`AI analysis attempt ${attempt}/${maxRetries}`);
      const imageBytes = fs.readFileSync(imagePath);
      const mimeType = getMimeType(imagePath);
      let panelSizeAdjustment = "";
      if (roofInput?.roofSize) {
        const roofSize = parseInt(roofInput.roofSize);
        if (roofSize < 800) {
          panelSizeAdjustment = "Small roof detected - use smaller panel dimensions (0.06-0.08 width, 0.04-0.06 height)";
        } else if (roofSize > 2e3) {
          panelSizeAdjustment = "Large roof detected - use standard panel dimensions (0.08-0.10 width, 0.06-0.08 height)";
        } else {
          panelSizeAdjustment = "Medium roof detected - use medium panel dimensions (0.07-0.09 width, 0.05-0.07 height)";
        }
      }
      const roofInputInfo = roofInput ? `
      USER-PROVIDED ROOF INFORMATION:
      - Roof Size: ${roofInput.roofSize ? `${roofInput.roofSize} sq ft` : "Auto-detect from image"}
      - Roof Shape: ${roofInput.roofShape}
      - Panel Size Preference: ${roofInput.panelSize}
      ${panelSizeAdjustment ? `- Panel Size Adjustment: ${panelSizeAdjustment}` : ""}
      
      INSTRUCTIONS: Use this information to cross-validate your image analysis. If provided roof size differs significantly from your visual estimate, note the discrepancy and use the user's input as the primary reference.
      ` : "";
      const installationPrompt = `
      You are a solar panel expert analyzing rooftop images. Provide ONLY basic roof data - no panel placement or calculations.
      
      REQUIRED ANALYSIS:
      
      1. ROOF MEASUREMENTS
      - Estimate total roof area in square feet
      - Calculate usable roof area (after removing obstructions and clearances)
      - Recommend optimal panel count based on roof size and suitability
      
      2. ORIENTATION ANALYSIS
      - Identify primary roof orientation (south, southeast, southwest, east, west, northeast, northwest, north)
      - Explain which roof faces receive best sun exposure
      
      3. ROOF CONDITIONS
      - Analyze roof pitch (flat, low, optimal, steep, very_steep)
      - Assess shading impact (none, minimal, light, moderate, heavy, severe)
      - Identify roof type and material
      
      4. INSTALLATION NOTES
      - Safety considerations for this roof type
      - Special requirements for roof material
      - Clearance and obstruction recommendations

      ${roofInputInfo}

      IMPORTANT: Do NOT create panel regions or coordinates. Only provide roof analysis data.
      
      Respond with this EXACT JSON structure:
      {
        "primaryOrientation": "<select from: south, southeast, southwest, east, west, northeast, northwest, north>",
        "pitchCategory": "<select from: flat, low, optimal, steep, very_steep>",
        "shadingLevel": "<select from: none, minimal, light, moderate, heavy, severe>",
        "orientationAnalysis": "<detailed orientation analysis explaining best roof faces>",
        "shadingAnalysis": "<detailed shading analysis with timing and seasonal effects>",
        "notes": "<installation notes with bullet points for clearances and safety>",
        "roofType": "<detected roof type>",
        "estimatedRoofArea": <integer in sq ft>,
        "usableRoofArea": <integer in sq ft after obstructions>,
        "recommendedPanels": <integer - optimal panel count for this roof>,
        "confidence": <percentage as integer>
      }
      
      Focus on roof analysis only. Backend will handle all calculations.`;
      const result = await ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: [
          {
            parts: [
              { text: installationPrompt },
              {
                inlineData: {
                  mimeType,
                  data: imageBytes.toString("base64")
                }
              }
            ]
          }
        ]
      });
      const responseText = result.text;
      console.log("AI Installation Response:", responseText);
      const cleanedText = responseText.replace(/```json\n?|```\n?/g, "").trim();
      const aiResult = JSON.parse(cleanedText);
      const finalPanelCount = aiResult.recommendedPanels || 4;
      console.log(`AI Roof Analysis: ${finalPanelCount} panels recommended, ${aiResult.primaryOrientation} orientation, ${aiResult.pitchCategory} pitch, ${aiResult.shadingLevel} shading`);
      const finalRoofArea = roofInput?.roofSize ? parseInt(roofInput.roofSize) : aiResult.usableRoofArea;
      const PANEL_AREA = 21.125;
      const PANEL_POWER = 0.4;
      const coveragePercentage = Math.round(finalRoofArea / aiResult.estimatedRoofArea * 100 * 100) / 100;
      const powerOutputKW = finalPanelCount * PANEL_POWER;
      let efficiencyScore = 75;
      if (aiResult.primaryOrientation === "south") efficiencyScore = 90;
      else if (aiResult.primaryOrientation === "southeast" || aiResult.primaryOrientation === "southwest") efficiencyScore = 85;
      else if (aiResult.primaryOrientation === "east" || aiResult.primaryOrientation === "west") efficiencyScore = 75;
      else efficiencyScore = 65;
      if (aiResult.pitchCategory === "optimal") efficiencyScore += 5;
      else if (aiResult.pitchCategory === "steep" || aiResult.pitchCategory === "flat") efficiencyScore -= 5;
      if (aiResult.shadingLevel === "none") efficiencyScore += 5;
      else if (aiResult.shadingLevel === "minimal") efficiencyScore += 2;
      else if (aiResult.shadingLevel === "light") efficiencyScore -= 2;
      else if (aiResult.shadingLevel === "moderate") efficiencyScore -= 10;
      else efficiencyScore -= 20;
      efficiencyScore = Math.max(60, Math.min(95, efficiencyScore));
      const generatedRegions = [];
      const panelWidth = 0.08;
      const panelHeight = 0.06;
      const minSpacing = 0.02;
      const safeRoofAreas = [
        // Expanded roof sections for better utilization
        { x: 0.15, y: 0.25, width: 0.35, height: 0.35 },
        // Left main section
        { x: 0.55, y: 0.25, width: 0.35, height: 0.35 },
        // Right main section
        { x: 0.2, y: 0.65, width: 0.6, height: 0.2 },
        // Lower section (expanded)
        { x: 0.25, y: 0.15, width: 0.5, height: 0.08 }
        // Upper section (new)
      ];
      let totalRoofCapacity = 0;
      for (const area of safeRoofAreas) {
        const panelsPerRow = Math.floor(area.width / (panelWidth + minSpacing));
        const panelsPerCol = Math.floor(area.height / (panelHeight + minSpacing));
        totalRoofCapacity += panelsPerRow * panelsPerCol;
      }
      const optimalPanelCount = Math.min(finalPanelCount, totalRoofCapacity);
      let panelsPlaced = 0;
      for (const area of safeRoofAreas) {
        if (panelsPlaced >= optimalPanelCount) break;
        const panelsPerRow = Math.floor(area.width / (panelWidth + minSpacing));
        const panelsPerCol = Math.floor(area.height / (panelHeight + minSpacing));
        for (let row = 0; row < panelsPerCol && panelsPlaced < optimalPanelCount; row++) {
          for (let col = 0; col < panelsPerRow && panelsPlaced < optimalPanelCount; col++) {
            const panelX = area.x + col * (panelWidth + minSpacing);
            const panelY = area.y + row * (panelHeight + minSpacing);
            if (panelX + panelWidth <= area.x + area.width && panelY + panelHeight <= area.y + area.height) {
              generatedRegions.push({
                x: panelX,
                y: panelY,
                width: panelWidth,
                height: panelHeight
              });
              panelsPlaced++;
            }
          }
        }
      }
      const actualPanelsPlaced = generatedRegions.length;
      if (actualPanelsPlaced < finalPanelCount) {
        console.log(`Adjusted panel count from ${finalPanelCount} to ${actualPanelsPlaced} due to roof constraints`);
      }
      const finalActualPanelCount = actualPanelsPlaced;
      const finalPowerOutputKW = finalActualPanelCount * PANEL_POWER;
      const finalCoveragePercentage = coveragePercentage;
      console.log(`Backend Calculations: ${finalActualPanelCount} panels placed on roof, ${finalCoveragePercentage}% coverage, ${finalPowerOutputKW}kW power, ${efficiencyScore}% efficiency`);
      const result_data = {
        totalPanels: finalActualPanelCount,
        coverage: finalCoveragePercentage,
        powerOutput: finalPowerOutputKW,
        efficiency: efficiencyScore,
        confidence: aiResult.confidence,
        orientation: aiResult.orientationAnalysis,
        shadingAnalysis: aiResult.shadingAnalysis,
        notes: aiResult.notes,
        roofType: aiResult.roofType,
        estimatedRoofArea: aiResult.estimatedRoofArea,
        usableRoofArea: finalRoofArea,
        obstructions: [],
        regions: generatedRegions
      };
      console.log("Installation analysis completed successfully");
      return result_data;
    } catch (error) {
      console.error("Installation analysis failed:", error);
      lastError = error;
      if (attempt === maxRetries) {
        console.error("AI analysis failed after all retries, no fallback available");
        throw new Error("AI analysis service is currently unavailable. Please try again later or contact support.");
      }
      await new Promise((resolve) => setTimeout(resolve, 1e3 * attempt));
    }
  }
  throw new Error("AI analysis service is currently unavailable. Please try again later or contact support.");
}
async function analyzeFaultsWithAI(imagePath, originalFilename) {
  console.log("Starting AI-powered fault detection analysis");
  const maxRetries = 3;
  let lastError;
  if (!validateImage(imagePath)) {
    console.error("Image validation failed");
    throw new Error("Invalid image format. Please upload a valid image file.");
  }
  console.log("Validating image content for solar panel analysis...");
  const isValidSolarPanel = await classifyImage(imagePath, "solar-panel");
  if (!isValidSolarPanel) {
    console.error("Image classification failed: Not a valid solar panel image");
    throw new Error("This image does not show solar panels suitable for fault detection. Please upload an image showing solar panels or photovoltaic equipment.");
  }
  console.log("Image validation passed: Valid solar panel detected");
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`AI analysis attempt ${attempt}/${maxRetries}`);
      const imageBytes = fs.readFileSync(imagePath);
      const mimeType = getMimeType(imagePath);
      const panelId = originalFilename ? originalFilename.replace(/\.[^/.]+$/, "") : `Panel-${Date.now().toString().slice(-3)}`;
      const faultPrompt = `
      You are a certified solar panel inspection expert with 20+ years of experience in photovoltaic system diagnostics. Analyze this solar panel image with extreme precision and identify ALL visible faults, defects, or performance issues.

      PANEL IDENTIFICATION: ${panelId}

      MANDATORY FAULT DETECTION PROTOCOL:

      STEP 1: VISUAL INSPECTION CHECKLIST
      Examine the solar panel systematically for:
      
      PHYSICAL DAMAGE:
      - Cracks: hairline, spider web, stress fractures, or complete breaks
      - Chips: missing pieces, edge damage, or impact marks
      - Delamination: bubbling, peeling, or separation of layers
      - Cell damage: broken cells, burned spots, or discoloration
      - Frame damage: bent corners, loose mounting, or corrosion
      
      PERFORMANCE ISSUES:
      - Hot spots: darker regions indicating electrical problems
      - Shading: partial or complete obstruction from debris, dirt, or objects
      - Soiling: dust, dirt, bird droppings, or organic growth
      - Discoloration: yellowing, browning, or unusual color variations
      - Micro-cracks: barely visible hairline fractures
      
      ELECTRICAL CONCERNS:
      - Burn marks: indicating electrical arcing or overheating
      - Corrosion: metal oxidation or deterioration
      - Connection issues: loose wiring or damaged junction boxes
      - Bypass diode failures: irregular heat patterns
      
      STEP 2: SEVERITY ASSESSMENT
      For each fault detected, assign severity:
      - Critical: Immediate safety hazard, total system shutdown required
      - High: Significant performance loss (>15%), urgent repair needed
      - Medium: Moderate performance impact (5-15%), schedule maintenance
      - Low: Minor cosmetic issues (<5% impact), monitor condition
      
      STEP 3: COORDINATE MAPPING
      For each fault, provide precise normalized coordinates (0-1) where:
      - x: horizontal position (0=left edge, 1=right edge)
      - y: vertical position (0=top edge, 1=bottom edge)
      - Ensure coordinates are within panel boundaries
      
      STEP 4: OVERALL HEALTH ASSESSMENT
      Determine overall panel health based on:
      - Excellent: No visible defects, optimal performance
      - Good: Minor issues, >90% performance
      - Fair: Moderate issues, 70-90% performance  
      - Poor: Significant problems, 50-70% performance
      - Critical: Dangerous condition, <50% performance
      
      STEP 5: PROFESSIONAL MAINTENANCE RECOMMENDATIONS
      Generate SPECIFIC, UNIQUE maintenance recommendations based on each detected fault type. DO NOT use generic recommendations.
      
      FOR EACH FAULT TYPE, provide tailored maintenance actions:
      
      CRACKS (all severities):
      - Critical: "Immediate system shutdown and panel replacement within 24 hours"
      - High: "Professional inspection within 1 week, assess for replacement" 
      - Medium: "Monitor crack progression monthly, schedule repair assessment"
      - Low: "Document crack pattern, inspect quarterly for expansion"
      
      DELAMINATION:
      - Critical: "Emergency panel replacement - delamination compromises electrical safety"
      - High: "Replace panel within 2 weeks to prevent moisture infiltration"
      - Medium: "Apply protective sealant if possible, replace within 6 months"
      - Low: "Monitor adhesion integrity, schedule replacement within 1 year"
      
      HOT SPOTS:
      - Critical: "Immediate electrical isolation - fire hazard present"
      - High: "Thermal imaging inspection and bypass diode replacement"
      - Medium: "Clean connections and verify wiring integrity"
      - Low: "Monitor temperature patterns during peak sun hours"
      
      SOILING/DIRT:
      - Critical: "Complete system cleaning and performance restoration"
      - High: "Professional cleaning service within 1 month"
      - Medium: "Schedule quarterly cleaning maintenance"
      - Low: "Regular monthly cleaning with soft brush and water"
      
      ELECTRICAL ISSUES:
      - Critical: "Licensed electrician inspection immediately - safety hazard"
      - High: "Certified technician diagnosis within 48 hours"
      - Medium: "Electrical connection audit and cleaning"
      - Low: "Annual electrical system check and maintenance"
      
      FRAME DAMAGE:
      - Critical: "Structural assessment and immediate panel securing"
      - High: "Frame repair or panel replacement within 2 weeks"
      - Medium: "Reinforce mounting and check structural integrity"
      - Low: "Apply protective coating to prevent corrosion"
      
      Generate 3-5 specific recommendations that match the EXACT fault types detected, not generic advice.
      
      CRITICAL REQUIREMENTS:
      1. Only report faults that are clearly visible in the image
      2. Use accurate coordinate mapping within panel boundaries
      3. Provide realistic severity assessments
      4. Generate professional maintenance recommendations
      5. Base overall health on actual fault severity and quantity
      
      Respond with a JSON object matching this EXACT structure:
      {
        "panelId": "${panelId}",
        "faults": [
          {
            "type": "<fault type>",
            "severity": "<Critical|High|Medium|Low>",
            "x": <normalized coordinate 0-1>,
            "y": <normalized coordinate 0-1>,
            "description": "<detailed description>"
          }
        ],
        "overallHealth": "<Excellent|Good|Fair|Poor|Critical>",
        "recommendations": [
          "<specific recommendation 1>",
          "<specific recommendation 2>",
          "<specific recommendation 3>"
        ]
      }
      
      Remember: Your analysis will be used for actual solar panel maintenance decisions. Accuracy and safety are PARAMOUNT. Only report faults that are clearly visible and verifiable in the image.`;
      const result = await ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: [
          {
            parts: [
              { text: faultPrompt },
              {
                inlineData: {
                  mimeType,
                  data: imageBytes.toString("base64")
                }
              }
            ]
          }
        ]
      });
      const responseText = result.text;
      console.log("AI Fault Detection Response:", responseText);
      const cleanedText = responseText.replace(/```json\n?|```\n?/g, "").trim();
      const result_data = JSON.parse(cleanedText);
      console.log("Fault detection analysis successful");
      return result_data;
    } catch (error) {
      console.error("Fault detection analysis failed:", error);
      lastError = error;
      if (attempt === maxRetries) {
        console.error("AI analysis failed after all retries, no fallback available");
        throw new Error("AI analysis service is currently unavailable. Please try again later or contact support.");
      }
      await new Promise((resolve) => setTimeout(resolve, 1e3 * attempt));
    }
  }
  throw new Error("AI analysis service is currently unavailable. Please try again later or contact support.");
}
var ai, classificationCache, CACHE_DURATION;
var init_ai_service = __esm({
  "server/ai-service.ts"() {
    "use strict";
    dotenv.config();
    console.log("Initializing Google AI SDK...");
    console.log("API Key present:", !!process.env.GOOGLE_API_KEY);
    console.log("API Key length:", process.env.GOOGLE_API_KEY?.length || 0);
    ai = new GoogleGenAI(process.env.GOOGLE_API_KEY || "");
    classificationCache = /* @__PURE__ */ new Map();
    CACHE_DURATION = 60 * 60 * 1e3;
  }
});

// server/index.ts
import express2 from "express";

// server/routes.ts
init_storage();
init_schema();
init_ai_service();
init_auth();
import { createServer } from "http";
import multer from "multer";
import path from "path";
import * as fs2 from "fs";
import * as os from "os";
import { eq as eq2 } from "drizzle-orm";
async function generateSolarAdvice(message, conversationHistory = []) {
  try {
    const { GoogleGenAI: GoogleGenAI2 } = await import("@google/genai");
    const ai2 = new GoogleGenAI2({ apiKey: process.env.GOOGLE_API_KEY || "" });
    const historyContext = conversationHistory.length > 0 ? `
CONVERSATION HISTORY:
${conversationHistory.slice(-6).join("\n")}
` : "";
    const solarAdvicePrompt = `
    You are SolarScope AI, a solar panel expert. Provide SHORT, practical advice (max 60 words).

    EXPERTISE: installation, fault detection, maintenance, performance, ROI calculations, safety, Indian helplines.

    INDIAN HELPLINES:
    - MNRE: 1800-180-3333
    - SECI: 011-2436-0707  
    - Solar Mission: 1800-11-3003
    - BEE: 1800-11-2722
    - PM Surya Ghar: 1800-11-4455

    RESPONSE FORMAT: {"response": "brief advice", "category": "installation|fault|maintenance|performance|general|helpline"}

    ${historyContext}

    USER: ${message}

    Provide BRIEF advice in 60 words max.`;
    const response = await ai2.models.generateContent({
      model: "gemini-2.0-flash",
      contents: [solarAdvicePrompt],
      generationConfig: {
        maxOutputTokens: 150,
        // Limit tokens for efficiency
        temperature: 0.3,
        // Balanced for accuracy and speed
        topP: 0.8
        // Optimized response diversity
      }
    });
    const responseText = response.text;
    if (!responseText) {
      throw new Error("No response from AI");
    }
    const cleanedText = responseText.replace(/```json\s*/g, "").replace(/```\s*$/g, "").replace(/[\x00-\x1F\x7F]/g, "").trim();
    try {
      const result = JSON.parse(cleanedText);
      return {
        response: result.response || "I'm here to help with solar panel questions. Could you please provide more details about what you'd like to know?",
        category: result.category || "general"
      };
    } catch (parseError) {
      console.log("JSON parsing failed, returning cleaned text directly:", parseError);
      return {
        response: cleanedText,
        category: "general"
      };
    }
  } catch (error) {
    console.error("AI Chat generation error:", error);
    throw error;
  }
}
function saveBufferToTemp(buffer, filename) {
  const tempDir = os.tmpdir();
  const tempPath = path.join(tempDir, `solarscope-${Date.now()}-${filename}`);
  fs2.writeFileSync(tempPath, buffer);
  setTimeout(() => {
    try {
      if (fs2.existsSync(tempPath)) {
        fs2.unlinkSync(tempPath);
        console.log(`Cleaned up temporary file: ${tempPath}`);
      }
    } catch (error) {
      console.warn(`Failed to cleanup temp file ${tempPath}:`, error);
    }
  }, 10 * 60 * 1e3);
  return tempPath;
}
var upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 8 * 1024 * 1024,
    // Reduced to 8MB for better performance
    files: 1,
    // Only allow 1 file at a time
    fieldSize: 1024 * 1024
    // 1MB field size limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"));
    }
  }
});
async function registerRoutes(app) {
  setupAuth(app);
  app.get("/api/health", async (_req, res) => {
    let aiStatus = "offline";
    let aiError = null;
    let dbStatus = "disconnected";
    let dbError = null;
    try {
      const apiKey = process.env.GOOGLE_API_KEY;
      if (!apiKey || apiKey.trim() === "") {
        aiError = "Google API key not configured";
      } else if (apiKey.length < 30) {
        aiError = "Google API key appears invalid (too short)";
      } else {
        const { GoogleGenAI: GoogleGenAI2 } = await import("@google/genai");
        new GoogleGenAI2({ apiKey });
        aiStatus = "online";
      }
    } catch (error) {
      console.log("AI service check failed:", error.message);
      if (error.message?.includes("API Key") || error.message?.includes("INVALID_ARGUMENT")) {
        aiError = "Invalid or missing Google API key";
      } else {
        aiError = "AI service initialization failed";
      }
    }
    let storageType = "memory";
    try {
      if (process.env.DATABASE_URL) {
        await storage.getChatMessages(1);
        if ("getStorageStatus" in storage) {
          const storageStatus = storage.getStorageStatus();
          storageType = storageStatus.type;
          dbStatus = storageStatus.type === "database" ? "connected" : "fallback_to_memory";
          if (storageStatus.type === "memory") {
            dbError = "Database connection failed - using memory storage fallback";
          }
        } else {
          dbStatus = "connected";
          storageType = "postgresql";
        }
      } else {
        dbStatus = "not_configured";
        dbError = "DATABASE_URL not provided - using memory storage";
        storageType = "memory";
      }
    } catch (error) {
      console.warn("Database check failed:", error);
      dbStatus = "error";
      dbError = error instanceof Error ? error.message : "Database connection failed - using memory storage";
      storageType = "memory";
    }
    const overallStatus = aiStatus === "online" && (dbStatus === "connected" || dbStatus === "not_configured" || dbStatus === "fallback_to_memory") ? "healthy" : "degraded";
    res.json({
      status: overallStatus,
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      service: "SolarScope AI",
      version: "1.0.0",
      ai: {
        status: aiStatus,
        error: aiError
      },
      database: {
        status: dbStatus,
        error: dbError,
        storage_type: storageType
      }
    });
  });
  app.post("/api/clear-users", async (_req, res) => {
    try {
      await storage.clearAllUsersExceptTesting();
      res.json({
        success: true,
        message: "All users cleared except testing user",
        testing_user: {
          username: "test_user",
          email: "test@example.com",
          password: "password123"
        }
      });
    } catch (error) {
      console.error("Clear users failed:", error);
      res.status(500).json({
        error: "Failed to clear users",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });
  app.post("/api/fix-test-user", async (_req, res) => {
    try {
      const { hashPassword: hashPassword2 } = await Promise.resolve().then(() => (init_auth(), auth_exports));
      const properHash = await hashPassword2("password123");
      if ("updateUserPassword" in storage) {
        await storage.updateUserPassword("test@example.com", properHash);
      } else {
        const { db: db2 } = await Promise.resolve().then(() => (init_db(), db_exports));
        const { users: users2 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
        const { eq: eq3 } = await import("drizzle-orm");
        await db2.update(users2).set({ password: properHash }).where(eq3(users2.email, "test@example.com"));
      }
      res.json({
        success: true,
        message: "Testing user password hash fixed",
        new_hash: properHash
      });
    } catch (error) {
      console.error("Fix test user failed:", error);
      res.status(500).json({
        error: "Failed to fix test user",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });
  app.get("/api/debug/database", async (_req, res) => {
    try {
      const { db: db2, pool: pool2 } = await Promise.resolve().then(() => (init_db(), db_exports));
      if (!db2 || !pool2) {
        return res.json({
          status: "disconnected",
          error: "Database connection not available"
        });
      }
      await pool2.query("SELECT 1 as test");
      const userCountResult = await db2.select().from(users);
      const analysisCountResult = await db2.select().from(analyses);
      const chatCountResult = await db2.select().from(chatMessages);
      const sampleUsers = userCountResult.slice(0, 5).map((user) => ({
        id: user.id,
        username: user.username,
        email: user.email,
        createdAt: user.createdAt
      }));
      res.json({
        status: "connected",
        tables: {
          users: userCountResult.length,
          analyses: analysisCountResult.length,
          chatMessages: chatCountResult.length
        },
        sampleUsers,
        databaseUrl: process.env.DATABASE_URL ? "configured" : "not_configured"
      });
    } catch (error) {
      console.error("Database debug failed:", error);
      res.status(500).json({
        status: "error",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });
  app.post("/api/debug/recreate-test-user", async (_req, res) => {
    try {
      const { db: db2 } = await Promise.resolve().then(() => (init_db(), db_exports));
      if (!db2) {
        return res.json({ error: "Database not available" });
      }
      await db2.delete(users).where(eq2(users.email, "test@example.com"));
      const { scrypt: scrypt2, randomBytes: randomBytes2 } = await import("crypto");
      const { promisify: promisify2 } = await import("util");
      const scryptAsync2 = promisify2(scrypt2);
      const salt = randomBytes2(16).toString("hex");
      const buf = await scryptAsync2("password123", salt, 64);
      const hashedPassword = `${buf.toString("hex")}.${salt}`;
      const [newUser] = await db2.insert(users).values({
        username: "test_user",
        email: "test@example.com",
        password: hashedPassword
      }).returning();
      res.json({
        success: true,
        message: "Testing user recreated with correct password hash",
        user: {
          id: newUser.id,
          username: newUser.username,
          email: newUser.email,
          createdAt: newUser.createdAt
        }
      });
    } catch (error) {
      console.error("Recreate test user failed:", error);
      res.status(500).json({
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });
  app.post("/api/validate-image", upload.single("image"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No image file provided" });
      }
      const { type } = req.body;
      const tempFilePath = saveBufferToTemp(req.file.buffer, req.file.originalname || "image.jpg");
      try {
        if (!fs2.existsSync(tempFilePath)) {
          return res.status(400).json({ error: "Failed to process uploaded image" });
        }
        const stats = fs2.statSync(tempFilePath);
        const fileSizeInMB = stats.size / (1024 * 1024);
        if (fileSizeInMB > 20) {
          return res.status(400).json({
            error: `Image size ${fileSizeInMB.toFixed(2)}MB exceeds 20MB limit`
          });
        }
        const validImageTypes = ["image/jpeg", "image/jpg", "image/png", "image/tiff", "image/webp"];
        if (!validImageTypes.includes(req.file.mimetype)) {
          return res.status(400).json({
            error: "Invalid image format. Please upload JPG, PNG, or TIFF files."
          });
        }
        try {
          const { classifyImage: classifyImage2 } = await Promise.resolve().then(() => (init_ai_service(), ai_service_exports));
          const isValid = await classifyImage2(tempFilePath, type === "installation" ? "rooftop" : "solar-panel");
          if (isValid) {
            res.json({
              isValid: true,
              message: "Image validated successfully"
            });
          } else {
            res.status(400).json({
              error: type === "installation" ? "Invalid image for installation analysis. Please upload a rooftop or building image." : "Invalid image for fault detection. Please upload an image showing solar panels or photovoltaic equipment."
            });
          }
        } catch (aiError) {
          console.error("AI classification error:", aiError);
          res.json({
            isValid: true,
            message: "Image validated successfully (basic validation)"
          });
        }
      } catch (error) {
        console.error("Image validation error:", error);
        res.status(400).json({
          error: error instanceof Error ? error.message : "Image validation failed"
        });
      } finally {
        try {
          fs2.unlinkSync(tempFilePath);
        } catch (e) {
          console.error("Error cleaning up temp file:", e);
        }
      }
    } catch (error) {
      console.error("Image validation error:", error);
      res.status(500).json({ error: "Internal server error during image validation" });
    }
  });
  app.post("/api/ai/analyze-installation", async (req, res) => {
    try {
      const { imagePath } = req.body;
      const results = await analyzeInstallationWithAI(imagePath);
      res.json(results);
    } catch (error) {
      res.status(500).json({ message: "AI analysis failed", error: error instanceof Error ? error.message : "Unknown error" });
    }
  });
  app.post("/api/ai/analyze-faults", async (req, res) => {
    try {
      const { imagePath } = req.body;
      const results = await analyzeFaultsWithAI(imagePath);
      res.json(results);
    } catch (error) {
      res.status(500).json({ message: "AI analysis failed", error: error instanceof Error ? error.message : "Unknown error" });
    }
  });
  app.post("/api/analyze/installation", upload.single("image"), async (req, res) => {
    try {
      console.log("Received installation analysis request");
      console.log("File:", req.file);
      console.log("Body:", req.body);
      if (!req.file) {
        console.error("No file uploaded");
        return res.status(400).json({ message: "No image uploaded" });
      }
      const imagePath = saveBufferToTemp(req.file.buffer, req.file.originalname || "image.jpg");
      const userId = req.user ? req.user.id : null;
      const sessionId = req.user ? null : req.sessionID;
      const roofInput = {
        roofSize: req.body.roofSize ? parseInt(req.body.roofSize) : void 0,
        roofShape: req.body.roofShape || "auto-detect",
        panelSize: req.body.panelSize || "auto-optimize"
      };
      console.log("Starting installation analysis for:", imagePath);
      const results = await analyzeInstallationWithAI(imagePath, roofInput);
      console.log("Installation analysis completed successfully");
      let analysis = null;
      try {
        analysis = await storage.createAnalysis({
          userId,
          sessionId,
          type: "installation",
          imagePath,
          results
        });
        if (userId) {
          console.log("Analysis stored successfully for user:", userId);
        } else {
          console.log("Analysis stored successfully for session:", sessionId);
        }
      } catch (dbError) {
        console.warn("Database storage failed, continuing with AI results:", dbError);
      }
      res.json({ analysis, results });
    } catch (error) {
      console.error("Installation analysis error:", error);
      res.status(500).json({ message: "Analysis failed", error: error instanceof Error ? error.message : "Unknown error" });
    }
  });
  app.post("/api/analyze/fault-detection", upload.single("image"), async (req, res) => {
    try {
      console.log("Received fault detection request");
      console.log("File:", req.file);
      console.log("Body:", req.body);
      if (!req.file) {
        console.error("No file uploaded");
        return res.status(400).json({ message: "No image uploaded" });
      }
      const imagePath = saveBufferToTemp(req.file.buffer, req.file.originalname || "image.jpg");
      const userId = req.user ? req.user.id : null;
      const sessionId = req.user ? null : req.sessionID;
      console.log("Starting AI fault analysis for:", imagePath);
      const results = await analyzeFaultsWithAI(imagePath, req.file.originalname);
      console.log("AI fault analysis completed:", results);
      let analysis = null;
      try {
        analysis = await storage.createAnalysis({
          userId,
          sessionId,
          type: "fault-detection",
          imagePath,
          results
        });
        if (userId) {
          console.log("Fault analysis stored successfully for user:", userId);
        } else {
          console.log("Fault analysis stored successfully for session:", sessionId);
        }
      } catch (dbError) {
        console.warn("Database storage failed, continuing with AI results:", dbError);
      }
      res.json({ analysis, results });
    } catch (error) {
      console.error("Fault detection error:", error);
      res.status(500).json({ message: "Analysis failed", error: error instanceof Error ? error.message : "Unknown error" });
    }
  });
  app.get("/api/analyses", async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Authentication required" });
      }
      const analyses2 = await storage.getAnalysesByUser(req.user.id);
      res.json(analyses2);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch analyses", error: error instanceof Error ? error.message : "Unknown error" });
    }
  });
  app.get("/api/analyses/session", async (req, res) => {
    try {
      const analyses2 = await storage.getAnalysesBySession(req.sessionID);
      res.json(analyses2);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch session analyses", error: error instanceof Error ? error.message : "Unknown error" });
    }
  });
  app.get("/api/analyses/:userId", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const analyses2 = await storage.getAnalysesByUser(userId);
      res.json(analyses2);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch analyses", error: error instanceof Error ? error.message : "Unknown error" });
    }
  });
  app.get("/api/analysis/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const analysis = await storage.getAnalysis(id);
      if (!analysis) {
        return res.status(404).json({ message: "Analysis not found" });
      }
      res.json(analysis);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch analysis", error: error instanceof Error ? error.message : "Unknown error" });
    }
  });
  app.get("/api/chat/messages", async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit) : 50;
      if (req.user) {
        const messages = await storage.getChatMessagesByUser(req.user.id, limit);
        res.json(messages);
      } else {
        const messages = await storage.getChatMessagesBySession(req.sessionID, limit);
        res.json(messages);
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch chat messages", error: error instanceof Error ? error.message : "Unknown error" });
    }
  });
  app.post("/api/chat/send", async (req, res) => {
    try {
      const { message, category = "general" } = req.body;
      if (!message || !message.trim()) {
        return res.status(400).json({ message: "Message content is required" });
      }
      const userId = req.user?.id || null;
      const username = req.user?.username || "Anonymous";
      const sessionId = req.user ? null : req.sessionID;
      const chatMessage = await storage.createChatMessage({
        userId,
        sessionId,
        username,
        message: message.trim(),
        type: "user",
        category
      });
      res.json(chatMessage);
    } catch (error) {
      res.status(500).json({ message: "Failed to send message", error: error instanceof Error ? error.message : "Unknown error" });
    }
  });
  app.post("/api/ai/chat", async (req, res) => {
    try {
      const { message, conversationHistory } = req.body;
      if (!message || !message.trim()) {
        return res.status(400).json({ message: "Message content is required" });
      }
      console.log("AI Chat request received:", message);
      const userId = req.user?.id || null;
      const sessionId = req.user ? null : req.sessionID;
      let userMessage = null;
      try {
        userMessage = await storage.createChatMessage({
          userId,
          sessionId,
          username: req.user?.username || "Anonymous",
          message: message.trim(),
          type: "user",
          category: "general"
        });
        if (userId) {
          console.log("User message stored in database for user:", userId);
        } else {
          console.log("User message stored in database for session:", sessionId);
        }
      } catch (dbError) {
        console.warn("Failed to store user message in database:", dbError);
      }
      const aiResponse = await generateSolarAdvice(message.trim(), conversationHistory || []);
      let aiMessage = null;
      try {
        aiMessage = await storage.createChatMessage({
          userId,
          sessionId,
          username: "AI Assistant",
          message: aiResponse.response,
          type: "ai",
          category: aiResponse.category
        });
        if (userId) {
          console.log("AI response stored in database for user:", userId);
        } else {
          console.log("AI response stored in database for session:", sessionId);
        }
      } catch (dbError) {
        console.warn("Failed to store AI response in database:", dbError);
      }
      res.json(aiResponse);
    } catch (error) {
      console.error("AI Chat error:", error);
      res.status(500).json({
        error: "AI service temporarily unavailable. Please try again later.",
        category: "error"
      });
    }
  });
  app.post("/api/clear-session", async (req, res) => {
    try {
      await storage.clearSessionData(req.sessionID);
      res.json({ message: "Session data cleared successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to clear session data", error: error instanceof Error ? error.message : "Unknown error" });
    }
  });
  const httpServer = createServer(app);
  return httpServer;
}

// server/vite.ts
import express from "express";
import fs3 from "fs";
import path3 from "path";
import { createServer as createViteServer, createLogger } from "vite";

// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path2 from "path";
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
      "@": path2.resolve(import.meta.dirname, "client", "src"),
      "@shared": path2.resolve(import.meta.dirname, "shared"),
      "@assets": path2.resolve(import.meta.dirname, "attached_assets")
    }
  },
  root: path2.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path2.resolve(import.meta.dirname, "dist/public"),
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
      const clientTemplate = path3.resolve(
        import.meta.dirname,
        "..",
        "client",
        "index.html"
      );
      let template = await fs3.promises.readFile(clientTemplate, "utf-8");
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
  const distPath = path3.resolve(import.meta.dirname, "public");
  if (!fs3.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }
  app.use(express.static(distPath));
  app.use("*", (_req, res) => {
    res.sendFile(path3.resolve(distPath, "index.html"));
  });
}

// server/index.ts
init_db();
init_storage();
import dotenv2 from "dotenv";
dotenv2.config();
function createServer2() {
  const app = express2();
  app.use(express2.json());
  app.use(express2.urlencoded({ extended: false }));
  app.use((req, res, next) => {
    const start = Date.now();
    const path4 = req.path;
    let capturedJsonResponse = void 0;
    const originalResJson = res.json;
    res.json = function(bodyJson, ...args) {
      capturedJsonResponse = bodyJson;
      return originalResJson.apply(res, [bodyJson, ...args]);
    };
    res.on("finish", () => {
      const duration = Date.now() - start;
      if (path4.startsWith("/api")) {
        let logLine = `${req.method} ${path4} ${res.statusCode} in ${duration}ms`;
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
    log(`Database connection: ${isDatabaseConnected ? "\u2713 Connected" : "\u2717 Not connected"}`);
    log(`Storage type: ${storageStatus.type}`);
    const app = createServer2();
    const server = await registerRoutes(app);
    if (app.get("env") === "development") {
      await setupVite(app, server);
    } else {
      serveStatic(app);
    }
    const port = 5e3;
    const host = "0.0.0.0";
    const canReuse = process.platform !== "win32";
    server.listen(
      {
        port,
        host,
        ...canReuse ? { reusePort: true } : {}
      },
      () => {
        log(`serving on http://${host}:${port}`);
      }
    );
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
  console.log(`Database connection: ${isDatabaseConnected ? "\u2713 Connected" : "\u2717 Not connected"}`);
  console.log(`Storage type: ${storageStatus.type}`);
  const app = createServer2();
  const server = await registerRoutes(app);
  serveStatic(app);
  const port = process.env.PORT || 1e4;
  const host = "0.0.0.0";
  server.listen(port, host, () => {
    console.log(`\u{1F680} SolarScope AI server running on port ${port}`);
    console.log(`\u{1F310} Health check available at: http://${host}:${port}/api/health`);
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
  createServer2 as createServer,
  startProductionServer
};
