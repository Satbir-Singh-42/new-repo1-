import { Express } from "express";
import { storage } from "./storage";
import { User as SelectUser, signupSchema } from "@shared/schema";
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

declare global {
  namespace Express {
    interface User extends SelectUser {}
    interface Request {
      user?: SelectUser;
      isAuthenticated(): boolean;
      sessionId?: string;
    }
  }
}

// No longer using in-memory sessions - now using persistent database storage

export function generateSessionId(): string {
  // Use cryptographically secure random bytes for session generation
  return crypto.randomBytes(32).toString('hex');
}

export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 12; // Secure salt rounds
  return await bcrypt.hash(password, saltRounds);
}

export async function comparePasswords(supplied: string, stored: string): Promise<boolean> {
  return await bcrypt.compare(supplied, stored);
}

export function setupAuth(app: Express) {
  // Enhanced middleware to support both cookie and header sessions
  app.use(async (req, res, next) => {
    // Try to get session ID from cookies first, then headers
    let sessionId = req.cookies?.sessionId || req.headers['x-session-id'] as string;
    
    // If no session ID found, generate a new one for unauthenticated requests
    if (!sessionId) {
      sessionId = generateSessionId();
    }
    
    // Check if user exists in persistent session storage
    const user = await storage.getSessionUser(sessionId);
    // Debug logging removed to reduce console noise
    if (user) {
      req.user = user;
      // Set cookie for subsequent requests
      res.cookie('sessionId', sessionId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
      });
    }
    
    req.isAuthenticated = () => !!req.user;
    req.sessionId = sessionId;
    
    next();
  });

  // Simple login endpoint
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
      
      // Create session
      const sessionId = generateSessionId();
      await storage.createSession(sessionId, user.id);
      
      // Set session cookie
      res.cookie('sessionId', sessionId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
      });
      
      res.json({
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
        },
        sessionId
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ error: "Login failed" });
    }
  });

  // Logout endpoint
  app.post("/api/logout", async (req, res) => {
    const sessionId = req.sessionId;
    if (sessionId) {
      await storage.deleteSession(sessionId);
    }
    
    // Clear session cookie
    res.clearCookie('sessionId');
    
    res.json({ message: "Logged out successfully" });
  });

  // Get current user
  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    const user = req.user!;
    res.json({
      id: user.id,
      username: user.username,
      email: user.email,
    });
  });

  // Register endpoint with enhanced security
  app.post("/api/register", async (req, res) => {
    try {
      // Validate input with Zod schema
      const validationResult = signupSchema.safeParse(req.body);
      if (!validationResult.success) {
        const errorMessage = validationResult.error.errors[0]?.message || "Invalid input data";
        return res.status(400).json({ error: errorMessage });
      }

      const { username, email, password, phone, state, district, householdName, address, solarCapacity, batteryCapacity } = validationResult.data;
      
      // Sanitize input data
      const sanitizedData = {
        username: username.trim(),
        email: email.toLowerCase().trim(),
        phone: phone.trim(),
        state: state.trim(),
        district: district.trim(),
        householdName: householdName.trim(),
        address: address.trim(),
      };
      
      // Check for existing user by email
      const existingUser = await storage.getUserByEmail(sanitizedData.email);
      if (existingUser) {
        return res.status(400).json({ error: "Email already registered" });
      }

      // Check for existing user by username
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
        district: sanitizedData.district || null,
      });
      
      // Create household with sanitized data
      await storage.createHousehold({
        userId: newUser.id,
        name: sanitizedData.householdName,
        address: sanitizedData.address,
        solarCapacity: solarCapacity,
        batteryCapacity: batteryCapacity,
        currentBatteryLevel: 50, // Default 50%
      });
      
      // Auto-login
      const sessionId = generateSessionId();
      await storage.createSession(sessionId, newUser.id);
      
      // Set session cookie
      res.cookie('sessionId', sessionId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
      });
      
      res.json({
        user: {
          id: newUser.id,
          username: newUser.username,
          email: newUser.email,
        },
        sessionId
      });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({ error: "Registration failed" });
    }
  });
}