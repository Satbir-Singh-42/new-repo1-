import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { initializeDatabase } from "./db";
import { storage } from "./storage";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

export function createServer() {
  const app = express();
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));

  app.use((req, res, next) => {
    const start = Date.now();
    const path = req.path;
    let capturedJsonResponse: Record<string, any> | undefined = undefined;

    const originalResJson = res.json;
    res.json = function (bodyJson, ...args) {
      capturedJsonResponse = bodyJson;
      return originalResJson.apply(res, [bodyJson, ...args]);
    };

    res.on("finish", () => {
      const duration = Date.now() - start;
      if (path.startsWith("/api")) {
        let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
        if (capturedJsonResponse) {
          logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
        }

        if (logLine.length > 80) {
          logLine = logLine.slice(0, 79) + "…";
        }

        log(logLine);
      }
    });

    next();
  });



  return app;
}

// For local development - this ensures local dev always works
if (process.env.NODE_ENV !== "production") {
  (async () => {
    // Initialize database connection and check status
    const isDatabaseConnected = await initializeDatabase();
    
    // Wait for hybrid storage to complete its database connection check
    if ('waitForConnectionCheck' in storage && typeof storage.waitForConnectionCheck === 'function') {
      await storage.waitForConnectionCheck();
    }
    
    // Check if storage has getStorageStatus method
    let storageStatus;
    if ('getStorageStatus' in storage && typeof storage.getStorageStatus === 'function') {
      storageStatus = storage.getStorageStatus();
    } else {
      // Direct DatabaseStorage without getStorageStatus method
      storageStatus = { type: 'database', available: true };
    }
    
    log(`Database connection: ${isDatabaseConnected ? '✓ Connected' : '✗ Not connected'}`);
    log(`Storage type: ${storageStatus.type}`);
    
    const app = createServer();
    const server = await registerRoutes(app);

    // importantly only setup vite in development and after
    // setting up all the other routes so the catch-all route
    // doesn't interfere with the other routes
    if (app.get("env") === "development") {
      await setupVite(app, server);
    } else {
      serveStatic(app);
    }

    // ALWAYS serve the app on port 5000
    // this serves both the API and the client.
    // It is the only port that is not firewalled.
    const port = 5000;
    const host = "0.0.0.0";
    const canReuse = process.platform !== "win32"; // true on Linux/macOS

    server.listen(
      {
        port,
        host,
        ...(canReuse ? { reusePort: true } : {}),
      },
      () => {
        log(`serving on http://${host}:${port}`);
      }
    );
  })();
}

// Export for production use
export async function startProductionServer() {
  // Initialize database connection and check status
  const isDatabaseConnected = await initializeDatabase();
  
  // Wait for hybrid storage to complete its database connection check
  if ('waitForConnectionCheck' in storage && typeof storage.waitForConnectionCheck === 'function') {
    await storage.waitForConnectionCheck();
  }
  
  // Check if storage has getStorageStatus method
  let storageStatus;
  if ('getStorageStatus' in storage && typeof storage.getStorageStatus === 'function') {
    storageStatus = storage.getStorageStatus();
  } else {
    // Direct DatabaseStorage without getStorageStatus method
    storageStatus = { type: 'database', available: true };
  }
  
  console.log(`Database connection: ${isDatabaseConnected ? '✓ Connected' : '✗ Not connected'}`);
  console.log(`Storage type: ${storageStatus.type}`);
  
  const app = createServer();
  
  // Register API routes first
  const server = await registerRoutes(app);
  
  // Setup static file serving for production
  serveStatic(app);
  
  const port = parseInt(process.env.PORT || '10000', 10);
  const host = '0.0.0.0';
  
  server.listen(port, host, () => {
    console.log(`🚀 SolarScope AI server running on port ${port}`);
    console.log(`🌐 Health check available at: http://${host}:${port}/api/health`);
  });
  
  return server;
}

// Run production server if this file is executed directly
if (process.env.NODE_ENV === 'production' && import.meta.url === `file://${process.argv[1]}`) {
  startProductionServer().catch((error) => {
    console.error('❌ Failed to start production server:', error);
    process.exit(1);
  });
}
