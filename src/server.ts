import { Database } from "bun:sqlite";
import { join } from "path";

const isDev = process.env.NODE_ENV !== "production";
const dbPath = process.env.DB_PATH || (isDev ? "shitty.db" : "/app/data/shitty.db");

// Initialize database with error handling
let db: Database;
try {
  db = new Database(dbPath);
  console.log(`[INFO] Database initialized at: ${dbPath}`);
} catch (error) {
  console.error(`[ERROR] Failed to initialize database at ${dbPath}:`, error);
  throw error;
}

const PWA_APP_VERSION = "v1.0.9-simple";
const JSON_HEADERS = { "Content-Type": "application/json" };

function createErrorResponse(message: string, status: number = 400) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: JSON_HEADERS,
  });
}

// Initialize database
try {
  await db.exec(`
    CREATE TABLE IF NOT EXISTS kinobi_instances (
      sync_id TEXT PRIMARY KEY,
      tenders TEXT DEFAULT '[]',
      tending_log TEXT DEFAULT '[]',
      last_tended_timestamp INTEGER,
      last_tender TEXT,
      chores TEXT DEFAULT '[]'
    )
  `);
  console.log("[INFO] Database table created/verified");
} catch (error) {
  console.error("[ERROR] Failed to create database table:", error);
  throw error;
}

// Database schema migration
function migrateDatabase() {
  try {
    // Check if new columns exist, add them if they don't
    const checkConfigColumn = db.query("PRAGMA table_info(kinobi_instances)");
    const columns = checkConfigColumn.all() as any[];
    
    const hasConfig = columns.some(col => col.name === 'config');
    const hasTenderScores = columns.some(col => col.name === 'tender_scores');
    
    if (!hasConfig) {
      db.query("ALTER TABLE kinobi_instances ADD COLUMN config TEXT").run();
      console.log("Added config column to database");
    }
    
    if (!hasTenderScores) {
      db.query("ALTER TABLE kinobi_instances ADD COLUMN tender_scores TEXT").run();
      console.log("Added tender_scores column to database");
    }
  } catch (error) {
    console.warn("Database migration warning:", error);
  }
}

// Run migration on startup
migrateDatabase();

// Helper functions
// Migration function to add new fields to existing chores
function migrateChore(chore: any): any {
  // Add missing fields with defaults if they don't exist
  return {
    id: chore.id,
    name: chore.name,
    icon: chore.icon,
    cycleDuration: chore.cycleDuration || 24, // Default 24 hours
    points: chore.points || 10, // Default 10 points
    lastCompleted: chore.lastCompleted || null,
    dueDate: chore.dueDate || null,
  };
}

// Default configuration
function getDefaultConfig() {
  return {
    defaultCycleDuration: 24, // 24 hours
    defaultPoints: 10, // 10 points per chore
    warningThreshold: 75, // Show yellow at 75%
    urgentThreshold: 90, // Show red at 90%
  };
}

async function getInstanceData(syncId: string) {
  try {
    console.log(`[DEBUG] Getting instance data for syncId: ${syncId}`);
    
    const query = db.query(`
      SELECT tenders, tending_log, last_tended_timestamp, last_tender, chores, config, tender_scores 
      FROM kinobi_instances WHERE sync_id = ?
    `);
    
    let result = query.get(syncId) as any;
    console.log(`[DEBUG] Database query result:`, result ? 'found' : 'not found');
    
    if (!result) {
      console.log(`[INFO] Creating new instance for syncId: ${syncId}`);
      // Create default chore with new fields
      const defaultChore = {
        id: `chore_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        name: "Water the plants",
        icon: "🪴",
        cycleDuration: 24,
        points: 10,
        lastCompleted: null,
        dueDate: null,
      };
      
      const insertQuery = db.query(`
        INSERT INTO kinobi_instances (sync_id, tenders, tending_log, last_tended_timestamp, last_tender, chores, config, tender_scores) 
        VALUES (?, '[]', '[]', NULL, NULL, ?, ?, '[]')
      `);
      
      insertQuery.run(
        syncId, 
        JSON.stringify([defaultChore]),
        JSON.stringify(getDefaultConfig())
      );
      result = query.get(syncId);
      console.log(`[INFO] New instance created successfully`);
    }
    
    // Parse and migrate existing data
    let chores = JSON.parse(result.chores || "[]");
    chores = chores.map(migrateChore); // Ensure all chores have new fields
    
    let config = getDefaultConfig();
    if (result.config) {
      try {
        const savedConfig = JSON.parse(result.config);
        config = { ...config, ...savedConfig }; // Merge with defaults
      } catch (e) {
        console.warn("Invalid config JSON, using defaults");
      }
    }
    
    const instanceData = {
      tenders: JSON.parse(result.tenders || "[]"),
      tending_log: JSON.parse(result.tending_log || "[]"),
      last_tended_timestamp: result.last_tended_timestamp,
      last_tender: result.last_tender,
      chores: chores,
      config: config,
      tender_scores: JSON.parse(result.tender_scores || "[]"),
    };
    
    console.log(`[DEBUG] Returning instance data with ${chores.length} chores`);
    return instanceData;
    
  } catch (error) {
    console.error(`[ERROR] Failed to get instance data for ${syncId}:`, error);
    throw error;
  }
}

async function updateInstanceData(
  syncId: string,
  data: {
    tenders: any[];
    tending_log: any[];
    last_tended_timestamp: number | null;
    last_tender: string | null;
    chores: any[];
    config?: any;
    tender_scores?: any[];
  }
) {
  try {
    console.log(`[DEBUG] Updating instance data for syncId: ${syncId}`);
    
    const query = db.query(`
      UPDATE kinobi_instances 
      SET tenders = ?, tending_log = ?, last_tended_timestamp = ?, last_tender = ?, chores = ?, config = ?, tender_scores = ?
      WHERE sync_id = ?
    `);
    
    query.run(
      JSON.stringify(data.tenders),
      JSON.stringify(data.tending_log),
      data.last_tended_timestamp,
      data.last_tender,
      JSON.stringify(data.chores),
      JSON.stringify(data.config || {}),
      JSON.stringify(data.tender_scores || []),
      syncId
    );
    
    console.log(`[DEBUG] Instance data updated successfully for ${syncId}`);
  } catch (error) {
    console.error(`[ERROR] Failed to update instance data for ${syncId}:`, error);
    throw error;
  }
}

const server = Bun.serve({
  port: isDev ? 3000 : (process.env.PORT || 3000),
  hostname: process.env.HOST || "0.0.0.0",
  async fetch(req: Request) {
    const url = new URL(req.url);
    const pathParts = url.pathname.split("/").filter(p => p.trim() !== "");

    // Serve service worker
    if (url.pathname === "/sw.js") {
      const swFile = Bun.file(join(process.cwd(), "src/sw.js"));
      if (await swFile.exists()) {
        return new Response(swFile, {
          headers: {
            "Content-Type": "application/javascript",
            "Service-Worker-Allowed": "/",
            "Cache-Control": "no-cache, no-store, must-revalidate",
          },
        });
      }
    }

    // Serve manifest.json
    if (url.pathname === "/manifest.json") {
      const manifest = {
        name: "Kinobi",
        short_name: "Kinobi",
        display: "standalone",
        background_color: "#FEF3C7",
        theme_color: "#D97706",
        start_url: "/",
        scope: "/",
        icons: [
          {
            src: "data:image/svg+xml;charset=utf-8," + encodeURIComponent(`
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 192 192">
                <rect width="192" height="192" fill="#D97706" rx="24"/>
                <circle cx="96" cy="80" r="35" fill="#8B4513"/>
                <circle cx="96" cy="96" r="30" fill="#A0522D"/>
                <circle cx="96" cy="110" r="25" fill="#CD853F"/>
                <circle cx="85" cy="75" r="3" fill="white"/>
                <circle cx="107" cy="75" r="3" fill="white"/>
                <path d="M85 85 Q96 95 107 85" stroke="white" stroke-width="2" fill="none"/>
              </svg>
            `),
            sizes: "192x192",
            type: "image/svg+xml",
          },
          {
            src: "data:image/svg+xml;charset=utf-8," + encodeURIComponent(`
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
                <rect width="512" height="512" fill="#D97706" rx="64"/>
                <circle cx="256" cy="200" r="90" fill="#8B4513"/>
                <circle cx="256" cy="256" r="80" fill="#A0522D"/>
                <circle cx="256" cy="300" r="65" fill="#CD853F"/>
                <circle cx="230" cy="190" r="8" fill="white"/>
                <circle cx="282" cy="190" r="8" fill="white"/>
                <path d="M230 220 Q256 240 282 220" stroke="white" stroke-width="6" fill="none"/>
              </svg>
            `),
            sizes: "512x512",
            type: "image/svg+xml",
          },
        ],
      };
      return new Response(JSON.stringify(manifest, null, 2), {
        headers: { "Content-Type": "application/manifest+json" },
      });
    }

    // In dev mode, build and serve the client bundle on the fly
    if (isDev && url.pathname === "/client.js") {
      try {
        const result = await Bun.build({
          entrypoints: ["./src/client/main.tsx"],
          target: "browser",
          format: "esm",
          define: {
            "process.env.NODE_ENV": '"development"'
          },
          external: [], // Bundle everything for simplicity
        });

        if (result.outputs.length > 0) {
          const jsCode = await result.outputs[0].text();
          return new Response(jsCode, {
            headers: {
              "Content-Type": "application/javascript",
              "Cache-Control": "no-cache",
            },
          });
        }
      } catch (error) {
        console.error("Build error:", error);
        return new Response(`console.error("Build failed: ${error}");`, {
          headers: { "Content-Type": "application/javascript" },
        });
      }
    }

    // Serve built assets in production
    if (!isDev && url.pathname.startsWith("/dist/")) {
      const filePath = join(process.cwd(), url.pathname.slice(1));
      const file = Bun.file(filePath);
      if (await file.exists()) {
        return new Response(file);
      }
    }

    // Serve kinobi_alpha.gif from the project root
    if (url.pathname === "/kinobi_alpha.gif") {
      const imgFile = Bun.file(join(process.cwd(), "kinobi_alpha.gif"));
      if (await imgFile.exists()) {
        return new Response(imgFile, {
          headers: { "Content-Type": "image/gif" },
        });
      }
    }

    // API Routes
    if (pathParts[0] === "api" && pathParts.length >= 2) {
      const syncId = pathParts[1];
      const apiResource = pathParts.length > 2 ? pathParts[2] : null;
      const itemId = pathParts.length > 3 ? pathParts[3] : null;

      // Tenders API
      if (apiResource === "tenders") {
        let instanceData = await getInstanceData(syncId);
        
        if (req.method === "GET" && !itemId) {
          return new Response(JSON.stringify(instanceData.tenders), {
            headers: JSON_HEADERS,
          });
        } else if (req.method === "POST" && !itemId) {
          const { name } = await req.json();
          if (!name || typeof name !== "string") {
            return createErrorResponse("Invalid name for tender");
          }
          const newTender = { 
            id: `c_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`, 
            name: name.trim() 
          };
          instanceData.tenders.push(newTender);
          await updateInstanceData(syncId, instanceData);
          return new Response(JSON.stringify(newTender), {
            status: 201,
            headers: JSON_HEADERS,
          });
        } else if (req.method === "PUT" && itemId) {
          const { name } = await req.json();
          if (!name || typeof name !== "string") {
            return createErrorResponse("Invalid new name for tender");
          }
          const tenderIndex = instanceData.tenders.findIndex((c: any) => c.id === itemId);
          if (tenderIndex > -1) {
            instanceData.tenders[tenderIndex].name = name.trim();
            await updateInstanceData(syncId, instanceData);
            return new Response(JSON.stringify(instanceData.tenders[tenderIndex]), {
              headers: JSON_HEADERS,
            });
          }
          return createErrorResponse("Tender not found", 404);
        } else if (req.method === "DELETE" && itemId) {
          const initialLength = instanceData.tenders.length;
          instanceData.tenders = instanceData.tenders.filter((c: any) => c.id !== itemId);
          if (instanceData.tenders.length < initialLength) {
            await updateInstanceData(syncId, instanceData);
            return new Response(null, { status: 204 });
          }
          return createErrorResponse("Tender not found", 404);
        }
      }
      // Chores API
      else if (apiResource === "chores") {
        let instanceData = await getInstanceData(syncId);
        console.log(`[DEBUG] [API] /api/${syncId}/chores - method: ${req.method}, itemId: ${itemId}`);
        if (req.method === "GET" && !itemId) {
          console.log('[DEBUG] Returning chores:', instanceData.chores);
          return new Response(JSON.stringify(instanceData.chores), {
            headers: JSON_HEADERS,
          });
        } else if (req.method === "POST" && !itemId) {
          const body = await req.json();
          console.log('[DEBUG] Add chore payload:', body);
          const { name, icon, cycleDuration, points } = body;
          if (!name || typeof name !== "string" || !icon || typeof icon !== "string") {
            console.error('[ERROR] Invalid name or icon for chore');
            return createErrorResponse("Invalid name or icon for chore");
          }
          const newChore = { 
            id: `chore_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`, 
            name: name.trim(),
            icon: icon.trim(),
            cycleDuration: typeof cycleDuration === 'number' && cycleDuration > 0 ? cycleDuration : instanceData.config.defaultCycleDuration,
            points: typeof points === 'number' && points > 0 ? points : instanceData.config.defaultPoints,
            lastCompleted: null,
            dueDate: null,
          };
          instanceData.chores.push(newChore);
          await updateInstanceData(syncId, instanceData);
          console.log('[DEBUG] New chores list after add:', instanceData.chores);
          return new Response(JSON.stringify(newChore), {
            status: 201,
            headers: JSON_HEADERS,
          });
        } else if (req.method === "PUT" && itemId) {
          const body = await req.json();
          console.log('[DEBUG] Update chore payload:', body);
          const { name, icon, cycleDuration, points } = body;
          if ((!name || typeof name !== "string") && (!icon || typeof icon !== "string") && 
              (cycleDuration !== undefined && (typeof cycleDuration !== "number" || cycleDuration <= 0)) &&
              (points !== undefined && (typeof points !== "number" || points <= 0))) {
            console.error('[ERROR] Invalid chore data');
            return createErrorResponse("Invalid chore data");
          }
          const choreIndex = instanceData.chores.findIndex((c: any) => c.id === itemId);
          if (choreIndex > -1) {
            if (name) instanceData.chores[choreIndex].name = name.trim();
            if (icon) instanceData.chores[choreIndex].icon = icon.trim();
            if (cycleDuration !== undefined) instanceData.chores[choreIndex].cycleDuration = cycleDuration;
            if (points !== undefined) instanceData.chores[choreIndex].points = points;
            await updateInstanceData(syncId, instanceData);
            console.log('[DEBUG] New chores list after update:', instanceData.chores);
            return new Response(JSON.stringify(instanceData.chores[choreIndex]), {
              headers: JSON_HEADERS,
            });
          }
          console.error('[ERROR] Chore not found for update');
          return createErrorResponse("Chore not found", 404);
        } else if (req.method === "DELETE" && itemId) {
          const initialLength = instanceData.chores.length;
          instanceData.chores = instanceData.chores.filter((c: any) => c.id !== itemId);
          if (instanceData.chores.length < initialLength) {
            await updateInstanceData(syncId, instanceData);
            console.log('[DEBUG] New chores list after delete:', instanceData.chores);
            return new Response(null, { status: 204 });
          }
          console.error('[ERROR] Chore not found for delete');
          return createErrorResponse("Chore not found", 404);
        }
      }
      // History API
      else if (apiResource === "history") {
        let instanceData = await getInstanceData(syncId);
        
        if (req.method === "GET" && !itemId) {
          const sortedHistory = [...instanceData.tending_log].sort((a, b) => b.timestamp - a.timestamp);
          return new Response(JSON.stringify(sortedHistory), { 
            headers: JSON_HEADERS 
          });
        } else if (req.method === "DELETE" && itemId) {
          const initialLength = instanceData.tending_log.length;
          instanceData.tending_log = instanceData.tending_log.filter((entry: any) => entry.id !== itemId);

          if (instanceData.tending_log.length < initialLength) {
            if (instanceData.tending_log.length > 0) {
              const lastEntry = instanceData.tending_log.reduce((latest: any, entry: any) =>
                entry.timestamp > latest.timestamp ? entry : latest
              );
              instanceData.last_tended_timestamp = lastEntry.timestamp;
              instanceData.last_tender = lastEntry.person;
            } else {
              instanceData.last_tended_timestamp = null;
              instanceData.last_tender = null;
            }
            await updateInstanceData(syncId, instanceData);
            return new Response(null, { status: 204 });
          }
          return createErrorResponse("History entry not found", 404);
        }
      }
      // Tend Action API
      else if (apiResource === "tend" && req.method === "POST") {
        const { tender, choreId, notes } = await req.json();
        if (!tender || typeof tender !== "string" || !choreId || typeof choreId !== "string") {
          return createErrorResponse("Invalid tender or chore identifier");
        }
        const timestamp = Date.now();
        let instanceData = await getInstanceData(syncId);
        
        // Update chore completion data
        const choreIndex = instanceData.chores.findIndex((c: any) => c.id === choreId);
        if (choreIndex > -1) {
          instanceData.chores[choreIndex].lastCompleted = timestamp;
          // Calculate next due date
          const cycleDurationMs = instanceData.chores[choreIndex].cycleDuration * 60 * 60 * 1000; // Convert hours to milliseconds
          instanceData.chores[choreIndex].dueDate = timestamp + cycleDurationMs;
        }
        
        const newLogEntry = {
          id: `h_${timestamp}_${Math.random().toString(36).substring(2, 7)}`,
          timestamp,
          person: tender.trim(),
          chore_id: choreId.trim(),
          notes: notes && typeof notes === "string" ? notes.trim() : null,
        };
        instanceData.tending_log.push(newLogEntry);
        instanceData.last_tended_timestamp = timestamp;
        instanceData.last_tender = tender.trim();
        
        // Update tender scores
        const tenderName = tender.trim();
        let tenderScore = instanceData.tender_scores.find((ts: any) => ts.name === tenderName);
        if (!tenderScore) {
          const tenderId = instanceData.tenders.find((t: any) => t.name === tenderName)?.id || `tender_${Date.now()}`;
          tenderScore = {
            tenderId: tenderId,
            name: tenderName,
            totalPoints: 0,
            completionCount: 0,
            lastActivity: timestamp,
          };
          instanceData.tender_scores.push(tenderScore);
        }
        
        // Add points for this completion
        const chorePoints = choreIndex > -1 ? instanceData.chores[choreIndex].points : 10;
        tenderScore.totalPoints += chorePoints;
        tenderScore.completionCount += 1;
        tenderScore.lastActivity = timestamp;
        
        await updateInstanceData(syncId, instanceData);
        return new Response(JSON.stringify(newLogEntry), {
          status: 201,
          headers: JSON_HEADERS,
        });
      }
      // Last Tended API
      else if (apiResource === "last-tended" && req.method === "GET") {
        const instanceData = await getInstanceData(syncId);
        return new Response(
          JSON.stringify({
            lastTended: instanceData.last_tended_timestamp,
            lastTender: instanceData.last_tender,
          }),
          {
            headers: JSON_HEADERS,
          }
        );
      }
      // Configuration API
      else if (apiResource === "config") {
        let instanceData = await getInstanceData(syncId);
        
        if (req.method === "GET") {
          return new Response(JSON.stringify(instanceData.config), {
            headers: JSON_HEADERS,
          });
        } else if (req.method === "PUT") {
          const newConfig = await req.json();
          // Validate config fields
          if (typeof newConfig.defaultCycleDuration === 'number' && newConfig.defaultCycleDuration > 0 &&
              typeof newConfig.defaultPoints === 'number' && newConfig.defaultPoints > 0 &&
              typeof newConfig.warningThreshold === 'number' && newConfig.warningThreshold >= 0 && newConfig.warningThreshold <= 100 &&
              typeof newConfig.urgentThreshold === 'number' && newConfig.urgentThreshold >= 0 && newConfig.urgentThreshold <= 100) {
            instanceData.config = { ...instanceData.config, ...newConfig };
            await updateInstanceData(syncId, instanceData);
            return new Response(JSON.stringify(instanceData.config), {
              headers: JSON_HEADERS,
            });
          }
          return createErrorResponse("Invalid configuration values");
        }
      }
      // Leaderboard API
      else if (apiResource === "leaderboard" && req.method === "GET") {
        let instanceData = await getInstanceData(syncId);
        
        // Calculate scores for each tender
        const leaderboard = instanceData.tenders.map((tender: any) => {
          const completions = instanceData.tending_log.filter((entry: any) => entry.person === tender.name);
          const totalPoints = completions.reduce((sum: number, entry: any) => {
            const chore = instanceData.chores.find((c: any) => c.id === entry.chore_id);
            return sum + (chore?.points || 10); // Default 10 points if not found
          }, 0);
          
          const lastActivity = completions.length > 0 
            ? Math.max(...completions.map((c: any) => c.timestamp))
            : 0;
          
          const recentCompletions = completions
            .sort((a: any, b: any) => b.timestamp - a.timestamp)
            .slice(0, 5);
          
          return {
            tender: tender,
            score: {
              tenderId: tender.id,
              name: tender.name,
              totalPoints: totalPoints,
              completionCount: completions.length,
              lastActivity: lastActivity,
            },
            rank: 0, // Will be set after sorting
            recentCompletions: recentCompletions,
          };
        });
        
        // Sort by total points (descending) and assign ranks
        leaderboard.sort((a: any, b: any) => b.score.totalPoints - a.score.totalPoints);
        leaderboard.forEach((entry: any, index: number) => {
          entry.rank = index + 1;
        });
        
        return new Response(JSON.stringify(leaderboard), {
          headers: JSON_HEADERS,
        });
      }
      // App Version API
      else if (apiResource === "app-version" && req.method === "GET") {
        return new Response(JSON.stringify({ version: PWA_APP_VERSION }), {
          headers: JSON_HEADERS,
        });
      }

      return createErrorResponse("API endpoint not found or method not allowed.", 404);
    }

    // Serve the main HTML page
    const clientScript = isDev 
      ? `<script type="module" src="/client.js"></script>`
      : `<script type="module" src="/dist/main.js"></script>`;

    return new Response(
      `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
  <title>Kinobi</title>
  
  <!-- PWA Configuration -->
  <link rel="manifest" href="/manifest.json">
  <meta name="theme-color" content="#D97706">
  <meta name="mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-title" content="Shitty">
  
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    @layer base {
      * {
        box-sizing: border-box;
      }
      
      html, body, #root {
        height: 100vh;
        margin: 0;
        padding: 0;
        width: 100%;
      }
      
      body {
        overflow-x: hidden;
      }
    }

    @layer utilities {
      .shit-float {
        animation: floatingShit 3s ease-in-out infinite;
      }
      
      .shit-float-1 {
        animation: floatingShit 2.8s ease-in-out infinite 0s;
      }
      
      .shit-float-2 {
        animation: floatingShit 3.2s ease-in-out infinite 0.3s;
      }
      
      .shit-float-3 {
        animation: floatingShit 2.9s ease-in-out infinite 0.6s;
      }
      
      .shit-float-4 {
        animation: floatingShit 3.1s ease-in-out infinite 0.9s;
      }
      
      .shit-float-5 {
        animation: floatingShit 2.7s ease-in-out infinite 1.2s;
      }
      
      .shit-float-6 {
        animation: floatingShit 3.3s ease-in-out infinite 1.5s;
      }
      
      @keyframes floatingShit {
        0% { transform: translateY(0px); }
        50% { transform: translateY(-15px); }
        100% { transform: translateY(0px); }
      }
      
      .timeline-entry {
        position: relative;
        z-index: 10;
      }
      
      .timeline-entry:hover {
        transform: translateY(-2px) translateX(2px);
        box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
      }
      
      .timeline-dot {
        z-index: 20;
      }
      
      .timeline-entry:hover .timeline-dot {
        transform: scale(1.2);
        background-color: #d9f99d;
        border-color: #65a30d;
      }
      
      .timeline-entry:hover .timeline-dot-inner {
        background-color: #65a30d;
        transform: scale(1.2);
      }
    }
  </style>
  <script>
    window.PWA_CURRENT_APP_VERSION = "${PWA_APP_VERSION}";
  </script>
</head>
<body>
  <div id="root"></div>
  ${clientScript}
</body>
</html>`,
      {
        headers: {
          "content-type": "text/html",
        },
      }
    );
  }
});

const displayHost = process.env.HOST || "0.0.0.0";
console.log(`🚀 Kinobi server running on http://${displayHost}:${server.port} (${isDev ? 'development' : 'production'})`);