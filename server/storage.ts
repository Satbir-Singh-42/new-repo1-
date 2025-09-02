import { households, energyReadings, energyTrades, tradeAcceptances, users, chatMessages, userSessions, type User, type InsertUser, type Household, type InsertHousehold, type EnergyReading, type InsertEnergyReading, type EnergyTrade, type InsertEnergyTrade, type TradeAcceptance, type InsertTradeAcceptance, type ChatMessage, type InsertChatMessage } from "@shared/schema";
import { eq, desc, count, ne, and, or, sql, inArray } from "drizzle-orm";
import { weatherService } from "./weather-service";
import { GoogleGenAI } from "@google/genai";
import { readFileSync } from 'fs';
import { join } from 'path';
import session from "express-session";
import createMemoryStore from "memorystore";
import connectPg from "connect-pg-simple";
import { config } from "dotenv";

// Load environment variables before storage initialization
config();

function getDatabaseUrl(): string | null {
  // Use DATABASE_URL environment variable and clean it up
  let dbUrl = process.env.DATABASE_URL || null;
  if (dbUrl) {
    // Remove psql command prefix and quotes if present
    dbUrl = dbUrl.replace(/^psql\s*['"]*/, '').replace(/['"]*$/, '');
    // Clean up any extra whitespace
    dbUrl = dbUrl.trim();
  }
  return dbUrl;
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
  getEnergyReadings(limit?: number): Promise<EnergyReading[]>;
  createEnergyTrade(trade: InsertEnergyTrade): Promise<EnergyTrade>;
  getEnergyTrades(limit?: number): Promise<any[]>;
  getEnergyTradesByHousehold(householdId: number, limit?: number): Promise<EnergyTrade[]>;
  getEnergyTradesByUser(userId: number, limit?: number): Promise<EnergyTrade[]>;
  getEnergyTradeById(id: number): Promise<EnergyTrade | undefined>;
  updateEnergyTrade(id: number, updates: Partial<EnergyTrade>): Promise<EnergyTrade | undefined>;
  deleteEnergyTrade(id: number): Promise<boolean>;
  updateEnergyTradeStatus(id: number, status: string): Promise<EnergyTrade | undefined>;
  listHouseholds(): Promise<Household[]>;
  createChatMessage(message: InsertChatMessage): Promise<ChatMessage>;
  getChatMessages(limit?: number): Promise<ChatMessage[]>;
  getChatMessagesByUser(userId: number, limit?: number): Promise<ChatMessage[]>;
  getChatMessagesBySession(sessionId: string, limit?: number): Promise<ChatMessage[]>;
  clearSessionData(sessionId: string): Promise<void>;
  getRealtimeMarketData(latitude: number, longitude: number): Promise<any>;
  getNetworkAnalytics(): Promise<any>;
  getChatResponse(message: string, userId?: number): Promise<any>;
  sessionStore: any;
  
  // Session management
  createSession(sessionId: string, userId: number): Promise<void>;
  getSessionUser(sessionId: string): Promise<User | null>;
  deleteSession(sessionId: string): Promise<void>;
  
  // Trade acceptance methods
  createTradeAcceptance(acceptance: InsertTradeAcceptance): Promise<TradeAcceptance>;
  getTradeAcceptancesByTrade(tradeId: number): Promise<TradeAcceptance[]>;
  getTradeAcceptancesByUser(userId: number): Promise<TradeAcceptance[]>;
  updateTradeAcceptanceStatus(id: number, status: string): Promise<TradeAcceptance | undefined>;
  getApplicationsToMyTrades(userId: number): Promise<any[]>;
  getAvailableOffersForUser(userId: number): Promise<any[]>;
  shareContactInfo(acceptanceId: number): Promise<any>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private households: Map<number, Household>;
  private energyReadings: Map<number, EnergyReading>;
  private energyTrades: Map<number, EnergyTrade>;
  private tradeAcceptances: Map<number, TradeAcceptance>;
  private chatMessages: Map<number, ChatMessage>;
  private currentUserId: number;
  private currentHouseholdId: number;
  private currentEnergyReadingId: number;
  private currentEnergyTradeId: number;
  private currentTradeAcceptanceId: number;
  private currentChatMessageId: number;
  public sessionStore: any;

  constructor() {
    this.users = new Map();
    this.households = new Map();
    this.energyReadings = new Map();
    this.energyTrades = new Map();
    this.tradeAcceptances = new Map();
    this.chatMessages = new Map();
    this.currentUserId = 1;
    this.currentHouseholdId = 1;
    this.currentEnergyReadingId = 1;
    this.currentEnergyTradeId = 1;
    this.currentTradeAcceptanceId = 1;
    this.currentChatMessageId = 1;
    
    // Initialize memory session store
    const MemoryStore = createMemoryStore(session);
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000, // 24 hours
    });
    
    // No demo credentials - production ready
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
    const user: User = { 
      ...insertUser, 
      id, 
      createdAt: new Date(),
      phone: insertUser.phone || null,
      state: insertUser.state || null,
      district: insertUser.district || null
    };
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
    for (const household of Array.from(this.households.values())) {
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
      sellerHouseholdId: insertTrade.sellerHouseholdId || null,
      buyerHouseholdId: insertTrade.buyerHouseholdId || null,
      createdAt: new Date(),
      completedAt: null,
    };
    this.energyTrades.set(id, trade);
    return trade;
  }

  async getEnergyTrades(limit: number = 50): Promise<any[]> {
    const trades = Array.from(this.energyTrades.values())
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);
    
    // Add household names to each trade
    return trades.map(trade => {
      const sellerHousehold = trade.sellerHouseholdId ? this.households.get(trade.sellerHouseholdId) : null;
      const buyerHousehold = trade.buyerHouseholdId ? this.households.get(trade.buyerHouseholdId) : null;
      
      return {
        ...trade,
        sellerHouseholdName: sellerHousehold?.name || null,
        buyerHouseholdName: buyerHousehold?.name || null,
      };
    });
  }

  async getEnergyTradesByHousehold(householdId: number, limit: number = 50): Promise<EnergyTrade[]> {
    const trades = Array.from(this.energyTrades.values())
      .filter(trade => trade.sellerHouseholdId === householdId || trade.buyerHouseholdId === householdId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    
    return trades.slice(0, limit);
  }

  async getEnergyTradesByUser(userId: number, limit: number = 50): Promise<EnergyTrade[]> {
    // Get all user's households first
    const userHouseholds = Array.from(this.households.values()).filter(h => h.userId === userId);
    const householdIds = userHouseholds.map(h => h.id);
    
    const trades = Array.from(this.energyTrades.values())
      .filter(trade => 
        householdIds.includes(trade.sellerHouseholdId || -1) || 
        householdIds.includes(trade.buyerHouseholdId || -1)
      )
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    
    return trades.slice(0, limit);
  }

  async getEnergyTradeById(id: number): Promise<EnergyTrade | undefined> {
    return this.energyTrades.get(id);
  }

  async updateEnergyTrade(id: number, updates: Partial<EnergyTrade>): Promise<EnergyTrade | undefined> {
    const trade = this.energyTrades.get(id);
    if (!trade) return undefined;
    
    const updatedTrade = { ...trade, ...updates };
    this.energyTrades.set(id, updatedTrade);
    return updatedTrade;
  }

  async deleteEnergyTrade(id: number): Promise<boolean> {
    return this.energyTrades.delete(id);
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
    for (const [id, message] of Array.from(this.chatMessages.entries())) {
      if (message.sessionId === sessionId) {
        this.chatMessages.delete(id);
      }
    }
  }

  async getEnergyReadings(limit: number = 50): Promise<EnergyReading[]> {
    const readings = Array.from(this.energyReadings.values())
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    
    return readings.slice(0, limit);
  }

  async getRealtimeMarketData(latitude: number, longitude: number): Promise<any> {
    // Basic market data simulation for memory storage
    const supply = 100 + Math.random() * 50;
    const demand = 90 + Math.random() * 60;
    const gridStability = Math.max(0, Math.min(100, 85 + Math.random() * 20));
    
    return {
      supply: Math.round(supply),
      demand: Math.round(demand),
      gridStability: Math.round(gridStability),
      weather: {
        condition: 'sunny',
        temperature: 25,
        efficiency: 85
      }
    };
  }

  async getNetworkAnalytics(): Promise<any> {
    const totalHouseholds = this.households.size;
    const activeHouseholds = totalHouseholds;
    const totalTrades = this.energyTrades.size;
    
    return {
      network: {
        totalHouseholds,
        activeHouseholds,
        totalGenerationCapacity: `${totalHouseholds * 5}kW`,
        totalStorageCapacity: `${totalHouseholds * 10}kWh`,
        storageUtilization: '65%'
      },
      trading: {
        totalTrades,
        averagePrice: '4.50',
        carbonSaved: `${totalTrades * 2.5}kg`
      },
      efficiency: {
        networkEfficiency: '92%',
        averageDistance: '2.3km'
      }
    };
  }

  async getChatResponse(message: string, userId?: number): Promise<any> {
    // Simple response for memory storage
    return {
      response: "I'm a demo assistant. Please configure the AI service for full functionality.",
      confidence: 0.5
    };
  }

  // Helper method to get current storage status
  getStorageStatus(): { type: 'database' | 'memory'; available: boolean } {
    return {
      type: 'memory',
      available: true
    };
  }

  // Session management for MemStorage
  async createSession(sessionId: string, userId: number): Promise<void> {
    // For memory storage, sessions are handled in auth.ts activeSessions map
    // This is a no-op for compatibility
  }

  async getSessionUser(sessionId: string): Promise<User | null> {
    // For memory storage, sessions are handled in auth.ts activeSessions map
    // This is a no-op for compatibility
    return null;
  }

  async deleteSession(sessionId: string): Promise<void> {
    // For memory storage, sessions are handled in auth.ts activeSessions map
    // This is a no-op for compatibility
  }

  // Trade acceptance methods
  async createTradeAcceptance(acceptance: InsertTradeAcceptance): Promise<TradeAcceptance> {
    const id = this.currentTradeAcceptanceId++;
    const tradeAcceptance: TradeAcceptance = {
      ...acceptance,
      id,
      acceptedAt: new Date(),
      completedAt: null,
      contactShared: false,
      status: acceptance.status || 'accepted'
    };
    this.tradeAcceptances.set(id, tradeAcceptance);
    return tradeAcceptance;
  }

  async getTradeAcceptancesByTrade(tradeId: number): Promise<TradeAcceptance[]> {
    return Array.from(this.tradeAcceptances.values()).filter(
      (acceptance) => acceptance.tradeId === tradeId
    );
  }

  async getTradeAcceptancesByUser(userId: number): Promise<TradeAcceptance[]> {
    return Array.from(this.tradeAcceptances.values()).filter(
      (acceptance) => acceptance.acceptorUserId === userId
    );
  }

  async updateTradeAcceptanceStatus(id: number, status: string): Promise<TradeAcceptance | undefined> {
    const acceptance = this.tradeAcceptances.get(id);
    if (acceptance) {
      const updatedAcceptance = { ...acceptance, status };
      this.tradeAcceptances.set(id, updatedAcceptance);
      return updatedAcceptance;
    }
    return undefined;
  }

  async getAvailableOffersForUser(userId: number): Promise<any[]> {
    // Get user's household IDs to exclude their own offers
    const userHouseholds = Array.from(this.households.values())
      .filter(h => h.userId === userId);
    
    const householdIds = userHouseholds.map(h => h.id);
    
    // Get pending trades that don't belong to this user
    const availableOffers = Array.from(this.energyTrades.values())
      .filter(trade => 
        trade.status === 'pending' && 
        trade.sellerHouseholdId && !householdIds.includes(trade.sellerHouseholdId) &&
        (!trade.buyerHouseholdId || !householdIds.includes(trade.buyerHouseholdId))
      )
      .map(trade => {
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
            district: user.district,
          } : null
        };
      })
      .filter(offer => offer.user !== null);
    
    return availableOffers;
  }

  async getApplicationsToMyTrades(userId: number): Promise<any[]> {
    // Get user's household IDs
    const userHouseholds = Array.from(this.households.values()).filter(h => h.userId === userId);
    const householdIds = userHouseholds.map(h => h.id);
    
    if (householdIds.length === 0) {
      return [];
    }
    
    // Get all applications to user's trades
    const applications = [];
    
    for (const acceptance of Array.from(this.tradeAcceptances.values())) {
      const trade = this.energyTrades.get(acceptance.tradeId);
      if (!trade) continue;
      
      // Check if this trade belongs to the user
      const isMyTrade = (trade.tradeType === 'sell' && trade.sellerHouseholdId && householdIds.includes(trade.sellerHouseholdId)) ||
                        (trade.tradeType === 'buy' && trade.buyerHouseholdId && householdIds.includes(trade.buyerHouseholdId));
      
      if (isMyTrade) {
        const applicant = this.users.get(acceptance.acceptorUserId);
        const applicantHousehold = Array.from(this.households.values()).find(h => h.userId === applicant?.id);
        
        applications.push({
          acceptance,
          trade,
          applicant: applicant ? {
            id: applicant.id,
            username: applicant.username,
            email: applicant.email,
            phone: applicant.phone,
            state: applicant.state,
            district: applicant.district,
          } : null,
          applicantHousehold: applicantHousehold ? {
            id: applicantHousehold.id,
            name: applicantHousehold.name,
          } : null,
        });
      }
    }
    
    // Sort by acceptance date (newest first)
    return applications.sort((a, b) => new Date(b.acceptance.acceptedAt).getTime() - new Date(a.acceptance.acceptedAt).getTime());
  }

  async shareContactInfo(acceptanceId: number): Promise<any> {
    const acceptance = this.tradeAcceptances.get(acceptanceId);
    if (!acceptance) {
      throw new Error('Trade acceptance not found');
    }
    
    const trade = this.energyTrades.get(acceptance.tradeId);
    const acceptorUser = this.users.get(acceptance.acceptorUserId);
    
    // Mark contact as shared
    await this.updateTradeAcceptanceStatus(acceptanceId, 'contacted');
    
    return {
      acceptance,
      trade,
      contactInfo: acceptorUser ? {
        id: acceptorUser.id,
        username: acceptorUser.username,
        email: acceptorUser.email,
        phone: acceptorUser.phone,
      } : null,
    };
  }
}

export class DatabaseStorage implements IStorage {
  public sessionStore: any;

  constructor() {
    // Initialize session store after database connection
    this.initializeSessionStore();
    
    // Production ready - no demo credentials
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
        this.sessionStore = new (MemoryStore(session))({
          checkPeriod: 86400000, // 24 hours
        });
        console.log('Memory session store initialized (fallback)');
      }
    } catch (error) {
      console.warn('Session store initialization failed, using memory fallback:', error);
      const MemoryStore = await import("memorystore").then(m => m.default);
      this.sessionStore = new (MemoryStore(session))({
        checkPeriod: 86400000, // 24 hours
      });
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

    return result.map((row: any) => ({
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

  async getEnergyTrades(limit: number = 50): Promise<any[]> {
    const db = await this.getDb();
    
    // First get all trades with household and user info
    const tradesQuery = await db
      .select({
        // Energy trade fields - map database column names to frontend expected names
        id: energyTrades.id,
        sellerHouseholdId: energyTrades.sellerHouseholdId,
        buyerHouseholdId: energyTrades.buyerHouseholdId,
        energyAmount: energyTrades.energyAmount, // This maps to energy_amount_kwh in DB
        pricePerKwh: energyTrades.pricePerKwh,   // This maps to price_per_kwh_cents in DB  
        status: energyTrades.status,
        tradeType: energyTrades.tradeType,
        createdAt: energyTrades.createdAt,
        // Household names
        sellerHouseholdName: sql<string>`seller_household.name`,
        buyerHouseholdName: sql<string>`buyer_household.name`,
      })
      .from(energyTrades)
      .leftJoin(
        sql`${households} as seller_household`,
        sql`seller_household.id = ${energyTrades.sellerHouseholdId}`
      )
      .leftJoin(
        sql`${households} as buyer_household`,
        sql`buyer_household.id = ${energyTrades.buyerHouseholdId}`
      )
      .orderBy(desc(energyTrades.createdAt))
      .limit(limit);
    
    // Then get acceptance counts for each trade
    const tradeIds = tradesQuery.map((trade: any) => trade.id);
    const acceptanceCounts = tradeIds.length > 0 ? await db
      .select({
        tradeId: tradeAcceptances.tradeId,
        count: sql<number>`count(*)`
      })
      .from(tradeAcceptances)
      .where(inArray(tradeAcceptances.tradeId, tradeIds))
      .groupBy(tradeAcceptances.tradeId) : [];
    
    // Create a map of tradeId -> acceptance count
    const countMap = acceptanceCounts.reduce((map: Record<number, number>, item: any) => {
      map[item.tradeId] = item.count;
      return map;
    }, {} as Record<number, number>);
    
    // Add acceptance count to each trade
    return tradesQuery.map((trade: any) => ({
      ...trade,
      acceptanceCount: countMap[trade.id] || 0
    }));
  }

  async getEnergyTradesByHousehold(householdId: number, limit: number = 50): Promise<EnergyTrade[]> {
    const db = await this.getDb();
    return await db
      .select()
      .from(energyTrades)
      .where(
        // Include trades where household is either seller OR buyer
        sql`(${energyTrades.sellerHouseholdId} = ${householdId} OR ${energyTrades.buyerHouseholdId} = ${householdId})`
      )
      .orderBy(desc(energyTrades.createdAt))
      .limit(limit);
  }

  async getEnergyTradesByUser(userId: number, limit: number = 50): Promise<EnergyTrade[]> {
    const db = await this.getDb();
    
    // Get user's households first
    const userHouseholds = await db
      .select({ id: households.id })
      .from(households)
      .where(eq(households.userId, userId));
    
    const householdIds = userHouseholds.map((h: any) => h.id);
    
    if (householdIds.length === 0) {
      return [];
    }
    
    // Get trades where user's households are involved
    return await db
      .select()
      .from(energyTrades)
      .where(
        sql`(${energyTrades.sellerHouseholdId} IN (${householdIds.join(',')}) OR ${energyTrades.buyerHouseholdId} IN (${householdIds.join(',')}))`
      )
      .orderBy(desc(energyTrades.createdAt))
      .limit(limit);
  }

  async getEnergyTradeById(id: number): Promise<EnergyTrade | undefined> {
    const db = await this.getDb();
    const [trade] = await db.select().from(energyTrades).where(eq(energyTrades.id, id));
    return trade || undefined;
  }

  async updateEnergyTrade(id: number, updates: Partial<EnergyTrade>): Promise<EnergyTrade | undefined> {
    const db = await this.getDb();
    const [trade] = await db.update(energyTrades).set(updates).where(eq(energyTrades.id, id)).returning();
    return trade || undefined;
  }

  async deleteEnergyTrade(id: number): Promise<boolean> {
    const db = await this.getDb();
    const result = await db.delete(energyTrades).where(eq(energyTrades.id, id));
    return result.rowCount !== null && result.rowCount > 0;
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

  async getEnergyReadings(limit: number = 50): Promise<EnergyReading[]> {
    const db = await this.getDb();
    return await db
      .select()
      .from(energyReadings)
      .orderBy(desc(energyReadings.timestamp))
      .limit(limit);
  }

  // Add cache for AI insights to prevent excessive API usage
  private static aiInsightCache = new Map<string, { data: any; timestamp: number; }>();
  private static AI_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes cache

  async getRealtimeMarketData(latitude: number, longitude: number): Promise<any> {
    const db = await this.getDb();
    
    try {
      // Get REAL weather data for user's location using WeatherService
      console.log(`🌍 Fetching real-time weather for location: ${latitude}, ${longitude}`);
      const realWeatherData = await weatherService.getCurrentWeather({ latitude, longitude });
      console.log(`🌤️ Real weather for market data:`, realWeatherData);
      
      // Get actual market data from database
      const recentTrades = await db
        .select()
        .from(energyTrades)
        .orderBy(desc(energyTrades.createdAt))
        .limit(10);
      
      const recentReadings = await db
        .select()
        .from(energyReadings)
        .orderBy(desc(energyReadings.timestamp))
        .limit(5);
      
      // Calculate realistic solar generation based on REAL weather conditions
      const baseGenerationCapacity = 150; // kW base capacity for the network
      const weatherMultipliers = {
        'sunny': 1.0,
        'partly-cloudy': 0.75,
        'cloudy': 0.45,
        'overcast': 0.25,
        'rainy': 0.15,
        'stormy': 0.08
      };
      
      // Calculate solar efficiency based on real weather
      const cloudCoverImpact = Math.max(0.1, 1 - (realWeatherData.cloudCover / 100) * 0.6);
      const tempImpact = realWeatherData.temperature > 25 ? 
        Math.max(0.7, 1 - (realWeatherData.temperature - 25) * 0.01) : 1.0;
      const dayNightImpact = realWeatherData.isDay ? 1.0 : 0.02; // Minimal generation at night
      
      const weatherMultiplier = (weatherMultipliers[realWeatherData.condition] || 0.6) * 
                               cloudCoverImpact * tempImpact * dayNightImpact;
      
      // Calculate realistic supply based on weather
      const realtimeSupply = Math.round(baseGenerationCapacity * weatherMultiplier);
      
      // Calculate demand based on time of day and weather (higher demand in extreme weather)
      const timeOfDay = new Date().getHours();
      const peakHours = (timeOfDay >= 17 && timeOfDay <= 21) || (timeOfDay >= 8 && timeOfDay <= 10);
      const weatherDemandMultiplier = realWeatherData.temperature > 30 ? 1.3 : 
                                    realWeatherData.temperature < 15 ? 1.2 : 1.0;
      const baseDemand = peakHours ? 140 : 100;
      const realtimeDemand = Math.round(baseDemand * weatherDemandMultiplier);
      
      // Calculate grid stability based on supply/demand balance
      const supplyDemandRatio = realtimeSupply / realtimeDemand;
      const gridStability = Math.max(10, Math.min(100, 50 + (supplyDemandRatio - 1) * 100));
      
      // Calculate solar efficiency percentage for display
      const solarEfficiency = Math.round(weatherMultiplier * 100);
      
      // Use cached AI insights to drastically reduce API usage - cache by location and weather only
      let aiEnhancedData = {};
      const cacheKey = `${Math.round(latitude * 100)}_${Math.round(longitude * 100)}_${realWeatherData.condition}`;
      const cachedInsight = (this.constructor as typeof DatabaseStorage).aiInsightCache.get(cacheKey);
      
      // Use cached data if available and fresh (5 minutes)
      if (cachedInsight && Date.now() - cachedInsight.timestamp < (this.constructor as typeof DatabaseStorage).AI_CACHE_DURATION) {
        aiEnhancedData = cachedInsight.data;
        console.log(`🤖 Using cached AI insight to save API costs`);
      } else {
        // Only call Gemini AI if cache is stale or missing
        try {
          if (process.env.GOOGLE_API_KEY) {
            const { GoogleGenerativeAI } = await import("@google/generative-ai");
            const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
            
            const marketPrompt = `As an energy market analyst, analyze this real-time data:
            Location: ${latitude}, ${longitude}
            Weather: ${realWeatherData.condition}, ${realWeatherData.temperature}°C, ${realWeatherData.cloudCover}% cloud cover
            Current Supply: ${realtimeSupply} kW
            Current Demand: ${realtimeDemand} kW
            
            Provide a brief market insight (max 50 words) focusing on:
            1. Short-term price trend prediction
            2. Grid stability factors
            3. Optimal trading time recommendations
            
            Return JSON: {"insight": "text", "trend": "up/down/stable", "optimal_time": "morning/afternoon/evening"}`;
            
            const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
            const result = await model.generateContent(marketPrompt);
            const response = await result.response;
            const text = response.text();
            if (text) {
              aiEnhancedData = JSON.parse(text.replace(/```json\n?|```\n?/g, '').trim());
              
              // Cache the result for 5 minutes
              (this.constructor as typeof DatabaseStorage).aiInsightCache.set(cacheKey, {
                data: aiEnhancedData,
                timestamp: Date.now()
              });
              
              console.log(`🤖 Gemini AI market insight (fresh):`, aiEnhancedData);
            }
          }
        } catch (error: any) {
          console.log(`🤖 Gemini AI enhancement skipped:`, error?.message || String(error));
          
          // Use fallback insight if API fails
          aiEnhancedData = {
            insight: `${realtimeSupply < realtimeDemand ? 'High demand may increase prices' : 'Stable supply-demand balance'}. Weather: ${realWeatherData.condition}.`,
            trend: realtimeSupply < realtimeDemand ? 'up' : 'stable',
            optimal_time: 'afternoon'
          };
        }
      }

      console.log(`⚡ Real-time market calculation:`);
      console.log(`   Supply: ${realtimeSupply} kW (${realWeatherData.condition}, ${weatherMultiplier.toFixed(2)}x)`);
      console.log(`   Demand: ${realtimeDemand} kW (temp: ${realWeatherData.temperature}°C)`);
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
        aiInsight: aiEnhancedData // Include Gemini AI predictions for improved market analysis
      };
      
    } catch (error) {
      console.error('Failed to get real-time weather, using fallback:', error);
      // Fallback to existing logic if weather service fails
      const recentReadings = await db
        .select()
        .from(energyReadings)
        .orderBy(desc(energyReadings.timestamp))
        .limit(5);
      
      const totalSupply = recentReadings.reduce((sum: number, reading: EnergyReading) => sum + reading.solarGeneration, 0);
      const totalDemand = recentReadings.reduce((sum: number, reading: EnergyReading) => sum + reading.energyConsumption, 0);
      
      const latestReading = recentReadings[0];
      const weather = latestReading ? {
        condition: latestReading.weatherCondition || 'sunny',
        temperature: latestReading.temperature || 25,
        efficiency: latestReading.weatherCondition === 'sunny' ? 90 : 
                   latestReading.weatherCondition === 'cloudy' ? 70 : 50
      } : {
        condition: 'sunny',
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

  async getNetworkAnalytics(): Promise<any> {
    const db = await this.getDb();
    
    // Get actual counts from database
    const householdCount = await db.select({ count: count() }).from(households);
    const totalHouseholds = householdCount[0]?.count || 0;
    
    const tradeCount = await db.select({ count: count() }).from(energyTrades);
    const totalTrades = tradeCount[0]?.count || 0;
    
    // Calculate totals from actual household data
    const allHouseholds = await db.select().from(households);
    const totalGeneration = allHouseholds.reduce((sum: number, h: Household) => sum + h.solarCapacity, 0);
    const totalStorage = allHouseholds.reduce((sum: number, h: Household) => sum + h.batteryCapacity, 0);
    
    // Calculate average price from recent trades
    const recentTrades = await db
      .select()
      .from(energyTrades)
      .where(eq(energyTrades.status, 'completed'))
      .orderBy(desc(energyTrades.createdAt))
      .limit(10);
    
    const avgPrice = recentTrades.length > 0 ? 
      recentTrades.reduce((sum: number, trade: EnergyTrade) => sum + trade.pricePerKwh, 0) / recentTrades.length / 100 :
      4.50;
    
    // Get actual count of online households
    const onlineHouseholdCount = await db.select({ count: count() })
      .from(households)
      .where(eq(households.isOnline, true));
    const activeHouseholds = onlineHouseholdCount[0]?.count || 0;
    
    return {
      network: {
        totalHouseholds,
        activeHouseholds,
        totalGenerationCapacity: `${Math.round(totalGeneration / 1000)}kW`,
        totalStorageCapacity: `${totalStorage}kWh`,
        storageUtilization: '65%'
      },
      trading: {
        totalTrades,
        averagePrice: avgPrice.toFixed(2),
        carbonSaved: `${(totalTrades * 2.5).toFixed(1)}kg`
      },
      efficiency: {
        networkEfficiency: '92%',
        averageDistance: '2.3km'
      }
    };
  }

  async getChatResponse(message: string, userId?: number): Promise<any> {
    // Simple chat response for now - AI service integration can be added later
    return {
      response: "Thank you for your message. How can I help you with your energy optimization today?",
      confidence: 0.8
    };
  }

  // Helper method to get current storage status
  getStorageStatus(): { type: 'database' | 'memory'; available: boolean } {
    return {
      type: 'database',
      available: true
    };
  }

  // Session management for DatabaseStorage
  async createSession(sessionId: string, userId: number): Promise<void> {
    const db = await this.getDb();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24); // 24 hour expiry
    
    await db.insert(userSessions).values({
      sessionId,
      userId,
      expiresAt,
    });
  }

  async getSessionUser(sessionId: string): Promise<User | null> {
    const db = await this.getDb();
    const now = new Date();
    const [session] = await db
      .select({ userId: userSessions.userId })
      .from(userSessions)
      .where(and(
        eq(userSessions.sessionId, sessionId),
        // Check if session hasn't expired (use sql for comparison)
        sql`expires_at > NOW()`
      ));
    
    if (!session) return null;
    
    const user = await this.getUser(session.userId);
    return user || null;
  }

  async deleteSession(sessionId: string): Promise<void> {
    const db = await this.getDb();
    await db.delete(userSessions).where(eq(userSessions.sessionId, sessionId));
  }

  // Trade acceptance methods
  async createTradeAcceptance(acceptance: InsertTradeAcceptance): Promise<TradeAcceptance> {
    const db = await this.getDb();
    const [result] = await db.insert(tradeAcceptances).values(acceptance).returning();
    return result;
  }

  async getTradeAcceptancesByTrade(tradeId: number): Promise<TradeAcceptance[]> {
    const db = await this.getDb();
    return await db.select().from(tradeAcceptances).where(eq(tradeAcceptances.tradeId, tradeId));
  }

  async getTradeAcceptancesByUser(userId: number): Promise<TradeAcceptance[]> {
    const db = await this.getDb();
    return await db.select().from(tradeAcceptances).where(eq(tradeAcceptances.acceptorUserId, userId));
  }

  async updateTradeAcceptanceStatus(id: number, status: string): Promise<TradeAcceptance | undefined> {
    const db = await this.getDb();
    const [result] = await db.update(tradeAcceptances)
      .set({ status })
      .where(eq(tradeAcceptances.id, id))
      .returning();
    return result || undefined;
  }

  async getAvailableOffersForUser(userId: number): Promise<any[]> {
    const db = await this.getDb();
    
    // Get user's household IDs to exclude their own offers
    const userHouseholds = await db.select({ id: households.id })
      .from(households)
      .where(eq(households.userId, userId));
    
    const householdIds = userHouseholds.map((h: { id: number }) => h.id);
    
    // Get pending trades that don't belong to this user
    const availableOffers = await db
      .select({
        trade: energyTrades,
        household: households,
        user: {
          username: users.username,
          email: users.email,
          phone: users.phone,
          state: users.state,
          district: users.district,
        }
      })
      .from(energyTrades)
      .leftJoin(households, eq(energyTrades.sellerHouseholdId, households.id))
      .leftJoin(users, eq(households.userId, users.id))
      .where(
        and(
          eq(energyTrades.status, 'pending'),
          // Exclude user's own trades
          householdIds.length > 0 ? 
            and(
              ne(energyTrades.sellerHouseholdId, householdIds[0]),
              ne(energyTrades.buyerHouseholdId, householdIds[0])
            ) : 
            sql`1=1`
        )
      )
      .orderBy(desc(energyTrades.createdAt));
    
    return availableOffers;
  }

  // Get applications TO user's trades (people who want to accept their trades)
  async getApplicationsToMyTrades(userId: number): Promise<any[]> {
    const db = await this.getDb();
    
    // Get user's household IDs to find their trades
    const userHouseholds = await db.select({ id: households.id })
      .from(households)
      .where(eq(households.userId, userId));
    
    const householdIds = userHouseholds.map((h: { id: number }) => h.id);
    
    if (householdIds.length === 0) {
      return [];
    }
    
    // Get all applications to user's trades
    const applications = await db
      .select({
        acceptance: tradeAcceptances,
        trade: energyTrades,
        applicant: {
          id: users.id,
          username: users.username,
          email: users.email,
          phone: users.phone,
          state: users.state,
          district: users.district,
        },
        applicantHousehold: {
          id: households.id,
          name: households.name,
        }
      })
      .from(tradeAcceptances)
      .innerJoin(energyTrades, eq(tradeAcceptances.tradeId, energyTrades.id))
      .innerJoin(users, eq(tradeAcceptances.acceptorUserId, users.id))
      .leftJoin(households, eq(users.id, households.userId))
      .where(
        or(
          and(
            eq(energyTrades.tradeType, 'sell'),
            inArray(energyTrades.sellerHouseholdId, householdIds)
          ),
          and(
            eq(energyTrades.tradeType, 'buy'),
            inArray(energyTrades.buyerHouseholdId, householdIds)
          )
        )
      )
      .orderBy(desc(tradeAcceptances.acceptedAt));
    
    return applications;
  }

  async shareContactInfo(acceptanceId: number): Promise<any> {
    const db = await this.getDb();
    
    // Get the acceptance with related trade and user info
    const acceptance = await db
      .select({
        acceptance: tradeAcceptances,
        trade: energyTrades,
        acceptorUser: {
          id: users.id,
          username: users.username,
          email: users.email,
          phone: users.phone,
        }
      })
      .from(tradeAcceptances)
      .leftJoin(energyTrades, eq(tradeAcceptances.tradeId, energyTrades.id))
      .leftJoin(users, eq(tradeAcceptances.acceptorUserId, users.id))
      .where(eq(tradeAcceptances.id, acceptanceId))
      .limit(1);
    
    if (acceptance.length === 0) {
      throw new Error('Trade acceptance not found');
    }
    
    // Mark contact as shared
    await this.updateTradeAcceptanceStatus(acceptanceId, 'contacted');
    
    return {
      acceptance: acceptance[0].acceptance,
      trade: acceptance[0].trade,
      contactInfo: acceptance[0].acceptorUser,
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

  async getEnergyTradesByUser(userId: number, limit?: number): Promise<EnergyTrade[]> {
    if (this.isDatabaseAvailable && this.databaseStorage) {
      try {
        return await this.databaseStorage.getEnergyTradesByUser(userId, limit);
      } catch (error) {
        console.warn('Database getEnergyTradesByUser failed, falling back to memory:', error);
        this.isDatabaseAvailable = false;
      }
    }
    return await this.memoryStorage.getEnergyTradesByUser(userId, limit);
  }

  async getEnergyTradeById(id: number): Promise<EnergyTrade | undefined> {
    if (this.isDatabaseAvailable && this.databaseStorage) {
      try {
        return await this.databaseStorage.getEnergyTradeById(id);
      } catch (error) {
        console.warn('Database getEnergyTradeById failed, falling back to memory:', error);
        this.isDatabaseAvailable = false;
      }
    }
    return await this.memoryStorage.getEnergyTradeById(id);
  }

  async updateEnergyTrade(id: number, updates: Partial<EnergyTrade>): Promise<EnergyTrade | undefined> {
    if (this.isDatabaseAvailable && this.databaseStorage) {
      try {
        return await this.databaseStorage.updateEnergyTrade(id, updates);
      } catch (error) {
        console.warn('Database updateEnergyTrade failed, falling back to memory:', error);
        this.isDatabaseAvailable = false;
      }
    }
    return await this.memoryStorage.updateEnergyTrade(id, updates);
  }

  async deleteEnergyTrade(id: number): Promise<boolean> {
    if (this.isDatabaseAvailable && this.databaseStorage) {
      try {
        return await this.databaseStorage.deleteEnergyTrade(id);
      } catch (error) {
        console.warn('Database deleteEnergyTrade failed, falling back to memory:', error);
        this.isDatabaseAvailable = false;
      }
    }
    return await this.memoryStorage.deleteEnergyTrade(id);
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

  async getEnergyReadings(limit?: number): Promise<EnergyReading[]> {
    if (this.isDatabaseAvailable && this.databaseStorage) {
      try {
        return await this.databaseStorage.getEnergyReadings(limit);
      } catch (error) {
        console.warn('Database getEnergyReadings failed, falling back to memory:', error);
        this.isDatabaseAvailable = false;
      }
    }
    return await this.memoryStorage.getEnergyReadings(limit);
  }

  async getRealtimeMarketData(latitude: number, longitude: number): Promise<any> {
    if (this.isDatabaseAvailable && this.databaseStorage) {
      try {
        return await this.databaseStorage.getRealtimeMarketData(latitude, longitude);
      } catch (error) {
        console.warn('Database getRealtimeMarketData failed, falling back to memory:', error);
        this.isDatabaseAvailable = false;
      }
    }
    return await this.memoryStorage.getRealtimeMarketData(latitude, longitude);
  }

  async getNetworkAnalytics(): Promise<any> {
    if (this.isDatabaseAvailable && this.databaseStorage) {
      try {
        return await this.databaseStorage.getNetworkAnalytics();
      } catch (error) {
        console.warn('Database getNetworkAnalytics failed, falling back to memory:', error);
        this.isDatabaseAvailable = false;
      }
    }
    return await this.memoryStorage.getNetworkAnalytics();
  }

  async getChatResponse(message: string, userId?: number): Promise<any> {
    if (this.isDatabaseAvailable && this.databaseStorage) {
      try {
        return await this.databaseStorage.getChatResponse(message, userId);
      } catch (error) {
        console.warn('Database getChatResponse failed, falling back to memory:', error);
        this.isDatabaseAvailable = false;
      }
    }
    return await this.memoryStorage.getChatResponse(message, userId);
  }

  // Helper method to get current storage status
  getStorageStatus(): { type: 'database' | 'memory'; available: boolean } {
    return {
      type: this.isDatabaseAvailable ? 'database' : 'memory',
      available: true
    };
  }

  // Session management for HybridStorage
  async createSession(sessionId: string, userId: number): Promise<void> {
    if (this.isDatabaseAvailable && this.databaseStorage) {
      try {
        await this.databaseStorage.createSession(sessionId, userId);
        return;
      } catch (error) {
        console.warn('Database createSession failed, falling back to memory:', error);
        this.isDatabaseAvailable = false;
      }
    }
    await this.memoryStorage.createSession(sessionId, userId);
  }

  async getSessionUser(sessionId: string): Promise<User | null> {
    if (this.isDatabaseAvailable && this.databaseStorage) {
      try {
        return await this.databaseStorage.getSessionUser(sessionId);
      } catch (error) {
        console.warn('Database getSessionUser failed, falling back to memory:', error);
        this.isDatabaseAvailable = false;
      }
    }
    return await this.memoryStorage.getSessionUser(sessionId);
  }

  async deleteSession(sessionId: string): Promise<void> {
    if (this.isDatabaseAvailable && this.databaseStorage) {
      try {
        await this.databaseStorage.deleteSession(sessionId);
        return;
      } catch (error) {
        console.warn('Database deleteSession failed, falling back to memory:', error);
        this.isDatabaseAvailable = false;
      }
    }
    await this.memoryStorage.deleteSession(sessionId);
  }

  // Trade acceptance methods
  async createTradeAcceptance(acceptance: InsertTradeAcceptance): Promise<TradeAcceptance> {
    if (this.isDatabaseAvailable && this.databaseStorage) {
      try {
        return await this.databaseStorage.createTradeAcceptance(acceptance);
      } catch (error) {
        console.warn('Database createTradeAcceptance failed, falling back to memory:', error);
        this.isDatabaseAvailable = false;
      }
    }
    return await this.memoryStorage.createTradeAcceptance(acceptance);
  }

  async getTradeAcceptancesByTrade(tradeId: number): Promise<TradeAcceptance[]> {
    if (this.isDatabaseAvailable && this.databaseStorage) {
      try {
        return await this.databaseStorage.getTradeAcceptancesByTrade(tradeId);
      } catch (error) {
        console.warn('Database getTradeAcceptancesByTrade failed, falling back to memory:', error);
        this.isDatabaseAvailable = false;
      }
    }
    return await this.memoryStorage.getTradeAcceptancesByTrade(tradeId);
  }

  async getTradeAcceptancesByUser(userId: number): Promise<TradeAcceptance[]> {
    if (this.isDatabaseAvailable && this.databaseStorage) {
      try {
        return await this.databaseStorage.getTradeAcceptancesByUser(userId);
      } catch (error) {
        console.warn('Database getTradeAcceptancesByUser failed, falling back to memory:', error);
        this.isDatabaseAvailable = false;
      }
    }
    return await this.memoryStorage.getTradeAcceptancesByUser(userId);
  }

  async updateTradeAcceptanceStatus(id: number, status: string): Promise<TradeAcceptance | undefined> {
    if (this.isDatabaseAvailable && this.databaseStorage) {
      try {
        return await this.databaseStorage.updateTradeAcceptanceStatus(id, status);
      } catch (error) {
        console.warn('Database updateTradeAcceptanceStatus failed, falling back to memory:', error);
        this.isDatabaseAvailable = false;
      }
    }
    return await this.memoryStorage.updateTradeAcceptanceStatus(id, status);
  }

  async getAvailableOffersForUser(userId: number): Promise<any[]> {
    if (this.isDatabaseAvailable && this.databaseStorage) {
      try {
        return await this.databaseStorage.getAvailableOffersForUser(userId);
      } catch (error) {
        console.warn('Database getAvailableOffersForUser failed, falling back to memory:', error);
        this.isDatabaseAvailable = false;
      }
    }
    return await this.memoryStorage.getAvailableOffersForUser(userId);
  }

  async shareContactInfo(acceptanceId: number): Promise<any> {
    if (this.isDatabaseAvailable && this.databaseStorage) {
      try {
        return await this.databaseStorage.shareContactInfo(acceptanceId);
      } catch (error) {
        console.warn('Database shareContactInfo failed, falling back to memory:', error);
        this.isDatabaseAvailable = false;
      }
    }
    return await this.memoryStorage.shareContactInfo(acceptanceId);
  }

  async getApplicationsToMyTrades(userId: number): Promise<any[]> {
    if (this.isDatabaseAvailable && this.databaseStorage) {
      try {
        return await this.databaseStorage.getApplicationsToMyTrades(userId);
      } catch (error) {
        console.warn('Database getApplicationsToMyTrades failed, falling back to memory:', error);
        this.isDatabaseAvailable = false;
      }
    }
    return await this.memoryStorage.getApplicationsToMyTrades(userId);
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
