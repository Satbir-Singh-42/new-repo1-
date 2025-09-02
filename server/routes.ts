import { Express } from "express";
import { storage } from "./storage";
import { insertEnergyTradeSchema, insertHouseholdSchema, insertChatMessageSchema, insertTradeAcceptanceSchema } from "@shared/schema";
import { generateEnergyOptimizationResponse } from "./gemini-chat";
import { SimulationEngine } from "./simulation-engine";
import { emailService } from "./email-service";

export function setupRoutes(app: Express) {
  // Initialize simulation engine
  const simulationEngine = new SimulationEngine(storage);

  // Health check
  app.get("/api/health", async (req, res) => {
    try {
      const timestamp = new Date().toISOString();
      res.json({ status: "healthy", timestamp });
    } catch (error) {
      res.status(500).json({ error: "Health check failed" });
    }
  });

  // SIMPLE HOUSEHOLD ENDPOINTS
  app.get("/api/households", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const households = await storage.getHouseholdsByUser(req.user!.id);
      res.json(households);
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
        userId: req.user!.id
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

  // User Energy History/Activity Endpoint (replaces analyses)
  app.get("/api/analyses", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Authentication required" });
      }

      // Get user's energy trading activity as "analyses"
      const userTrades = await storage.getEnergyTradesByUser(req.user!.id);
      const userHouseholds = await storage.getHouseholdsByUser(req.user!.id);
      
      // Convert energy trades to analysis-like format
      const analyses = userTrades.map((trade: any) => ({
        id: trade.id,
        userId: req.user!.id,
        type: trade.tradeType, // 'buy' or 'sell'
        createdAt: trade.createdAt,
        results: {
          energyAmount: trade.energyAmount, // Energy is stored as kWh, no conversion needed
          pricePerKwh: trade.pricePerKwh / 100, // Convert to rupees (stored as cents)
          totalValue: trade.energyAmount * (trade.pricePerKwh / 100),
          status: trade.status,
          tradeType: trade.tradeType,
          householdType: trade.sellerHouseholdId ? 'seller' : 'buyer'
        },
        status: trade.status,
        householdId: trade.sellerHouseholdId || trade.buyerHouseholdId
      }));

      res.json(analyses);
    } catch (error) {
      res.status(500).json({ error: "Failed to get user energy activity" });
    }
  });

  // SIMPLE ENERGY TRADING ENDPOINTS
  app.get("/api/energy-trades", async (req, res) => {
    try {
      // Require authentication for energy trades
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
      // Get user's household
      const userHouseholds = await storage.getHouseholdsByUser(req.user!.id);
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
        sellerHouseholdId: tradeType === 'sell' ? userHouseholdId : undefined,
        buyerHouseholdId: tradeType === 'buy' ? userHouseholdId : undefined,
        energyAmount: parseFloat(energyAmount), // Store as actual kWh value
        pricePerKwh: Math.round(parseFloat(pricePerKwh) * 100), // Convert to cents
        tradeType
      };

      const trade = await storage.createEnergyTrade(tradeData);
      res.json({ success: true, trade });
    } catch (error) {
      console.error('Failed to create trade:', error);
      res.status(500).json({ error: "Failed to create trade" });
    }
  });

  // Update energy trade
  app.put("/api/energy-trades/:id", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const tradeId = parseInt(req.params.id);
      const { energyAmount, pricePerKwh, tradeType } = req.body;

      // Get the existing trade to verify ownership
      const existingTrade = await storage.getEnergyTradeById(tradeId);
      if (!existingTrade) {
        return res.status(404).json({ error: "Trade not found" });
      }

      // Get user's household to verify ownership
      const userHouseholds = await storage.getHouseholdsByUser(req.user!.id);
      const userHouseholdId = userHouseholds[0]?.id;
      
      if (!userHouseholdId || 
          (existingTrade.sellerHouseholdId !== userHouseholdId && 
           existingTrade.buyerHouseholdId !== userHouseholdId)) {
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
        pricePerKwh: Math.round(parseFloat(pricePerKwh) * 100), // Convert to cents
        tradeType,
        sellerHouseholdId: tradeType === 'sell' ? userHouseholdId : undefined,
        buyerHouseholdId: tradeType === 'buy' ? userHouseholdId : undefined,
      };

      const updatedTrade = await storage.updateEnergyTrade(tradeId, updatedTradeData);
      res.json({ success: true, trade: updatedTrade });
    } catch (error) {
      console.error('Failed to update trade:', error);
      res.status(500).json({ error: "Failed to update trade" });
    }
  });

  // Delete energy trade
  app.delete("/api/energy-trades/:id", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const tradeId = parseInt(req.params.id);

      // Get the existing trade to verify ownership
      const existingTrade = await storage.getEnergyTradeById(tradeId);
      if (!existingTrade) {
        return res.status(404).json({ error: "Trade not found" });
      }

      // Get user's household to verify ownership
      const userHouseholds = await storage.getHouseholdsByUser(req.user!.id);
      const userHouseholdId = userHouseholds[0]?.id;
      
      if (!userHouseholdId || 
          (existingTrade.sellerHouseholdId !== userHouseholdId && 
           existingTrade.buyerHouseholdId !== userHouseholdId)) {
        return res.status(403).json({ error: "You can only delete your own trades" });
      }

      await storage.deleteEnergyTrade(tradeId);
      res.json({ success: true, message: "Trade deleted successfully" });
    } catch (error) {
      console.error('Failed to delete trade:', error);
      res.status(500).json({ error: "Failed to delete trade" });
    }
  });

  // Energy readings endpoint
  app.get("/api/energy-readings", async (req, res) => {
    try {
      // Require authentication for energy readings
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Authentication required. Please log in to view energy readings." });
      }

      const readings = await storage.getEnergyReadings();
      res.json(readings);
    } catch (error) {
      res.status(500).json({ error: "Failed to get energy readings" });
    }
  });

  // Real-time market data
  app.get("/api/market/realtime", async (req, res) => {
    try {
      // Require authentication for market data
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Authentication required. Please log in to view market data." });
      }

      const { latitude, longitude } = req.query;
      
      if (!latitude || !longitude) {
        return res.status(400).json({ error: "Location required for accurate market data. Please provide latitude and longitude." });
      }

      const lat = parseFloat(latitude as string);
      const lon = parseFloat(longitude as string);
      
      if (isNaN(lat) || isNaN(lon)) {
        return res.status(400).json({ error: "Invalid coordinates. Latitude and longitude must be numbers." });
      }

      const marketData = await storage.getRealtimeMarketData(lat, lon);
      res.json(marketData);
    } catch (error) {
      console.error('Real-time market data error:', error);
      res.status(500).json({ error: "Failed to get market data" });
    }
  });

  // Network analytics
  app.get("/api/analytics/network", async (req, res) => {
    try {
      // Require authentication for network analytics
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Authentication required. Please log in to view network analytics." });
      }

      const analytics = await storage.getNetworkAnalytics();
      res.json(analytics);
    } catch (error) {
      res.status(500).json({ error: "Failed to get network analytics" });
    }
  });

  // Chat endpoint for AI assistant
  app.post("/api/ai/chat", async (req, res) => {
    try {
      // Require authentication for chat
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Authentication required. Please log in to use the chat." });
      }

      const { message } = req.body;
      if (!message) {
        return res.status(400).json({ error: "Message is required" });
      }

      // Get user info for chat message storage
      const userId = req.user?.id || null;
      const sessionId = req.sessionId || `session_${Date.now()}`;
      const username = req.user?.username || 'Anonymous';
      
      // Debug session info
      console.log('💬 Chat session debug:', {
        sessionId: req.sessionId,
        userId: req.user?.id,
        username: req.user?.username,
        isAuthenticated: req.isAuthenticated(),
        cookies: req.cookies,
        headers: req.headers['x-session-id']
      });

      // Save user message to database
      try {
        await storage.createChatMessage({
          userId,
          sessionId,
          username,
          message,
          type: 'user',
          category: 'energy-consultation'
        });
      } catch (error) {
        console.warn('Failed to save user message:', error);
      }

      // Use Gemini AI for chat responses
      try {
        // Get user context
        const households = req.user ? await storage.getHouseholdsByUser(req.user.id) : [];
        const userContext = {
          username,
          location: 'Ludhiana, Punjab, India', // From the logs we can see user is in Ludhiana
          households,
          energyData: households.length > 0
        };

        const response = await generateEnergyOptimizationResponse(message, userContext);
        
        // Save AI response to database
        try {
          await storage.createChatMessage({
            userId,
            sessionId,
            username: 'SolarSense AI',
            message: response,
            type: 'ai',
            category: 'energy-consultation'
          });
        } catch (error) {
          console.warn('Failed to save AI response:', error);
        }

        res.json({ 
          response, 
          category: 'energy-consultation' 
        });
      } catch (aiError) {
        console.error('Gemini AI error:', aiError);
        const errorResponse = "Energy assistant is temporarily unavailable. Please try again later.";
        
        // Save error response to database
        try {
          await storage.createChatMessage({
            userId,
            sessionId,
            username: 'SolarSense AI',
            message: errorResponse,
            type: 'system',
            category: 'error'
          });
        } catch (error) {
          console.warn('Failed to save error response:', error);
        }

        res.json({ 
          response: errorResponse, 
          category: 'error' 
        });
      }
    } catch (error: any) {
      console.error('Chat error:', error);
      const errorResponse = "I'm having trouble right now. Please try again in a moment.";
      
      // Try to save error message to database
      try {
        const userId = req.user?.id || null;
        const sessionId = req.sessionID || `session_${Date.now()}`;
        await storage.createChatMessage({
          userId,
          sessionId,
          username: 'SolarSense AI',
          message: errorResponse,
          type: 'system',
          category: 'error'
        });
      } catch (dbError) {
        console.warn('Failed to save error message to database:', dbError);
      }

      res.json({ 
        response: errorResponse, 
        category: 'error' 
      });
    }
  });

  // Get chat history
  app.get("/api/chat/messages", async (req, res) => {
    try {
      const { limit } = req.query;
      const messageLimit = limit ? parseInt(limit as string) : 50;
      
      let messages: any[];
      if (req.user?.id) {
        // Get messages for authenticated user
        messages = await storage.getChatMessagesByUser(req.user.id, messageLimit);
      } else if (req.sessionID) {
        // Get messages for session
        messages = await storage.getChatMessagesBySession(req.sessionID, messageLimit);
      } else {
        messages = [];
      }
      
      res.json(messages);
    } catch (error) {
      console.error('Failed to get chat messages:', error);
      res.status(500).json({ error: "Failed to get chat history" });
    }
  });

  // Clear chat history
  app.post("/api/chat/clear", async (req, res) => {
    try {
      if (req.sessionID) {
        await storage.clearSessionData(req.sessionID);
        res.json({ success: true, message: "Chat history cleared" });
      } else {
        res.status(400).json({ error: "No session found" });
      }
    } catch (error) {
      console.error('Failed to clear chat history:', error);
      res.status(500).json({ error: "Failed to clear chat history" });
    }
  });

  // SIMULATION ENDPOINTS

  // Get simulation status
  app.get("/api/simulation/status", async (req, res) => {
    try {
      const status = simulationEngine.getStatus();
      res.json(status);
    } catch (error) {
      console.error('Failed to get simulation status:', error);
      res.status(500).json({ error: "Failed to get simulation status" });
    }
  });

  // Start simulation
  app.post("/api/simulation/start", async (req, res) => {
    try {
      await simulationEngine.startSimulation();
      res.json({ 
        success: true, 
        message: "Simulation started successfully",
        isRunning: true 
      });
    } catch (error) {
      console.error('Failed to start simulation:', error);
      res.status(500).json({ error: "Failed to start simulation" });
    }
  });

  // Stop simulation
  app.post("/api/simulation/stop", async (req, res) => {
    try {
      simulationEngine.stopSimulation();
      res.json({ 
        success: true, 
        message: "Simulation stopped successfully",
        isRunning: false 
      });
    } catch (error) {
      console.error('Failed to stop simulation:', error);
      res.status(500).json({ error: "Failed to stop simulation" });
    }
  });

  // Change weather in simulation
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
        impact: `Solar efficiency: ${weather.condition === 'sunny' ? '95%' : weather.condition === 'stormy' ? '5%' : '50%'}`,
        weather 
      });
    } catch (error) {
      console.error('Failed to change weather:', error);
      res.status(500).json({ error: "Failed to change weather" });
    }
  });

  // Trigger power outage
  app.post("/api/simulation/outage", async (req, res) => {
    try {
      const { householdIds } = req.body;
      const outageResponse = await simulationEngine.triggerOutage(householdIds);
      res.json({
        success: true,
        message: `Power outage affecting ${householdIds?.length || 'random'} households`,
        outageResponse
      });
    } catch (error) {
      console.error('Failed to trigger outage:', error);
      res.status(500).json({ error: "Failed to trigger outage" });
    }
  });

  // Get ML optimization results
  app.get("/api/ml/optimization", async (req, res) => {
    try {
      const optimization = simulationEngine.getOptimizationResult();
      res.json({ optimization });
    } catch (error) {
      console.error('Failed to get optimization:', error);
      res.status(500).json({ error: "Failed to get optimization results" });
    }
  });

  // Get simulation analytics
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
          storageUtilization: `${Math.round((stats.batteryStorageTotal * 0.6 / stats.batteryStorageTotal) * 100)}%`
        },
        trading: {
          totalTrades: Math.round(stats.tradingVelocity * 10),
          totalEnergyTraded: `${stats.tradingVelocity * 24} kWh`,
          averagePrice: "₹4.2/kWh",
          carbonSaved: `${stats.carbonReduction} kg CO2`
        },
        efficiency: {
          averageDistance: "1.2 km",
          networkEfficiency: "89%"
        }
      };
      res.json(analytics);
    } catch (error) {
      console.error('Failed to get simulation analytics:', error);
      res.status(500).json({ error: "Failed to get simulation analytics" });
    }
  });

  // TRADE ACCEPTANCE ENDPOINTS - Peer-to-peer trading without payment processing
  
  // Get available offers for a user (exclude their own offers)
  app.get("/api/trade-offers", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const availableOffers = await storage.getAvailableOffersForUser(req.user!.id);
      res.json(availableOffers);
    } catch (error) {
      console.error('Failed to get available offers:', error);
      res.status(500).json({ error: "Failed to get available offers" });
    }
  });

  // Accept a trade offer
  app.post("/api/trade-acceptances", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const validation = insertTradeAcceptanceSchema.safeParse({
        ...req.body,
        acceptorUserId: req.user!.id
      });
      
      if (!validation.success) {
        return res.status(400).json({ error: validation.error.issues });
      }
      
      const acceptance = await storage.createTradeAcceptance(validation.data);
      
      // Send email notification to the offer creator
      try {
        // Get the trade details
        const trade = await storage.getEnergyTradeById(validation.data.tradeId);
        if (trade) {
          // Get the offer creator's information
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
            // Send email notification
            await emailService.sendTradeAcceptanceNotification({
              offerCreator: offerCreatorUser,
              acceptor: req.user!,
              trade: trade,
              household: household
            });
            console.log(`📧 Email notification sent to offer creator: ${offerCreatorUser.email}`);
          }
        }
      } catch (emailError) {
        console.error('Failed to send email notification:', emailError);
        // Don't fail the entire request if email fails
      }
      
      res.json({ 
        success: true, 
        acceptance, 
        message: "Trade offer accepted! The offer creator has been notified via email. Contact information will be shared for energy delivery coordination." 
      });
    } catch (error) {
      console.error('Failed to accept trade:', error);
      res.status(500).json({ error: "Failed to accept trade offer" });
    }
  });

  // Get trade acceptances for a user
  app.get("/api/trade-acceptances", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const acceptances = await storage.getTradeAcceptancesByUser(req.user!.id);
      res.json(acceptances);
    } catch (error) {
      console.error('Failed to get trade acceptances:', error);
      res.status(500).json({ error: "Failed to get trade acceptances" });
    }
  });

  // Get applications TO your trades (people who want to accept your trades)
  app.get("/api/my-trade-applications", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const applications = await storage.getApplicationsToMyTrades(req.user!.id);
      res.json(applications);
    } catch (error) {
      console.error('Failed to get trade applications:', error);
      res.status(500).json({ error: "Failed to get trade applications" });
    }
  });

  // Share contact information after acceptance
  app.post("/api/trade-acceptances/:id/share-contact", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const acceptanceId = parseInt(req.params.id);
      const contactInfo = await storage.shareContactInfo(acceptanceId);
      
      // Send email notification about contact sharing
      try {
        if (contactInfo.contactInfo && contactInfo.trade) {
          // Get the recipient (the other party in the trade)
          let recipientUser = null;
          
          // If current user is the acceptor, notify the offer creator
          // If current user is the offer creator, notify the acceptor
          if (contactInfo.acceptance?.acceptorUserId === req.user!.id) {
            // Current user is acceptor, notify offer creator
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
            // Current user is offer creator, notify acceptor
            recipientUser = await storage.getUser(contactInfo.acceptance!.acceptorUserId);
          }
          
          if (recipientUser) {
            await emailService.sendContactSharingNotification(
              recipientUser,
              req.user!,
              contactInfo.trade
            );
            console.log(`📧 Contact sharing notification sent to: ${recipientUser.email}`);
          }
        }
      } catch (emailError) {
        console.error('Failed to send contact sharing notification:', emailError);
        // Don't fail the entire request if email fails
      }
      
      res.json({
        success: true,
        message: "Contact information shared for energy delivery coordination. The other party has been notified via email.",
        contactInfo: contactInfo.contactInfo,
        trade: contactInfo.trade
      });
    } catch (error) {
      console.error('Failed to share contact info:', error);
      res.status(500).json({ error: "Failed to share contact information" });
    }
  });

  // Update trade acceptance status
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
      console.error('Failed to update trade acceptance:', error);
      res.status(500).json({ error: "Failed to update trade acceptance" });
    }
  });

  // Test email notification endpoint
  app.post("/api/test-email", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const { email } = req.body;
      const testEmail = email || req.user!.email;
      
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
      console.error('Failed to send test email:', error);
      res.status(500).json({ error: "Failed to send test email" });
    }
  });
}