import { households, energyReadings, energyTrades, users, chatMessages, type User, type InsertUser, type Household, type InsertHousehold, type EnergyReading, type InsertEnergyReading, type EnergyTrade, type InsertEnergyTrade, type ChatMessage, type InsertChatMessage } from "@shared/schema";
import { eq, desc, count, ne, and } from "drizzle-orm";
import { readFileSync } from 'fs';
import { join } from 'path';
import session from "express-session";
import createMemoryStore from "memorystore";
import connectPg from "connect-pg-simple";
import { config } from "dotenv";

// Load environment variables before storage initialization
config();

function getDatabaseUrl(): string | null {
  // Use DATABASE_URL environment variable directly
  return process.env.DATABASE_URL || null;
}

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  createHousehold(household: InsertHousehold): Promise<Household>;
  getHouseholdsByUser(userId: number): Promise<Household[]>;
  getHousehold(id: number): Promise<Household | undefined>;
  updateHousehold(id: number, updates: Partial<Household>): Promise<Household | undefined>;
  getHouseholdsWithUsers(): Promise<(Household & { user: Pick<User, 'phone' | 'state' | 'district'> })[]>;
  createEnergyReading(reading: InsertEnergyReading): Promise<EnergyReading>;
  getEnergyReadingsByHousehold(householdId: number, limit?: number): Promise<EnergyReading[]>;
  createEnergyTrade(trade: InsertEnergyTrade): Promise<EnergyTrade>;
  getEnergyTrades(limit?: number): Promise<EnergyTrade[]>;
  getEnergyTradesByHousehold(householdId: number, limit?: number): Promise<EnergyTrade[]>;
  updateEnergyTradeStatus(id: number, status: string): Promise<EnergyTrade | undefined>;
  listHouseholds(): Promise<Household[]>;
  createChatMessage(message: InsertChatMessage): Promise<ChatMessage>;
  getChatMessages(limit?: number): Promise<ChatMessage[]>;
  getChatMessagesByUser(userId: number, limit?: number): Promise<ChatMessage[]>;
  getChatMessagesBySession(sessionId: string, limit?: number): Promise<ChatMessage[]>;
  clearSessionData(sessionId: string): Promise<void>;
  clearAllUsersExceptTesting(): Promise<void>;
  sessionStore: any;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private households: Map<number, Household>;
  private energyReadings: Map<number, EnergyReading>;
  private energyTrades: Map<number, EnergyTrade>;
  private chatMessages: Map<number, ChatMessage>;
  private currentUserId: number;
  private currentHouseholdId: number;
  private currentEnergyReadingId: number;
  private currentEnergyTradeId: number;
  private currentChatMessageId: number;
  public sessionStore: any;

  constructor() {
    this.users = new Map();
    this.households = new Map();
    this.energyReadings = new Map();
    this.energyTrades = new Map();
    this.chatMessages = new Map();
    this.currentUserId = 1;
    this.currentHouseholdId = 1;
    this.currentEnergyReadingId = 1;
    this.currentEnergyTradeId = 1;
    this.currentChatMessageId = 1;
    
    // Initialize memory session store
    const MemoryStore = createMemoryStore(session);
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000, // 24 hours
    });
    
    // Add demo credentials for easy website access
    this.addTestingUser();
    this.addDemoCredentials();
  }

  private async addTestingUser() {
    // Add a testing user for development
    const { hashPassword } = await import("./auth");
    const hashedPassword = await hashPassword("password123");
    
    const testUser: User = {
      id: 1,
      username: 'test_user',
      email: 'test@example.com',
      password: hashedPassword,
      phone: null,
      state: null,
      district: null,
      createdAt: new Date()
    };
    this.users.set(testUser.id, testUser);
    this.currentUserId = 2; // Next user will get ID 2
  }

  private async addDemoCredentials() {
    // Create demo user with complete trading profile
    const { hashPassword } = await import("./auth");
    const hashedPassword = await hashPassword("demo123");
    
    const demoUser: User = {
      id: 2,
      username: 'demo_trader',
      email: 'demo@solarsense.com',
      password: hashedPassword,
      phone: '+1-555-0123',
      state: 'California',
      district: 'Los Angeles',
      createdAt: new Date()
    };
    this.users.set(demoUser.id, demoUser);

    // Create demo household for trading
    const demoHousehold: Household = {
      id: 1,
      userId: demoUser.id,
      name: 'Demo Solar Home',
      address: '123 Solar Street, Los Angeles, CA',
      solarCapacity: 8000, // 8kW system
      batteryCapacity: 15, // 15kWh Tesla Powerwall
      currentBatteryLevel: 85,
      isOnline: true,
      coordinates: null,
      createdAt: new Date()
    };
    this.households.set(demoHousehold.id, demoHousehold);
    
    this.currentUserId = 3; // Next user will get ID 3
    this.currentHouseholdId = 2; // Next household will get ID 2
  }

  private addInitialChatMessages() {
    // No fake messages - chat starts empty for authentic user experience
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.email === email,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = { ...insertUser, id, createdAt: new Date() };
    this.users.set(id, user);
    return user;
  }

  async createHousehold(insertHousehold: InsertHousehold): Promise<Household> {
    const id = this.currentHouseholdId++;
    const household: Household = { 
      ...insertHousehold, 
      id, 
      isOnline: true,
      currentBatteryLevel: insertHousehold.currentBatteryLevel || 50,
      coordinates: insertHousehold.coordinates || null,
      createdAt: new Date() 
    };
    this.households.set(id, household);
    return household;
  }

  async getHouseholdsByUser(userId: number): Promise<Household[]> {
    return Array.from(this.households.values()).filter(
      (household) => household.userId === userId,
    );
  }

  async getHousehold(id: number): Promise<Household | undefined> {
    return this.households.get(id);
  }

  async getHouseholdsWithUsers(): Promise<(Household & { user: Pick<User, 'phone' | 'state' | 'district'> })[]> {
    const householdsWithUsers = [];
    for (const household of this.households.values()) {
      const user = this.users.get(household.userId);
      if (user) {
        householdsWithUsers.push({
          ...household,
          user: {
            phone: user.phone,
            state: user.state,
            district: user.district,
          }
        });
      }
    }
    return householdsWithUsers;
  }

  async updateHousehold(id: number, updates: Partial<Household>): Promise<Household | undefined> {
    const household = this.households.get(id);
    if (!household) return undefined;
    
    const updated = { ...household, ...updates };
    this.households.set(id, updated);
    return updated;
  }

  async listHouseholds(): Promise<Household[]> {
    return Array.from(this.households.values());
  }

  async createEnergyReading(insertReading: InsertEnergyReading): Promise<EnergyReading> {
    const id = this.currentEnergyReadingId++;
    const reading: EnergyReading = { 
      ...insertReading, 
      id, 
      timestamp: new Date(),
      weatherCondition: insertReading.weatherCondition || null,
      temperature: insertReading.temperature || null,
    };
    this.energyReadings.set(id, reading);
    return reading;
  }

  async getEnergyReadingsByHousehold(householdId: number, limit: number = 50): Promise<EnergyReading[]> {
    const readings = Array.from(this.energyReadings.values())
      .filter(reading => reading.householdId === householdId)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    
    return readings.slice(0, limit);
  }

  async createEnergyTrade(insertTrade: InsertEnergyTrade): Promise<EnergyTrade> {
    const id = this.currentEnergyTradeId++;
    const trade: EnergyTrade = { 
      ...insertTrade, 
      id, 
      status: 'pending',
      createdAt: new Date(),
      completedAt: null,
      buyerHouseholdId: insertTrade.buyerHouseholdId || null,
    };
    this.energyTrades.set(id, trade);
    return trade;
  }

  async getEnergyTrades(limit: number = 50): Promise<EnergyTrade[]> {
    const trades = Array.from(this.energyTrades.values())
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    
    return trades.slice(0, limit);
  }

  async getEnergyTradesByHousehold(householdId: number, limit: number = 50): Promise<EnergyTrade[]> {
    const trades = Array.from(this.energyTrades.values())
      .filter(trade => trade.sellerHouseholdId === householdId || trade.buyerHouseholdId === householdId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    
    return trades.slice(0, limit);
  }

  async updateEnergyTradeStatus(id: number, status: string): Promise<EnergyTrade | undefined> {
    const trade = this.energyTrades.get(id);
    if (!trade) return undefined;
    
    const updated = { 
      ...trade, 
      status, 
      completedAt: status === 'completed' ? new Date() : trade.completedAt 
    };
    this.energyTrades.set(id, updated);
    return updated;
  }

  async createChatMessage(insertMessage: InsertChatMessage): Promise<ChatMessage> {
    const id = this.currentChatMessageId++;
    const message: ChatMessage = {
      ...insertMessage,
      id,
      createdAt: new Date(),
      userId: insertMessage.userId ?? null,
      sessionId: insertMessage.sessionId ?? null,
      category: insertMessage.category ?? null,
      type: insertMessage.type || 'user',
    };
    this.chatMessages.set(id, message);
    return message;
  }

  async getChatMessages(limit: number = 50): Promise<ChatMessage[]> {
    const messages = Array.from(this.chatMessages.values())
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    
    // Return the most recent messages up to the limit
    return messages.slice(-limit);
  }

  async getChatMessagesByUser(userId: number, limit: number = 50): Promise<ChatMessage[]> {
    const userMessages = Array.from(this.chatMessages.values())
      .filter(msg => msg.userId === userId)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    
    // Return the most recent user messages up to the limit
    return userMessages.slice(-limit);
  }

  async getChatMessagesBySession(sessionId: string, limit: number = 50): Promise<ChatMessage[]> {
    const sessionMessages = Array.from(this.chatMessages.values())
      .filter(msg => msg.sessionId === sessionId)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    
    // Return the most recent session messages up to the limit
    return sessionMessages.slice(-limit);
  }

  async clearSessionData(sessionId: string): Promise<void> {
    // Remove chat messages for this session  
    for (const [id, message] of this.chatMessages.entries()) {
      if (message.sessionId === sessionId) {
        this.chatMessages.delete(id);
      }
    }
  }

  async clearAllUsersExceptTesting(): Promise<void> {
    // Keep only the testing user (ID: 1)
    const testUser = this.users.get(1);
    this.users.clear();
    if (testUser) {
      this.users.set(1, testUser);
    }
    // Reset user ID counter to 2
    this.currentUserId = 2;
    
    // Also clear all energy data and chat messages to start fresh
    this.households.clear();
    this.energyReadings.clear();
    this.energyTrades.clear();
    this.chatMessages.clear();
    this.currentHouseholdId = 1;
    this.currentEnergyReadingId = 1;
    this.currentEnergyTradeId = 1;
    this.currentChatMessageId = 1;
  }

  // Helper method to get current storage status
  getStorageStatus(): { type: 'database' | 'memory'; available: boolean } {
    return {
      type: 'memory',
      available: true
    };
  }
}

export class DatabaseStorage implements IStorage {
  public sessionStore: any;

  constructor() {
    // Initialize session store after database connection
    this.initializeSessionStore();
    
    // Create testing user on initialization
    this.addTestingUser().catch(console.error);
  }

  private async initializeSessionStore() {
    try {
      const { pool } = await import("./db");
      
      if (pool) {
        const PostgresSessionStore = connectPg(session);
        this.sessionStore = new PostgresSessionStore({
          pool: pool,
          createTableIfMissing: true,
          tableName: 'session'
        });
        console.log('PostgreSQL session store initialized');
      } else {
        // Fallback to memory store if database not available
        const MemoryStore = await import("memorystore").then(m => m.default);
        this.sessionStore = new MemoryStore(session)({
          checkPeriod: 86400000, // 24 hours
        });
        console.log('Memory session store initialized (fallback)');
      }
    } catch (error) {
      console.warn('Session store initialization failed, using memory fallback:', error);
      const MemoryStore = await import("memorystore").then(m => m.default);
      this.sessionStore = new MemoryStore(session)({
        checkPeriod: 86400000, // 24 hours
      });
    }
  }

  private async addTestingUser() {
    try {
      const db = await this.getDb();
      
      // Check if testing user already exists
      const existingUser = await this.getUserByEmail("test@example.com");
      if (existingUser) {
        console.log('Testing user already exists in database');
        return;
      }

      // Create testing user with hashed password using the same method as auth.ts
      const { scrypt, randomBytes } = await import("crypto");
      const { promisify } = await import("util");
      const scryptAsync = promisify(scrypt);
      
      const salt = randomBytes(16).toString("hex");
      const buf = (await scryptAsync("password123", salt, 64)) as Buffer;
      const hashedPassword = `${buf.toString("hex")}.${salt}`;
      
      const testUser: InsertUser = {
        username: "test_user",
        email: "test@example.com",
        password: hashedPassword,
      };

      await this.createUser(testUser);
      console.log('Testing user created in database: test@example.com / password123');
    } catch (error) {
      console.warn('Failed to create testing user:', error);
    }
  }

  private async getPool() {
    const { pool } = await import("./db");
    return pool;
  }

  private async getDb() {
    const { db } = await import("./db");
    if (!db) {
      throw new Error("Database connection not available");
    }
    return db;
  }

  async getUser(id: number): Promise<User | undefined> {
    const db = await this.getDb();
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const db = await this.getDb();
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const db = await this.getDb();
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const db = await this.getDb();
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async createHousehold(insertHousehold: InsertHousehold): Promise<Household> {
    const db = await this.getDb();
    const [household] = await db.insert(households).values(insertHousehold).returning();
    return household;
  }

  async getHouseholdsByUser(userId: number): Promise<Household[]> {
    try {
      const db = await this.getDb();
      return await db
        .select()
        .from(households)
        .where(eq(households.userId, userId))
        .orderBy(desc(households.createdAt));
    } catch (error) {
      console.error('Database getHouseholdsByUser error:', error);
      throw error;
    }
  }

  async getHousehold(id: number): Promise<Household | undefined> {
    const db = await this.getDb();
    const [household] = await db.select().from(households).where(eq(households.id, id));
    return household || undefined;
  }

  async updateHousehold(id: number, updates: Partial<Household>): Promise<Household | undefined> {
    const db = await this.getDb();
    const [household] = await db.update(households).set(updates).where(eq(households.id, id)).returning();
    return household || undefined;
  }

  async getHouseholdsWithUsers(): Promise<(Household & { user: Pick<User, 'phone' | 'state' | 'district'> })[]> {
    const db = await this.getDb();
    const result = await db
      .select({
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
        userDistrict: users.district,
      })
      .from(households)
      .innerJoin(users, eq(households.userId, users.id))
      .orderBy(desc(households.createdAt));

    return result.map(row => ({
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
        district: row.userDistrict,
      }
    }));
  }

  async listHouseholds(): Promise<Household[]> {
    const db = await this.getDb();
    return await db.select().from(households).orderBy(desc(households.createdAt));
  }

  async createEnergyReading(insertReading: InsertEnergyReading): Promise<EnergyReading> {
    const db = await this.getDb();
    const [reading] = await db.insert(energyReadings).values(insertReading).returning();
    return reading;
  }

  async getEnergyReadingsByHousehold(householdId: number, limit: number = 50): Promise<EnergyReading[]> {
    const db = await this.getDb();
    return await db
      .select()
      .from(energyReadings)
      .where(eq(energyReadings.householdId, householdId))
      .orderBy(desc(energyReadings.timestamp))
      .limit(limit);
  }

  async createEnergyTrade(insertTrade: InsertEnergyTrade): Promise<EnergyTrade> {
    const db = await this.getDb();
    const [trade] = await db.insert(energyTrades).values(insertTrade).returning();
    return trade;
  }

  async getEnergyTrades(limit: number = 50): Promise<EnergyTrade[]> {
    const db = await this.getDb();
    return await db
      .select()
      .from(energyTrades)
      .orderBy(desc(energyTrades.createdAt))
      .limit(limit);
  }

  async getEnergyTradesByHousehold(householdId: number, limit: number = 50): Promise<EnergyTrade[]> {
    const db = await this.getDb();
    return await db
      .select()
      .from(energyTrades)
      .where(eq(energyTrades.sellerHouseholdId, householdId))
      .orderBy(desc(energyTrades.createdAt))
      .limit(limit);
  }

  async updateEnergyTradeStatus(id: number, status: string): Promise<EnergyTrade | undefined> {
    const db = await this.getDb();
    const [trade] = await db.update(energyTrades).set({ status }).where(eq(energyTrades.id, id)).returning();
    return trade || undefined;
  }

  async createChatMessage(insertMessage: InsertChatMessage): Promise<ChatMessage> {
    const db = await this.getDb();
    try {
      const [message] = await db
        .insert(chatMessages)
        .values(insertMessage)
        .returning();
      console.log('Database insert successful, message ID:', message.id);
      return message;
    } catch (error) {
      console.error('Database insert failed:', error);
      throw error;
    }
  }

  async getChatMessages(limit: number = 50): Promise<ChatMessage[]> {
    const db = await this.getDb();
    return await db
      .select()
      .from(chatMessages)
      .where(eq(chatMessages.userId, 0))
      .orderBy(desc(chatMessages.createdAt))
      .limit(limit);
  }

  async getChatMessagesByUser(userId: number, limit: number = 50): Promise<ChatMessage[]> {
    const db = await this.getDb();
    return await db
      .select()
      .from(chatMessages)
      .where(eq(chatMessages.userId, userId))
      .orderBy(desc(chatMessages.createdAt))
      .limit(limit);
  }

  async getChatMessagesBySession(sessionId: string, limit: number = 50): Promise<ChatMessage[]> {
    const db = await this.getDb();
    return await db
      .select()
      .from(chatMessages)
      .where(eq(chatMessages.sessionId, sessionId))
      .orderBy(desc(chatMessages.createdAt))
      .limit(limit);
  }

  async clearSessionData(sessionId: string): Promise<void> {
    const db = await this.getDb();
    // Remove chat messages for this session
    await db.delete(chatMessages).where(eq(chatMessages.sessionId, sessionId));
  }

  async clearAllUsersExceptTesting(): Promise<void> {
    const db = await this.getDb();
    // Delete all users (including testing user to recreate with proper password hash)
    await db.delete(users);
    // Clear all energy data and chat messages
    await db.delete(households);
    await db.delete(energyReadings);
    await db.delete(energyTrades);
    await db.delete(chatMessages);
    
    // Recreate testing user with proper scrypt password hash
    await this.addTestingUser();
  }

  // Helper method to get current storage status
  getStorageStatus(): { type: 'database' | 'memory'; available: boolean } {
    return {
      type: 'database',
      available: true
    };
  }
}

// Hybrid storage class that tries database first, falls back to memory
class HybridStorage implements IStorage {
  private memoryStorage: MemStorage;
  private databaseStorage: DatabaseStorage | null;
  private isDatabaseAvailable: boolean = false;
  private connectionCheckPromise: Promise<void>;
  public sessionStore: any;

  constructor() {
    this.memoryStorage = new MemStorage();
    
    // Only initialize database storage if we have a proper connection
    // This will be determined by the db.ts initialization
    this.databaseStorage = new DatabaseStorage();
    this.sessionStore = this.memoryStorage.sessionStore; // Default to memory
    this.connectionCheckPromise = this.checkDatabaseConnection();
  }

  // Wait for database connection check to complete
  async waitForConnectionCheck(): Promise<void> {
    await this.connectionCheckPromise;
  }

  private async checkDatabaseConnection(): Promise<void> {
    if (!this.databaseStorage) return;
    
    try {
      // Wait for database initialization to complete
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Test database connection with timeout
      const connectionTest = Promise.race([
        this.databaseStorage.getUser(1),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Connection timeout')), 5000))
      ]);
      
      await connectionTest;
      
      this.isDatabaseAvailable = true;
      console.log('✓ Database connection verified - using PostgreSQL storage');
      
      // Switch to database session store
      this.sessionStore = this.databaseStorage.sessionStore;
    } catch (error) {
      console.warn('Database connection failed, using memory storage:', error instanceof Error ? error.message : 'Unknown error');
      this.isDatabaseAvailable = false;
      this.databaseStorage = null; // Clear failed connection
    }
  }

  async getUser(id: number): Promise<User | undefined> {
    if (this.isDatabaseAvailable && this.databaseStorage) {
      try {
        return await this.databaseStorage.getUser(id);
      } catch (error) {
        console.warn('Database getUser failed, falling back to memory:', error);
        this.isDatabaseAvailable = false;
      }
    }
    return await this.memoryStorage.getUser(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    if (this.isDatabaseAvailable && this.databaseStorage) {
      try {
        return await this.databaseStorage.getUserByUsername(username);
      } catch (error) {
        console.warn('Database getUserByUsername failed, falling back to memory:', error);
        this.isDatabaseAvailable = false;
      }
    }
    return await this.memoryStorage.getUserByUsername(username);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    if (this.isDatabaseAvailable && this.databaseStorage) {
      try {
        return await this.databaseStorage.getUserByEmail(email);
      } catch (error) {
        console.warn('Database getUserByEmail failed, falling back to memory:', error);
        this.isDatabaseAvailable = false;
      }
    }
    return await this.memoryStorage.getUserByEmail(email);
  }

  async createUser(user: InsertUser): Promise<User> {
    if (this.isDatabaseAvailable && this.databaseStorage) {
      try {
        return await this.databaseStorage.createUser(user);
      } catch (error) {
        console.warn('Database createUser failed, falling back to memory:', error);
        this.isDatabaseAvailable = false;
      }
    }
    return await this.memoryStorage.createUser(user);
  }

  async createHousehold(household: InsertHousehold): Promise<Household> {
    if (this.isDatabaseAvailable && this.databaseStorage) {
      try {
        return await this.databaseStorage.createHousehold(household);
      } catch (error) {
        console.warn('Database createHousehold failed, falling back to memory:', error);
        this.isDatabaseAvailable = false;
      }
    }
    return await this.memoryStorage.createHousehold(household);
  }

  async getHouseholdsByUser(userId: number): Promise<Household[]> {
    if (this.isDatabaseAvailable && this.databaseStorage) {
      try {
        return await this.databaseStorage.getHouseholdsByUser(userId);
      } catch (error) {
        console.warn('Database getHouseholdsByUser failed, falling back to memory:', error);
        this.isDatabaseAvailable = false;
      }
    }
    return await this.memoryStorage.getHouseholdsByUser(userId);
  }

  async getHousehold(id: number): Promise<Household | undefined> {
    if (this.isDatabaseAvailable && this.databaseStorage) {
      try {
        return await this.databaseStorage.getHousehold(id);
      } catch (error) {
        console.warn('Database getHousehold failed, falling back to memory:', error);
        this.isDatabaseAvailable = false;
      }
    }
    return await this.memoryStorage.getHousehold(id);
  }

  async updateHousehold(id: number, updates: Partial<Household>): Promise<Household | undefined> {
    if (this.isDatabaseAvailable && this.databaseStorage) {
      try {
        return await this.databaseStorage.updateHousehold(id, updates);
      } catch (error) {
        console.warn('Database updateHousehold failed, falling back to memory:', error);
        this.isDatabaseAvailable = false;
      }
    }
    return await this.memoryStorage.updateHousehold(id, updates);
  }

  async getHouseholdsWithUsers(): Promise<(Household & { user: Pick<User, 'phone' | 'state' | 'district'> })[]> {
    if (this.isDatabaseAvailable && this.databaseStorage) {
      try {
        return await this.databaseStorage.getHouseholdsWithUsers();
      } catch (error) {
        console.warn('Database getHouseholdsWithUsers failed, falling back to memory:', error);
        this.isDatabaseAvailable = false;
      }
    }
    return await this.memoryStorage.getHouseholdsWithUsers();
  }

  async listHouseholds(): Promise<Household[]> {
    if (this.isDatabaseAvailable && this.databaseStorage) {
      try {
        return await this.databaseStorage.listHouseholds();
      } catch (error) {
        console.warn('Database listHouseholds failed, falling back to memory:', error);
        this.isDatabaseAvailable = false;
      }
    }
    return await this.memoryStorage.listHouseholds();
  }

  async createEnergyReading(reading: InsertEnergyReading): Promise<EnergyReading> {
    if (this.isDatabaseAvailable && this.databaseStorage) {
      try {
        return await this.databaseStorage.createEnergyReading(reading);
      } catch (error) {
        console.warn('Database createEnergyReading failed, falling back to memory:', error);
        this.isDatabaseAvailable = false;
      }
    }
    return await this.memoryStorage.createEnergyReading(reading);
  }

  async getEnergyReadingsByHousehold(householdId: number, limit?: number): Promise<EnergyReading[]> {
    if (this.isDatabaseAvailable && this.databaseStorage) {
      try {
        return await this.databaseStorage.getEnergyReadingsByHousehold(householdId, limit);
      } catch (error) {
        console.warn('Database getEnergyReadingsByHousehold failed, falling back to memory:', error);
        this.isDatabaseAvailable = false;
      }
    }
    return await this.memoryStorage.getEnergyReadingsByHousehold(householdId, limit);
  }

  async createEnergyTrade(trade: InsertEnergyTrade): Promise<EnergyTrade> {
    if (this.isDatabaseAvailable && this.databaseStorage) {
      try {
        return await this.databaseStorage.createEnergyTrade(trade);
      } catch (error) {
        console.warn('Database createEnergyTrade failed, falling back to memory:', error);
        this.isDatabaseAvailable = false;
      }
    }
    return await this.memoryStorage.createEnergyTrade(trade);
  }

  async getEnergyTrades(limit?: number): Promise<EnergyTrade[]> {
    if (this.isDatabaseAvailable && this.databaseStorage) {
      try {
        return await this.databaseStorage.getEnergyTrades(limit);
      } catch (error) {
        console.warn('Database getEnergyTrades failed, falling back to memory:', error);
        this.isDatabaseAvailable = false;
      }
    }
    return await this.memoryStorage.getEnergyTrades(limit);
  }

  async getEnergyTradesByHousehold(householdId: number, limit?: number): Promise<EnergyTrade[]> {
    if (this.isDatabaseAvailable && this.databaseStorage) {
      try {
        return await this.databaseStorage.getEnergyTradesByHousehold(householdId, limit);
      } catch (error) {
        console.warn('Database getEnergyTradesByHousehold failed, falling back to memory:', error);
        this.isDatabaseAvailable = false;
      }
    }
    return await this.memoryStorage.getEnergyTradesByHousehold(householdId, limit);
  }

  async updateEnergyTradeStatus(id: number, status: string): Promise<EnergyTrade | undefined> {
    if (this.isDatabaseAvailable && this.databaseStorage) {
      try {
        return await this.databaseStorage.updateEnergyTradeStatus(id, status);
      } catch (error) {
        console.warn('Database updateEnergyTradeStatus failed, falling back to memory:', error);
        this.isDatabaseAvailable = false;
      }
    }
    return await this.memoryStorage.updateEnergyTradeStatus(id, status);
  }

  async createChatMessage(message: InsertChatMessage): Promise<ChatMessage> {
    if (this.isDatabaseAvailable && this.databaseStorage) {
      try {
        return await this.databaseStorage.createChatMessage(message);
      } catch (error) {
        console.warn('Database createChatMessage failed, falling back to memory:', error);
        this.isDatabaseAvailable = false;
      }
    }
    return await this.memoryStorage.createChatMessage(message);
  }

  async getChatMessages(limit: number = 50): Promise<ChatMessage[]> {
    if (this.isDatabaseAvailable && this.databaseStorage) {
      try {
        return await this.databaseStorage.getChatMessages(limit);
      } catch (error) {
        console.warn('Database getChatMessages failed, falling back to memory:', error);
        this.isDatabaseAvailable = false;
      }
    }
    return await this.memoryStorage.getChatMessages(limit);
  }

  async getChatMessagesByUser(userId: number, limit: number = 50): Promise<ChatMessage[]> {
    if (this.isDatabaseAvailable && this.databaseStorage) {
      try {
        return await this.databaseStorage.getChatMessagesByUser(userId, limit);
      } catch (error) {
        console.warn('Database getChatMessagesByUser failed, falling back to memory:', error);
        this.isDatabaseAvailable = false;
      }
    }
    return await this.memoryStorage.getChatMessagesByUser(userId, limit);
  }



  async getChatMessagesBySession(sessionId: string, limit: number = 50): Promise<ChatMessage[]> {
    if (this.isDatabaseAvailable && this.databaseStorage) {
      try {
        return await this.databaseStorage.getChatMessagesBySession(sessionId, limit);
      } catch (error) {
        console.warn('Database getChatMessagesBySession failed, falling back to memory:', error);
        this.isDatabaseAvailable = false;
      }
    }
    return await this.memoryStorage.getChatMessagesBySession(sessionId, limit);
  }

  async clearSessionData(sessionId: string): Promise<void> {
    if (this.isDatabaseAvailable && this.databaseStorage) {
      try {
        await this.databaseStorage.clearSessionData(sessionId);
        return;
      } catch (error) {
        console.warn('Database clearSessionData failed, falling back to memory:', error);
        this.isDatabaseAvailable = false;
      }
    }
    await this.memoryStorage.clearSessionData(sessionId);
  }

  async clearAllUsersExceptTesting(): Promise<void> {
    if (this.isDatabaseAvailable && this.databaseStorage) {
      try {
        await this.databaseStorage.clearAllUsersExceptTesting();
        return;
      } catch (error) {
        console.warn('Database clearAllUsersExceptTesting failed, falling back to memory:', error);
        this.isDatabaseAvailable = false;
      }
    }
    await this.memoryStorage.clearAllUsersExceptTesting();
  }

  // Helper method to get current storage status
  getStorageStatus(): { type: 'database' | 'memory'; available: boolean } {
    return {
      type: this.isDatabaseAvailable ? 'database' : 'memory',
      available: true
    };
  }
}

// Storage initialization with hybrid fallback
export const storage = (() => {
  const databaseUrl = getDatabaseUrl();
  if (databaseUrl) {
    console.log('✓ DATABASE_URL found - using hybrid storage with PostgreSQL fallback');
    return new HybridStorage();
  }
  
  console.log('Using memory storage for development');
  return new MemStorage();
})();
