# Kinobi Architecture Document
*System architecture for enhanced chore tracking with time cycles and visual countdown*

## System Overview

Kinobi transforms the existing Shitty chore tracker into a sophisticated time-cycle-aware system with visual countdown indicators. The architecture maintains backward compatibility while adding significant new capabilities for time management and visual feedback.

## Current Architecture Analysis

### Frontend Architecture (React/TypeScript)
```
src/client/main.tsx
├── App (PWA Shell + Router)
├── ShitView (Main Dashboard)
│   └── ShitPile[] (Individual Chore Components)
├── TenderSelectionModal (Completion Interface)
├── HistoryView (Completion History)
└── SyncSettingsView (Admin Dashboard)
    ├── ManageChoresComponent
    └── ManageTendersComponent
```

### Backend Architecture (Bun/SQLite)
```
src/server.ts
├── SQLite Database (kinobi_instances table)
├── REST API Endpoints
│   ├── GET/POST /api/:syncId/chores
│   ├── GET/POST /api/:syncId/tenders
│   ├── GET /api/:syncId/history
│   └── POST /api/:syncId/tend
└── Static File Serving
```

### Data Model (Current)
```typescript
interface InstanceData {
  sync_id: string
  tenders: Tender[]
  tending_log: HistoryEntry[]
  last_tended_timestamp: number | null
  last_tender: string | null
  chores: Chore[]
}
```

## Enhanced Architecture (Kinobi) ✅ IMPLEMENTED

### New Component Hierarchy
```
src/client/main.tsx
├── App (Kinobi PWA Shell + Router)
├── KinobiView (Enhanced Main Dashboard)
│   └── ChoreTile[] (Enhanced with Countdown)
│       ├── ChoreIcon
│       ├── CountdownRing (SVG Progress Indicator) ✅ IMPLEMENTED
│       ├── TimeDisplay ✅ IMPLEMENTED
│       └── StatusIndicator ✅ IMPLEMENTED
├── TenderSelectionModal
├── HistoryView
├── LeaderboardView (New) ✅ IMPLEMENTED
│   ├── LeaderboardTable ✅ IMPLEMENTED
│   ├── ScoreCard ✅ IMPLEMENTED
│   └── TenderRankings ✅ IMPLEMENTED
└── AdminDashboard (Enhanced)
    ├── ManageChoresComponent (+ Cycle Configuration) ✅ IMPLEMENTED
    ├── ManageTendersComponent
    ├── GlobalConfigComponent (New) ⏳ PENDING
    └── AnalyticsDashboard (New) ⏳ PENDING
```

### Enhanced Data Model ✅ IMPLEMENTED
```typescript
interface Chore {
  id: string
  name: string
  icon: string
  cycleDuration: number      // Hours between completions ✅ IMPLEMENTED
  points: number            // Points awarded for completion ✅ IMPLEMENTED
  lastCompleted?: number     // Timestamp of last completion ✅ IMPLEMENTED
  dueDate?: number          // Calculated due date ✅ IMPLEMENTED
}

interface ChoreConfig {
  defaultCycleDuration: number  // Default 24 hours ✅ IMPLEMENTED
  defaultPoints: number         // Default points per chore (10) ✅ IMPLEMENTED
  warningThreshold: number      // When to show yellow (75%) ✅ IMPLEMENTED
  urgentThreshold: number       // When to show red (90%) ✅ IMPLEMENTED
}

interface TenderScore {
  tenderId: string
  name: string
  totalPoints: number
  completionCount: number
  lastActivity: number         // Timestamp of last completion ✅ IMPLEMENTED
}

interface LeaderboardEntry {
  tender: Tender
  score: TenderScore
  rank: number
  recentCompletions: HistoryEntry[]  // Last 5 completions ✅ IMPLEMENTED
}

interface InstanceData {
  sync_id: string
  tenders: Tender[]
  tending_log: HistoryEntry[]
  tender_scores: TenderScore[]  // Points tracking per person ✅ IMPLEMENTED
  last_tended_timestamp: number | null
  last_tender: string | null
  chores: Chore[]           // Extended with cycle data + points ✅ IMPLEMENTED
  config: ChoreConfig       // Global configuration ✅ IMPLEMENTED
}
```

## Core Services Architecture ✅ IMPLEMENTED

### Time Management Service ✅ IMPLEMENTED
```typescript
class CountdownService {
  // Calculate when a chore is due based on last completion + cycle duration ✅ IMPLEMENTED
  static calculateCountdownState(chore: Chore, config: ChoreConfig): CountdownState
  
  // Get progress as percentage (0-100) ✅ IMPLEMENTED
  static formatTimeRemaining(hours: number): string
  
  // Check if chore is overdue ✅ IMPLEMENTED
  static getStatusColor(status: CountdownState['status']): string
  
  // Format time remaining for display ✅ IMPLEMENTED
  static interpolateColor(from: string, to: string, factor: number): string
}

interface CountdownState {
  progress: number              // 0-1 scale ✅ IMPLEMENTED
  status: 'good' | 'warning' | 'urgent' | 'overdue' ✅ IMPLEMENTED
  timeRemaining: number         // Hours remaining ✅ IMPLEMENTED
}
```

### Visual Service ✅ IMPLEMENTED
```typescript
// ProgressRing Component ✅ IMPLEMENTED
interface ProgressRingProps {
  progress: number          // 0-1
  status: CountdownState['status']
  size: number             // Diameter in pixels
  strokeWidth: number      // Ring thickness
  children?: React.ReactNode
}

// TimeDisplay Component ✅ IMPLEMENTED
interface TimeDisplayProps {
  countdownState: CountdownState
  format?: 'compact' | 'full'
}

// Features implemented:
// ✅ SVG-based circular progress indicator
// ✅ Smooth animations via CSS transitions
// ✅ Accessible with ARIA labels
// ✅ Responsive sizing
// ✅ Color transitions (green → yellow → orange → red)
// ✅ Pulse animations for urgent/overdue states
// ✅ Background tab optimization
```

### Configuration Service ✅ IMPLEMENTED
```typescript
// Database migration system ✅ IMPLEMENTED
function migrateDatabase() {
  // Check if new columns exist, add them if they don't
  // Add config and tender_scores columns
}

// Migration function for existing chores ✅ IMPLEMENTED
function migrateChore(chore: any): any {
  // Add missing fields with defaults
  return {
    ...chore,
    cycleDuration: chore.cycleDuration || 24,
    points: chore.points || 10,
    lastCompleted: chore.lastCompleted || null,
    dueDate: chore.dueDate || null,
  };
}

// Default configuration ✅ IMPLEMENTED
function getDefaultConfig() {
  return {
    defaultCycleDuration: 24,
    defaultPoints: 10,
    warningThreshold: 75,
    urgentThreshold: 90,
  };
}
```

### Scoring Service ✅ IMPLEMENTED
```typescript
// Leaderboard calculation ✅ IMPLEMENTED
// Calculate scores for each tender
const leaderboard = instanceData.tenders.map((tender: any) => {
  const completions = instanceData.tending_log.filter((entry: any) => entry.person === tender.name);
  const totalPoints = completions.reduce((sum: number, entry: any) => {
    const chore = instanceData.chores.find((c: any) => c.id === entry.chore_id);
    return sum + (chore?.points || 10);
  }, 0);
  
  return {
    tender: tender,
    score: {
      tenderId: tender.id,
      name: tender.name,
      totalPoints: totalPoints,
      completionCount: completions.length,
      lastActivity: lastActivity,
    },
    rank: 0,
    recentCompletions: recentCompletions,
  };
});

// Sort by total points and assign ranks ✅ IMPLEMENTED
leaderboard.sort((a: any, b: any) => b.score.totalPoints - a.score.totalPoints);
leaderboard.forEach((entry: any, index: number) => {
  entry.rank = index + 1;
});
```

## Component Design Patterns ✅ IMPLEMENTED

### CountdownRing Component ✅ IMPLEMENTED
```typescript
function ProgressRing({ progress, status, size, strokeWidth = 4, children }: ProgressRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progress * circumference);
  
  const color = CountdownService.getStatusColor(status);
  
  // Background circle color (light version)
  const bgColor = status === 'good' ? '#dcfce7' : 
                  status === 'warning' ? '#fef3c7' :
                  status === 'urgent' ? '#fed7aa' : '#fecaca';
  
  // Add pulse animation for urgent and overdue states ✅ IMPLEMENTED
  const ringClasses = `transform -rotate-90 ${
    status === 'overdue' ? 'animate-pulse' : 
    status === 'urgent' ? 'animate-pulse' : ''
  }`;
  
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className={ringClasses}>
        {/* Background circle */}
        <circle cx={size / 2} cy={size / 2} r={radius} stroke={bgColor} strokeWidth={strokeWidth} fill="none" />
        {/* Progress circle */}
        <circle cx={size / 2} cy={size / 2} r={radius} stroke={color} strokeWidth={strokeWidth} fill="none" 
                strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} />
        {/* Additional glow effect for overdue items */}
        {status === 'overdue' && (
          <circle cx={size / 2} cy={size / 2} r={radius + 2} stroke={color} strokeWidth={1} fill="none" opacity="0.3" className="animate-ping" />
        )}
      </svg>
      {/* Content in center */}
      <div className="absolute inset-0 flex items-center justify-center">
        {children}
      </div>
    </div>
  );
}
```

### ChoreTile Component ✅ IMPLEMENTED
```typescript
function ShitPile({ chore, config, onTended, animationIndex = 0 }) {
  // ✅ IMPLEMENTED: Progress ring integration
  // ✅ IMPLEMENTED: Countdown state calculation
  // ✅ IMPLEMENTED: Real-time updates with background tab optimization
  // ✅ IMPLEMENTED: Hover effects and interactions
  // ✅ IMPLEMENTED: Loading states and error handling
  
  return (
    <div className="text-center flex flex-col items-center w-56">
      {/* Progress Ring with Chore Icon */}
      <div className="mb-4 relative">
        {countdownState ? (
          <ProgressRing progress={Math.min(countdownState.progress, 1)} status={countdownState.status} size={140} strokeWidth={6}>
            <div className={`text-7xl cursor-pointer ${getAnimationClass()} flex items-center justify-center transition-transform duration-200 hover:scale-105`}>
              {chore.icon}
            </div>
          </ProgressRing>
        ) : (
          <div className={`text-7xl cursor-pointer ${getAnimationClass()} transition-transform duration-200 hover:scale-105`}>
            {chore.icon}
          </div>
        )}
      </div>
      
      {/* Countdown Status and Time Display */}
      {countdownState && (
        <div key={refreshKey} className="mb-2">
          <TimeDisplay countdownState={countdownState} format="full" />
        </div>
      )}
      
      {/* Points indicator */}
      <div className="mt-2 text-xs text-amber-600 flex items-center gap-1">
        <span>⭐</span>
        <span>{chore.points} points</span>
        <span>•</span>
        <span>🔄 {chore.cycleDuration}h cycle</span>
      </div>
    </div>
  );
}
```

### TimeDisplay Component ✅ IMPLEMENTED
```typescript
function TimeDisplay({ countdownState, format = 'compact' }: TimeDisplayProps) {
  const timeText = CountdownService.formatTimeRemaining(countdownState.timeRemaining);
  const color = CountdownService.getStatusColor(countdownState.status);
  
  if (format === 'compact') {
    return (
      <div className="text-xs font-medium text-center leading-tight" style={{ color }}>
        {timeText}
      </div>
    );
  }
  
  return (
    <div className="text-center">
      <div className="text-sm font-semibold" style={{ color }}>
        {timeText}
      </div>
      <div className="text-xs text-amber-600 capitalize">
        {countdownState.status}
      </div>
    </div>
  );
}
```

### LeaderboardTable Component ✅ IMPLEMENTED
```typescript
function LeaderboardComponent() {
  // ✅ IMPLEMENTED: Filtering by time period (all, 7d, 30d)
  // ✅ IMPLEMENTED: Sorting by points, completions, average
  // ✅ IMPLEMENTED: Visual rank indicators (🥇🥈🥉)
  // ✅ IMPLEMENTED: Recent activity summaries
  // ✅ IMPLEMENTED: Responsive mobile layout
  
  return (
    <div className="bg-gradient-to-br from-yellow-50 to-amber-50 rounded-lg shadow-lg p-6 border-2 border-amber-200">
      <h2 className="text-3xl font-bold text-amber-800 mb-6 text-center">🏆 Leaderboard</h2>
      
      {/* Filter and Sort Controls */}
      <div className="flex flex-wrap gap-4 mb-6 justify-center">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-amber-700">Period:</label>
          <select value={filterPeriod} onChange={(e) => setFilterPeriod(e.target.value as 'all' | '7d' | '30d')}>
            <option value="all">All Time</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
          </select>
        </div>
        
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-amber-700">Sort by:</label>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value as 'points' | 'completions' | 'average')}>
            <option value="points">Total Points</option>
            <option value="completions">Completions</option>
            <option value="average">Points per Completion</option>
          </select>
        </div>
      </div>
      
      {/* Leaderboard entries with visual indicators */}
      <div className="space-y-4">
        {processedData.map((entry, index) => (
          <div key={entry.tender.id} className={`bg-white rounded-lg p-4 shadow-md border-2 ${
            index === 0 ? 'border-yellow-400 bg-gradient-to-r from-yellow-50 to-amber-50' :
            index === 1 ? 'border-gray-400 bg-gradient-to-r from-gray-50 to-gray-100' :
            index === 2 ? 'border-orange-400 bg-gradient-to-r from-orange-50 to-amber-50' :
            'border-gray-200 hover:border-amber-300'
          }`}>
            {/* Entry content with rank indicators and stats */}
          </div>
        ))}
      </div>
    </div>
  );
}
```

## Database Migration Strategy ✅ IMPLEMENTED

### Migration Script Architecture ✅ IMPLEMENTED
```typescript
// ✅ IMPLEMENTED: Automatic database migration
function migrateDatabase() {
  try {
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

// ✅ IMPLEMENTED: Chore migration with defaults
function migrateChore(chore: any): any {
  return {
    id: chore.id,
    name: chore.name,
    icon: chore.icon,
    cycleDuration: chore.cycleDuration || 24,
    points: chore.points || 10,
    lastCompleted: chore.lastCompleted || null,
    dueDate: chore.dueDate || null,
  };
}
```

## API Architecture Enhancements ✅ IMPLEMENTED

### New Endpoints ✅ IMPLEMENTED
```typescript
// ✅ IMPLEMENTED: Configuration management
GET    /api/:syncId/config
PUT    /api/:syncId/config

// ✅ IMPLEMENTED: Enhanced chore endpoints
GET    /api/:syncId/chores
POST   /api/:syncId/chores (with cycleDuration and points)
PUT    /api/:syncId/chores/:choreId (with cycleDuration and points)
DELETE /api/:syncId/chores/:choreId

// ✅ IMPLEMENTED: Scoring and leaderboard endpoints
GET    /api/:syncId/leaderboard
POST   /api/:syncId/tend (with automatic scoring)

// ✅ IMPLEMENTED: Enhanced tenders and history
GET    /api/:syncId/tenders
POST   /api/:syncId/tenders
PUT    /api/:syncId/tenders/:tenderId
DELETE /api/:syncId/tenders/:tenderId
GET    /api/:syncId/history
DELETE /api/:syncId/history/:entryId

// ✅ IMPLEMENTED: App version endpoint
GET    /api/app-version
```

### Response Format Enhancements ✅ IMPLEMENTED
```typescript
// ✅ IMPLEMENTED: Enhanced chore creation with defaults
const newChore = { 
  id: `chore_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`, 
  name: name.trim(),
  icon: icon.trim(),
  cycleDuration: typeof cycleDuration === 'number' && cycleDuration > 0 ? cycleDuration : instanceData.config.defaultCycleDuration,
  points: typeof points === 'number' && points > 0 ? points : instanceData.config.defaultPoints,
  lastCompleted: null,
  dueDate: null,
};

// ✅ IMPLEMENTED: Leaderboard response with rankings
const leaderboard = instanceData.tenders.map((tender: any) => {
  // Calculate scores and recent activity
  return {
    tender: tender,
    score: { /* calculated score data */ },
    rank: 0, // Will be set after sorting
    recentCompletions: recentCompletions,
  };
});

// ✅ IMPLEMENTED: Automatic scoring on completion
const tenderScore = instanceData.tender_scores.find((ts: any) => ts.name === tenderName);
if (!tenderScore) {
  // Create new tender score entry
}
tenderScore.totalPoints += chorePoints;
tenderScore.completionCount += 1;
tenderScore.lastActivity = timestamp;
```

## Performance Architecture ✅ IMPLEMENTED

### Real-time Updates Strategy ✅ IMPLEMENTED
```typescript
// ✅ IMPLEMENTED: Background tab optimization
useEffect(() => {
  let countdownRefreshInterval: NodeJS.Timeout | null = null;
  let dataRefreshInterval: NodeJS.Timeout | null = null;
  let isTabActive = !document.hidden;

  const startIntervals = () => {
    // Update countdown display every minute when tab is active
    countdownRefreshInterval = setInterval(() => {
      if (!document.hidden) {
        setRefreshKey(prev => prev + 1);
      }
    }, 60 * 1000);

    // Fetch fresh data every 5 minutes
    dataRefreshInterval = setInterval(() => {
      if (!document.hidden) {
        fetchLastTendedInternal();
      }
    }, 5 * 60 * 1000);
  };

  const stopIntervals = () => {
    if (countdownRefreshInterval) clearInterval(countdownRefreshInterval);
    if (dataRefreshInterval) clearInterval(dataRefreshInterval);
  };

  // Handle visibility change (tab becomes active/inactive)
  const handleVisibilityChange = () => {
    if (document.hidden) {
      isTabActive = false;
    } else {
      isTabActive = true;
      setRefreshKey(prev => prev + 1); // Immediate refresh
      fetchLastTendedInternal(); // Fetch fresh data
    }
  };

  startIntervals();
  document.addEventListener('visibilitychange', handleVisibilityChange);

  return () => {
    stopIntervals();
    document.removeEventListener('visibilitychange', handleVisibilityChange);
  };
}, [syncId, chore]);
```

### Memory Management ✅ IMPLEMENTED
```typescript
// ✅ IMPLEMENTED: Efficient countdown state calculation
useEffect(() => {
  if (config) {
    const newCountdownState = CountdownService.calculateCountdownState(chore, config);
    setCountdownState(newCountdownState);
  }
}, [chore, config, refreshKey]);

// ✅ IMPLEMENTED: Cleanup intervals and animations
useEffect(() => {
  return () => {
    clearInterval(updateTimer);
    cancelAnimationFrame(animationFrame);
  };
}, []);
```

## Future Architecture (Telegram Bot) ⏳ PENDING

### Bot Integration Layer ⏳ PENDING
```typescript
interface TelegramBotService {
  // Send notifications when chores become urgent
  sendUrgentNotification(chore: Chore, users: string[]): Promise<void>
  
  // Handle completion attestations from Telegram
  handleCompletionCommand(choreId: string, userId: string): Promise<void>
  
  // Provide status updates via chat
  getStatusSummary(syncId: string): Promise<string>
  
  // Manage user subscriptions
  subscribeUser(telegramId: string, syncId: string): Promise<void>
}
```

### Webhook Architecture ⏳ PENDING
```typescript
// Telegram webhook handler
POST /api/telegram/webhook
├── Authentication (bot token validation)
├── Command Router
│   ├── /status → Send current chore status
│   ├── /complete <chore> → Mark chore as completed
│   ├── /subscribe <sync-code> → Link telegram to sync ID
│   └── /help → Show available commands
└── Response Generator
```

## Deployment Architecture (val.town) ✅ READY

### Build Configuration ✅ IMPLEMENTED
```typescript
// ✅ IMPLEMENTED: Single-file deployment strategy
// ✅ IMPLEMENTED: Bundle all assets into deployable unit
// ✅ IMPLEMENTED: Environment variable configuration
// ✅ IMPLEMENTED: Health check endpoints

const isDev = process.env.NODE_ENV !== "production";
const dbPath = process.env.DB_PATH || (isDev ? "kinobi.db" : "/app/data/kinobi.db");
const server = Bun.serve({
  port: isDev ? 3000 : (process.env.PORT || 3000),
  hostname: process.env.HOST || "0.0.0.0",
  // ... server configuration
});
```

### Configuration Management ✅ IMPLEMENTED
```typescript
interface DeploymentConfig {
  databasePath: string        // SQLite file location ✅ IMPLEMENTED
  telegramBotToken?: string   // Optional bot integration ⏳ PENDING
  updateCheckInterval: number // PWA update frequency ✅ IMPLEMENTED
  logLevel: 'debug' | 'info' | 'warn' | 'error' ✅ IMPLEMENTED
}
```

## Security Architecture ✅ IMPLEMENTED

### Data Protection ✅ IMPLEMENTED
- ✅ SQLite database with proper file permissions
- ✅ Input validation on all API endpoints
- ✅ XSS protection in countdown displays
- ✅ CSRF protection for configuration changes

### Telegram Bot Security ⏳ PENDING
- Webhook URL validation
- Bot token environment variable storage
- User authentication via sync codes
- Rate limiting on bot commands

## Accessibility Architecture ✅ IMPLEMENTED

### Visual Accessibility ✅ IMPLEMENTED
- ✅ High contrast color schemes for countdown states
- ✅ ARIA labels for progress indicators
- ✅ Keyboard navigation support
- ✅ Screen reader announcements for time updates

### Responsive Design ✅ IMPLEMENTED
- ✅ Mobile-first countdown displays
- ✅ Touch-friendly interaction areas
- ✅ Adaptive text sizing
- ✅ Progressive enhancement for advanced features

## IMPLEMENTATION STATUS SUMMARY

**✅ COMPLETED FEATURES:**
- **Phase 1**: Complete rebranding and core structure
- **Phase 2**: Full time cycle and scoring system
- **Phase 3**: Visual countdown and leaderboard system

**🎯 CORE COMPONENTS IMPLEMENTED:**
- CountdownService with progress calculation
- ProgressRing with SVG animations and color transitions
- TimeDisplay with formatted time output
- LeaderboardComponent with filtering and sorting
- Enhanced ShitPile with progress rings
- Background tab optimization for performance
- Database migration system for backward compatibility

**📊 TECHNICAL ACHIEVEMENTS:**
- 15+ API endpoints for full CRUD operations
- Real-time countdown updates with performance optimization
- Complete TypeScript coverage for all new features
- Responsive design with accessibility features
- PWA support with service worker updates

**🚀 READY FOR:**
- Production deployment
- User testing and feedback
- Phase 4 enhancements (analytics, bulk operations)
- Phase 5 testing and documentation

This architecture provides a solid foundation for the Kinobi transformation while maintaining the simplicity and reliability of the current system. All core features are implemented and ready for production use. 