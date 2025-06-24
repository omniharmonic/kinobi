import React, { createContext, useContext, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  BrowserRouter as Router,
  Link,
  Route,
  Routes,
  useLocation,
  useNavigate,
  useParams,
} from "react-router-dom";

// Extend the Window interface for TypeScript
declare global {
  interface Window {
    PWA_CURRENT_APP_VERSION?: string;
  }
}

// Type definitions
interface Chore {
  id: string;
  name: string;
  icon: string;
  cycleDuration: number;        // Duration in hours
  points: number;              // Points awarded for completion
  lastCompleted?: number;       // Timestamp of last completion
  dueDate?: number;            // Calculated due date timestamp
}

interface Tender {
  id: string;
  name: string;
}

interface HistoryEntry {
  id: string;
  timestamp: number;
  person: string;
  chore_id: string;
  notes: string | null;
}

interface ChoreConfig {
  defaultCycleDuration: number;  // Default 24 hours
  defaultPoints: number;         // Default points per chore (10)
  warningThreshold: number;      // When to show yellow (75%)
  urgentThreshold: number;       // When to show red (90%)
}

interface CountdownState {
  progress: number;              // 0-1 (0 = just done, 1 = overdue)
  status: 'good' | 'warning' | 'urgent' | 'overdue';
  timeRemaining: number;         // Hours remaining
}

interface TenderScore {
  tenderId: string;
  name: string;
  totalPoints: number;
  completionCount: number;
  lastActivity: number;         // Timestamp of last completion
}

interface LeaderboardEntry {
  tender: Tender;
  score: TenderScore;
  rank: number;
  recentCompletions: HistoryEntry[];  // Last 5 completions
}

// --- Sync ID Management ---
const LOCAL_STORAGE_SYNC_ID_KEY = "kinobi_sync_id_valtown";

function generateNewSyncIdInternal() {
  return `sync_${Date.now().toString(36)}${Math.random().toString(36).substring(2, 9)}`;
}

function getSyncIdFromLocalStorage() {
  if (typeof localStorage !== "undefined") {
    return localStorage.getItem(LOCAL_STORAGE_SYNC_ID_KEY);
  }
  return null;
}

function setSyncIdInLocalStorage(syncId: string) {
  if (typeof localStorage !== "undefined") {
    localStorage.setItem(LOCAL_STORAGE_SYNC_ID_KEY, syncId);
  }
}
// --- End Sync ID Management ---

// Context for Sync ID
const SyncIdContext = createContext<string | null>(null);

function useSyncId() {
  return useContext(SyncIdContext);
}

// Main App Component
function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const [syncId, setSyncId] = useState<string | null>(null);
  const [isLoadingSyncId, setIsLoadingSyncId] = useState(true);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [currentClientVersion, setCurrentClientVersion] = useState<string | null>(null);
  const refreshingRef = React.useRef(false);

  useEffect(() => {
    // Read the embedded PWA version
    if (typeof window !== "undefined" && window.PWA_CURRENT_APP_VERSION) {
      setCurrentClientVersion(window.PWA_CURRENT_APP_VERSION);
    }

    let currentSyncId = getSyncIdFromLocalStorage();

    if (!currentSyncId) {
      currentSyncId = generateNewSyncIdInternal();
      setSyncIdInLocalStorage(currentSyncId);
    }

    setSyncId(currentSyncId);
    setIsLoadingSyncId(false);

    if (!("serviceWorker" in navigator)) {
      return;
    }

    // Register the service worker
    navigator.serviceWorker.register('/sw.js')
      .then(registration => {
        console.log('Service Worker registered successfully:', registration);
        
        // Initial check for a waiting worker
        if (registration.waiting) {
          setUpdateAvailable(true);
        }

        // Listen for new workers installing
        registration.addEventListener("updatefound", () => {
          const newWorker = registration.installing;
          if (!newWorker) return;

          newWorker.addEventListener("statechange", () => {
            if (newWorker.state === "installed") {
              // A new worker has installed. Check if it's now waiting.
              if (registration.waiting) {
                setUpdateAvailable(true);
              }
            }
          });
        });
      })
      .catch(error => {
        console.error('Service Worker registration failed:', error);
      });



    // 3. Listen for controller change (new SW has activated)
    const controllerChangeHandler = () => {
      if (refreshingRef.current) return;
      refreshingRef.current = true;
      window.location.reload();
    };
    navigator.serviceWorker.addEventListener("controllerchange", controllerChangeHandler);

    // Cleanup
    return () => {
      navigator.serviceWorker.removeEventListener("controllerchange", controllerChangeHandler);
    };
  }, []);

  const handleUpdate = () => {
    if (!("serviceWorker" in navigator)) {
      window.location.reload();
      return;
    }

    navigator.serviceWorker.ready.then(registration => {
      if (registration && registration.waiting) {
        registration.waiting.postMessage({ type: "SKIP_WAITING" });
      } else {
        window.location.reload();
      }
    });
  };

  if (isLoadingSyncId || !syncId) {
    return (
      <div className="flex flex-col min-h-screen bg-gradient-to-br from-amber-100 via-yellow-50 to-orange-100 items-center justify-center text-2xl">
        {"Initializing Kinobi..."}
        <span>.</span>
        <span>.</span>
        <span>.</span>
      </div>
    );
  }

  return (
    <SyncIdContext.Provider value={syncId}>
      <div className="flex flex-col h-screen bg-gradient-to-br from-amber-100 via-yellow-50 to-orange-100">
        <header className="bg-[#FAF9F6] p-4 shadow-md flex-shrink-0 flex items-center justify-between text-[#222]">
          <div className="flex items-center gap-4 cursor-pointer" onClick={() => navigate("/")}> 
            <img src="/kinobi_alpha.gif" alt="Kinobi" className="w-12 h-12 kinobi-logo-float" />
            <span className="text-4xl font-bold tracking-tight select-none">Kinobi</span>
          </div>
          <nav className="flex gap-6 text-lg items-center">
            <Link to={`/history`} className="hover:text-amber-700 transition-colors">History</Link>
            <Link to={`/leaderboard`} className="hover:text-amber-700 transition-colors">Leaderboard</Link>
            <Link to={`/settings`} className="hover:text-amber-700 transition-colors">Settings</Link>
          </nav>
        </header>
        <main className="flex-grow overflow-auto bg-[#FAF9F6] text-[#222]">
          <Routes>
            <Route path={`/`} element={<ShitView />} />
            <Route path={`/history`} element={<HistoryView />} />
            <Route path={`/leaderboard`} element={<LeaderboardView />} />
            <Route
              path={`/settings`}
              element={
                <SyncSettingsView
                  updateAvailable={updateAvailable}
                  onUpdate={handleUpdate}
                  currentClientVersion={currentClientVersion}
                />
              }
            />
            <Route path="*" element={<ShitView />} />
          </Routes>
        </main>
        <footer className="bg-[#FAF9F6] p-4 text-center text-[#222] flex-shrink-0 border-t border-amber-100">
          <span className="text-lg">made with 🖤 at The Life House</span>
        </footer>
      </div>
    </SyncIdContext.Provider>
  );
}

// Wrapped App with Router
function RoutedApp() {
  return (
    <Router>
      <App />
    </Router>
  );
}

function ShitView() {
  const syncId = useSyncId();
  const [chores, setChores] = useState<Chore[]>([]);
  const [config, setConfig] = useState<ChoreConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  async function fetchChoresInternal() {
    if (!syncId) return;
    setIsLoading(true);
    try {
      const [choresResponse, configResponse] = await Promise.all([
        fetch(`/api/${syncId}/chores`),
        fetch(`/api/${syncId}/config`)
      ]);
      console.log('[DEBUG] Fetched choresResponse:', choresResponse);
      console.log('[DEBUG] Fetched configResponse:', configResponse);
      if (!choresResponse.ok) throw new Error(`Chores fetch error! status: ${choresResponse.status}`);
      if (!configResponse.ok) throw new Error(`Config fetch error! status: ${configResponse.status}`);
      const choresData = await choresResponse.json();
      const configData = await configResponse.json();
      console.log('[DEBUG] choresData:', choresData);
      console.log('[DEBUG] configData:', configData);
      setChores(Array.isArray(choresData) ? choresData : []);
      setConfig(configData);
    } catch (error) {
      console.error('[ERROR] Error fetching data:', error);
      setChores([]);
      setConfig(null);
    }
    setIsLoading(false);
  }

  useEffect(() => {
    fetchChoresInternal();
  }, [syncId]);

  if (!syncId) return <div>Loading sync information...</div>;
  if (isLoading || !config) return <div className="h-full flex items-center justify-center text-2xl text-amber-700">Loading chores...</div>;

  if (chores.length === 0) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center text-amber-700">
          <p className="text-2xl mb-4">No chores configured</p>
          <p>Add chores in Settings</p>
        </div>
      </div>
    );
  }

  // Use responsive grid with maximum 4 chores per row
  return (
    <div className="h-full w-full pt-[32rem] pb-8 px-8 flex items-center justify-center">
      <div className="w-full max-w-7xl grid gap-8 place-items-center" style={{
        gridTemplateColumns: `repeat(${Math.min(chores.length, 4)}, 1fr)`,
        gridAutoRows: 'min-content'
      }}>
        {chores.map((chore, index) => (
          <ShitPile key={chore.id} chore={chore} config={config} onTended={fetchChoresInternal} animationIndex={index} />
        ))}
      </div>
    </div>
  );
}

function ShitPile({ chore, config, onTended, animationIndex = 0 }: { chore: Chore; config: ChoreConfig; onTended: () => void; animationIndex?: number }) {
  const syncId = useSyncId();
  const [lastTended, setLastTended] = useState<number | null>(null);
  const [lastTender, setLastTender] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [countdownState, setCountdownState] = useState<CountdownState | null>(null);

  async function fetchLastTendedInternal() {
    if (!syncId || !chore) return;
    setIsLoading(true);
    try {
      // Fetch the history and find the last tending for this specific chore
      const response = await fetch(`/api/${syncId}/history`);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const allHistory = await response.json();
      
      // Filter for this chore and get the most recent
      const choreHistory = allHistory.filter((entry: any) => entry.chore_id === chore.id);
      if (choreHistory.length > 0) {
        const lastEntry = choreHistory[0]; // Already sorted by timestamp desc from API
        setLastTended(lastEntry.timestamp);
        setLastTender(lastEntry.person);
      } else {
        setLastTended(null);
        setLastTender(null);
      }
    } catch (error) {
      console.error("Error fetching last tended:", error);
      setLastTended(null);
      setLastTender(null);
    }
    setIsLoading(false);
  }

  // Initial data fetch when component mounts or syncId/chore changes
  useEffect(() => {
    fetchLastTendedInternal();
  }, [syncId, chore]);

  // Calculate countdown state whenever chore data changes
  useEffect(() => {
    if (config) {
      const newCountdownState = CountdownService.calculateCountdownState(chore, config);
      setCountdownState(newCountdownState);
    }
  }, [chore, config, refreshKey]);

  // Set up refresh timer with background tab optimization
  useEffect(() => {
    let countdownRefreshInterval: NodeJS.Timeout | null = null;
    let dataRefreshInterval: NodeJS.Timeout | null = null;
    let isTabActive = !document.hidden;

    const startIntervals = () => {
      // Update countdown display every minute when tab is active
      countdownRefreshInterval = setInterval(() => {
        if (!document.hidden) {
          setRefreshKey(prev => prev + 1); // Trigger re-render with new countdown calculation
        }
      }, 60 * 1000); // Update every minute for smooth countdown

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
        // Tab became inactive - reduce timer activity
        isTabActive = false;
      } else {
        // Tab became active - refresh immediately and resume normal timers
        isTabActive = true;
        setRefreshKey(prev => prev + 1); // Immediate refresh
        fetchLastTendedInternal(); // Fetch fresh data
      }
    };

    // Start intervals and listen for visibility changes
    startIntervals();
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Clean up on unmount
    return () => {
      stopIntervals();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [syncId, chore]); // Re-create intervals if syncId or chore changes

  function getTimeSinceLastTending() {
    if (lastTended === null || typeof lastTended === "undefined") return "no tending logged";

    const now = Date.now();
    const diff = now - Number(lastTended); // Ensure lastTended is a number
    if (isNaN(diff)) return "Loading..."; // Or handle error

    if (diff < 0) return "Just now (check clock?)"; // Future date

    // Calculate hours and days
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    // Show hours if less than 24 hours ago
    if (hours < 24) {
      if (hours === 0) return "less than an hour ago";
      if (hours === 1) return "1 hour ago";
      return `${hours} hours ago`;
    }

    // Show days for 1+ days
    if (days === 1) return "1 day ago";
    return `${days} days ago`;
  }

  function getTextColorClass() {
    if (lastTended === null || typeof lastTended === "undefined") return "text-amber-600";
    const days = Math.floor((Date.now() - Number(lastTended)) / (1000 * 60 * 60 * 24));

    // Calculate opacity percentage based on days (30% to 100% over 4 days)
    const opacityPercent = Math.min(30 + (70 * days / 4), 100);

    // Convert opacity percentage to Tailwind opacity class (30, 40, 50, 60, 70, 80, 90, 100)
    const opacityClass = `opacity-${Math.ceil(opacityPercent / 10) * 10}`;

    return `text-amber-800 ${opacityClass}`;
  }

  function getAnimationClass() {
    // Cycle through the available animation classes - using more subtle chore animations
    const animationClasses = ['chore-float-1', 'chore-float-2', 'chore-float-3', 'chore-float-4', 'chore-float-5', 'chore-float-6'];
    return animationClasses[animationIndex % animationClasses.length];
  }

  return (
    <div className="text-center flex flex-col items-center w-56">
      {isLoading
        ? (
          <div className="text-2xl text-amber-700">
            Assembling bits
            <span>.</span>
            <span>.</span>
            <span>.</span>
          </div>
        )
        : (
          <>
            {/* Progress Ring with Chore Icon */}
            <div className="mb-4 relative">
              {countdownState ? (
                <ProgressRing
                  progress={Math.min(countdownState.progress, 1)} // Cap at 1 for visual consistency
                  status={countdownState.status}
                  size={140}
                  strokeWidth={6}
                >
                  <div
                    className={`text-7xl cursor-pointer ${getAnimationClass()} flex items-center justify-center transition-transform duration-200 hover:scale-105`}
                    onClick={() => setShowModal(true)}
                  >
                    {chore.icon}
                  </div>
                </ProgressRing>
              ) : (
                <div
                  className={`text-7xl cursor-pointer ${getAnimationClass()} transition-transform duration-200 hover:scale-105 flex items-center justify-center`}
                  onClick={() => setShowModal(true)}
                  style={{ width: 140, height: 140 }}
                >
                  {chore.icon}
                </div>
              )}
            </div>

            {/* Chore Name */}
            <h3 className="text-2xl font-semibold text-amber-800 mb-3 h-16 flex items-center justify-center leading-tight">
              {chore.name}
            </h3>

            {/* Countdown Status and Time Display */}
            {countdownState && (
              <div key={refreshKey} className="mb-2">
                <TimeDisplay countdownState={countdownState} format="full" />
              </div>
            )}

            {/* Last Tended Info */}
            <div key={`legacy-${refreshKey}`} className={`text-sm ${getTextColorClass()} leading-tight opacity-75`}>
              {lastTended === null || typeof lastTended === "undefined" 
                ? "no tending logged"
                : `Last: ${getTimeSinceLastTending()}${lastTender ? ` by ${lastTender}` : ""}`
              }
            </div>

            {/* Points indicator */}
            <div className="mt-2 text-xs text-amber-600 flex items-center gap-1">
              <span>⭐</span>
              <span>{chore.points} points</span>
              <span>•</span>
              <span>🔄 {chore.cycleDuration}h cycle</span>
            </div>
          </>
        )}
      {showModal && (
        <TenderSelectionModal
          chore={chore}
          onClose={() => setShowModal(false)}
          onTended={() => {
            fetchLastTendedInternal();
            if (onTended) onTended(); // Also call parent's onTended to refresh chores if needed
          }}
        />
      )}
    </div>
  );
}

function TenderSelectionModal({ chore, onClose, onTended }: { chore: Chore; onClose: () => void; onTended: () => void }) {
  const syncId = useSyncId();
  const [tenders, setTenders] = useState<Tender[]>([]);
  const [recentTenders, setRecentTenders] = useState<string[]>([]);
  const [newTenderName, setNewTenderName] = useState("");
  const [notes, setNotes] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [selectedTender, setSelectedTender] = useState<string | null>(null);
  const [sortedTenders, setSortedTenders] = useState<Tender[]>([]);

  async function fetchTendersInternal() {
    if (!syncId) return;
    try {
      const response = await fetch(`/api/${syncId}/tenders`);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      setTenders(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error fetching tenders:", error);
      setTenders([]);
    }
  }

  async function fetchRecentTendersInternal() {
    if (!syncId) return;
    try {
      const response = await fetch(`/api/${syncId}/history`);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();

      // Extract unique tender names from recent history
      const uniqueNames = Array.isArray(data)
        ? [...new Set(data.slice(0, 10).map((entry: any) => entry.person))]
        : [];

      setRecentTenders(uniqueNames);
    } catch (error) {
      console.error("Error fetching recent tenders:", error);
      setRecentTenders([]);
    }
  }

  // Create a sorted tender list with recent tenders first
  useEffect(() => {
    if (tenders.length === 0) return;

    // Create a map of recently used tenders for faster lookups
    const recentMap = new Map();
    recentTenders.forEach((name, index) => {
      recentMap.set(name, index);
    });

    // Sort tenders: recent ones first (in order of recency), then others alphabetically
    const sorted = [...tenders].sort((a: any, b: any) => {
      const aIsRecent = recentMap.has(a.name);
      const bIsRecent = recentMap.has(b.name);

      if (aIsRecent && bIsRecent) {
        // Both are recent, sort by recency (lower index = more recent)
        return recentMap.get(a.name) - recentMap.get(b.name);
      } else if (aIsRecent) {
        // Only a is recent, it comes first
        return -1;
      } else if (bIsRecent) {
        // Only b is recent, it comes first
        return 1;
      } else {
        // Neither is recent, sort alphabetically
        return a.name.localeCompare(b.name);
      }
    });

    setSortedTenders(sorted);
  }, [tenders, recentTenders]);

  useEffect(() => {
    fetchTendersInternal();
    fetchRecentTendersInternal();
  }, [syncId]);

  async function handleTending() {
    const tenderName = selectedTender || newTenderName.trim();
    if (!syncId || !tenderName) return;

    try {
      await fetch(`/api/${syncId}/tend`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tender: tenderName,
          choreId: chore.id,
          notes: notes.trim() || null,
        }),
      });

      if (newTenderName.trim() && !selectedTender) {
        // Add the new tender to the list
        await fetch(`/api/${syncId}/tenders`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: newTenderName.trim() }),
        });
      }

      onTended(); // This will call fetchLastTendedInternal in ShitPile component
      onClose();
    } catch (error) {
      console.error("Error tending space:", error);
    }
  }

  function selectTender(name: string) {
    setSelectedTender(name);
    setNewTenderName(""); // Clear the input field when selecting a tender
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-gradient-to-br from-yellow-50 to-amber-50 rounded-lg p-6 w-full max-w-md border-2 border-amber-200 shadow-xl relative z-50">
        <h2 className="text-2xl mb-4 text-amber-800 font-bold">Who's logging {chore.name}?</h2>


        {/* Unified tenders list */}
        <div className="space-y-2 mb-4 max-h-60 overflow-y-auto">
          {sortedTenders.map((tender: any) => (
            <button
              key={tender.id}
              className={`w-full py-2 px-3 rounded text-left ${
                selectedTender === tender.name
                  ? "bg-amber-500 text-white"
                  : "bg-amber-100 hover:bg-amber-200 text-amber-800"
              } ${recentTenders.includes(tender.name) ? "border-l-4 border-amber-400" : ""}`}
              onClick={() => selectTender(tender.name)}
            >
              {tender.name}
              {recentTenders.includes(tender.name)
                && <span className="text-xs ml-2 opacity-70"></span>}
            </button>
          ))}

          {/* New tender input styled like an option */}
          <div
            className={`w-full py-2 px-3 rounded ${
              !selectedTender && newTenderName
                ? "bg-amber-500 text-white"
                : "bg-yellow-50 border border-dashed border-amber-300"
            }`}
          >
            <input
              type="text"
              value={newTenderName}
              onChange={(e) => {
                setNewTenderName(e.target.value);
                setSelectedTender(null); // Clear selection when typing
              }}
              placeholder="+ Add new tender"
              className={`w-full bg-transparent focus:outline-none ${
                !selectedTender && newTenderName
                  ? "text-white placeholder-amber-100"
                  : "text-amber-800 placeholder-amber-400"
              }`}
              disabled={isAdding}
            />
          </div>
        </div>

        {/* Notes section */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-amber-700 mb-1">
            Any notes about the tending?
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full border border-amber-300 rounded px-2 py-1 focus:ring-amber-500 focus:border-amber-500 min-h-[80px] bg-yellow-50"
            placeholder="What did you clean? Any issues found? How shitty was it? Everything is welcome."
          />
        </div>

        {/* Action buttons */}
        <button
          onClick={handleTending}
          className="w-full bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded mb-2 disabled:opacity-50 font-semibold"
          disabled={isAdding || (!selectedTender && !newTenderName.trim())}
        >
          Log Tending {chore.icon}
        </button>

        <button
          onClick={onClose}
          className="w-full bg-amber-200 hover:bg-amber-300 text-amber-800 py-2 rounded"
          disabled={isAdding}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

function HistoryView() {
  const syncId = useSyncId();
  if (!syncId) return <div>Loading sync information...</div>;
  return (
    <div className="w-full max-w-2xl mx-auto">
      <ShitHistoryComponent />
    </div>
  );
}

function LeaderboardView() {
  const syncId = useSyncId();
  if (!syncId) return <div>Loading sync information...</div>;
  return (
    <div className="w-full max-w-4xl mx-auto p-6">
      <LeaderboardComponent />
    </div>
  );
}

function LeaderboardComponent() {
  const syncId = useSyncId();
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterPeriod, setFilterPeriod] = useState<'all' | '7d' | '30d'>('all');
  const [sortBy, setSortBy] = useState<'points' | 'completions' | 'average'>('points');

  async function fetchLeaderboardData() {
    if (!syncId) return;
    setIsLoading(true);
    try {
      const response = await fetch(`/api/${syncId}/leaderboard`);
      if (!response.ok) throw new Error(`Leaderboard fetch error! status: ${response.status}`);
      
      const data = await response.json();
      setLeaderboardData(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error fetching leaderboard:", error);
      setLeaderboardData([]);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    fetchLeaderboardData();
  }, [syncId]);

  // Filter and sort leaderboard data
  const processedData = React.useMemo(() => {
    let filtered = [...leaderboardData];
    
    // Apply time period filter
    if (filterPeriod !== 'all') {
      const cutoffTime = Date.now() - (filterPeriod === '7d' ? 7 * 24 * 60 * 60 * 1000 : 30 * 24 * 60 * 60 * 1000);
      filtered = filtered.map(entry => ({
        ...entry,
        recentCompletions: entry.recentCompletions.filter(completion => completion.timestamp > cutoffTime),
        score: {
          ...entry.score,
          totalPoints: entry.recentCompletions.filter(completion => completion.timestamp > cutoffTime).length * 10, // Simplified for filtering
          completionCount: entry.recentCompletions.filter(completion => completion.timestamp > cutoffTime).length,
        }
      }));
    }
    
    // Sort by selected criteria
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'points':
          return b.score.totalPoints - a.score.totalPoints;
        case 'completions':
          return b.score.completionCount - a.score.completionCount;
        case 'average':
          const avgA = a.score.completionCount > 0 ? a.score.totalPoints / a.score.completionCount : 0;
          const avgB = b.score.completionCount > 0 ? b.score.totalPoints / b.score.completionCount : 0;
          return avgB - avgA;
        default:
          return b.score.totalPoints - a.score.totalPoints;
      }
    });
    
    // Reassign ranks
    filtered.forEach((entry, index) => {
      entry.rank = index + 1;
    });
    
    return filtered;
  }, [leaderboardData, filterPeriod, sortBy]);

  if (isLoading) {
    return (
      <div className="text-2xl text-amber-700 text-center">
        Loading leaderboard...
        <span>.</span>
        <span>.</span>
        <span>.</span>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-yellow-50 to-amber-50 rounded-lg shadow-lg p-6 border-2 border-amber-200">
      <h2 className="text-3xl font-bold text-amber-800 mb-6 text-center">🏆 Leaderboard</h2>
      
      {/* Filter and Sort Controls */}
      <div className="flex flex-wrap gap-4 mb-6 justify-center">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-amber-700">Period:</label>
          <select 
            value={filterPeriod} 
            onChange={(e) => setFilterPeriod(e.target.value as 'all' | '7d' | '30d')}
            className="border border-amber-300 rounded px-2 py-1 text-sm bg-yellow-50 focus:ring-amber-500 focus:border-amber-500"
          >
            <option value="all">All Time</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
          </select>
        </div>
        
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-amber-700">Sort by:</label>
          <select 
            value={sortBy} 
            onChange={(e) => setSortBy(e.target.value as 'points' | 'completions' | 'average')}
            className="border border-amber-300 rounded px-2 py-1 text-sm bg-yellow-50 focus:ring-amber-500 focus:border-amber-500"
          >
            <option value="points">Total Points</option>
            <option value="completions">Completions</option>
            <option value="average">Points per Completion</option>
          </select>
        </div>
      </div>
      
      {processedData.length === 0 ? (
        <p className="text-amber-600 text-center">No scoring data available for the selected period. Complete some chores to get started!</p>
      ) : (
        <div className="space-y-4">
          {processedData.map((entry, index) => {
            const pointsPerCompletion = entry.score.completionCount > 0 ? 
              (entry.score.totalPoints / entry.score.completionCount).toFixed(1) : '0.0';
            
            return (
              <div 
                key={entry.tender.id} 
                className={`bg-white rounded-lg p-4 shadow-md border-2 transition-all duration-200 hover:shadow-lg ${
                  index === 0 ? 'border-yellow-400 bg-gradient-to-r from-yellow-50 to-amber-50' :
                  index === 1 ? 'border-gray-400 bg-gradient-to-r from-gray-50 to-gray-100' :
                  index === 2 ? 'border-orange-400 bg-gradient-to-r from-orange-50 to-amber-50' :
                  'border-gray-200 hover:border-amber-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`text-2xl font-bold flex items-center gap-2 ${
                      index === 0 ? 'text-yellow-600' :
                      index === 1 ? 'text-gray-600' :
                      index === 2 ? 'text-orange-600' :
                      'text-amber-600'
                    }`}>
                      {index === 0 && '🥇'}
                      {index === 1 && '🥈'}
                      {index === 2 && '🥉'}
                      {index > 2 && `#${entry.rank}`}
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold text-amber-800 flex items-center gap-2">
                        {entry.tender.name}
                        {index < 3 && (
                          <span className="text-xs bg-amber-200 px-2 py-1 rounded-full">
                            Top Performer
                          </span>
                        )}
                      </h3>
                      <div className="flex items-center gap-4 text-sm text-amber-600">
                        <span>{entry.score.completionCount} completions</span>
                        <span>•</span>
                        <span>{pointsPerCompletion} pts/completion</span>
                        <span>•</span>
                        <span>Last active {new Date(entry.score.lastActivity).toLocaleDateString()}</span>
                      </div>
                      
                      {/* Recent completions preview */}
                      {entry.recentCompletions.length > 0 && (
                        <div className="mt-2 text-xs text-amber-500">
                          Recent: {entry.recentCompletions.slice(0, 3).map((completion, i) => (
                            <span key={completion.id}>
                              {i > 0 && ', '}
                              {new Date(completion.timestamp).toLocaleDateString()}
                            </span>
                          ))}
                          {entry.recentCompletions.length > 3 && ` +${entry.recentCompletions.length - 3} more`}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-amber-700">{entry.score.totalPoints}</div>
                    <div className="text-sm text-amber-600">points</div>
                    {entry.score.completionCount > 0 && (
                      <div className="text-xs text-amber-500">{pointsPerCompletion} avg</div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
      
      <div className="mt-6 text-center text-sm text-amber-600">
        <p>Points are awarded for completing chores. Keep up the great work! 🌟</p>
        <p className="mt-1 text-xs opacity-75">
          Use the filters above to view performance over different time periods
        </p>
      </div>
    </div>
  );
}

function ShitHistoryComponent() {
  const syncId = useSyncId();
  const [tenders, setTenders] = useState<Tender[]>([]);
  const [chores, setChores] = useState<Chore[]>([]);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showExactTimes, setShowExactTimes] = useState<Record<string, boolean>>({});
  const [clickedTimestamp, setClickedTimestamp] = useState<string | null>(null);

  // Helper function to format relative time
  const formatRelativeTime = (timestamp: number) => {
    const now = Date.now();
    const diffMs = now - timestamp;
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    const diffMonths = Math.floor(diffDays / 30);
    const diffYears = Math.floor(diffDays / 365);

    if (diffSecs < 60) return "just now";
    if (diffMins < 60) return `${diffMins} ${diffMins === 1 ? "minute" : "minutes"} ago`;
    if (diffHours < 24) return `${diffHours} ${diffHours === 1 ? "hour" : "hours"} ago`;
    if (diffDays < 30) return `${diffDays} ${diffDays === 1 ? "day" : "days"} ago`;
    if (diffMonths < 12) return `${diffMonths} ${diffMonths === 1 ? "month" : "months"} ago`;
    return `${diffYears} ${diffYears === 1 ? "year" : "years"} ago`;
  };

  // Toggle visibility of exact timestamp for an entry
  const toggleExactTime = (entryId: string) => {
    setClickedTimestamp(entryId);
    setTimeout(() => setClickedTimestamp(null), 500);

    setShowExactTimes(prev => ({
      ...prev,
      [entryId]: !prev[entryId],
    }));
  };

  // Get chore by ID
  const getChoreById = (choreId: string): Chore | undefined => {
    return chores.find((chore) => chore.id === choreId);
  };

  async function fetchDataInternal() {
    if (!syncId) return;
    setIsLoading(true);
    setIsProcessing(true);
    try {
      const [tendersResponse, choresResponse, historyResponse] = await Promise.all([
        fetch(`/api/${syncId}/tenders`),
        fetch(`/api/${syncId}/chores`),
        fetch(`/api/${syncId}/history`),
      ]);
      if (!tendersResponse.ok) throw new Error(`Tenders fetch error! status: ${tendersResponse.status}`);
      if (!choresResponse.ok) throw new Error(`Chores fetch error! status: ${choresResponse.status}`);
      if (!historyResponse.ok) throw new Error(`History fetch error! status: ${historyResponse.status}`);

      const tendersData = await tendersResponse.json();
      const choresData = await choresResponse.json();
      const historyData = await historyResponse.json();

      setTenders(Array.isArray(tendersData) ? tendersData : []);
      setChores(Array.isArray(choresData) ? choresData : []);
      setHistory(Array.isArray(historyData) ? historyData : []);
    } catch (error) {
      console.error("Error fetching data for history:", error);
      setTenders([]);
      setChores([]);
      setHistory([]);
    }
    setIsLoading(false);
    setIsProcessing(false);
  }

  useEffect(() => {
    fetchDataInternal();
  }, [syncId]);

  async function handleDeleteHistoryEntry(entryId: string) {
    if (!syncId || !entryId) return;
    if (!confirm("Are you sure you want to delete this history entry? This cannot be undone.")) return;
    setIsProcessing(true);
    try {
      await fetch(`/api/${syncId}/history/${entryId}`, { method: "DELETE" });
      fetchDataInternal(); // Refresh
    } catch (error) {
      console.error("Error deleting history entry:", error);
    } finally {
      setIsProcessing(false);
    }
  }

  if (isLoading) {
    return (
      <div className="text-2xl text-amber-700">
        Loading history data...
        <span>.</span>
        <span>.</span>
        <span>.</span>
      </div>
    );
  }

  return (
    <div className={`${isProcessing ? "opacity-50 pointer-events-none" : ""}`}>
      <section className="p-6 bg-gradient-to-br from-yellow-50 to-amber-50 rounded-lg shadow-lg max-w-md mx-auto border-2 border-amber-200">
        <h3 className="text-xl mb-5 font-semibold text-amber-700">📜 Tending History</h3>
        {history.length === 0
          ? <p className="text-amber-600">No tending history yet for this Kinobi instance.</p>
          : (
            <div className="relative pl-8">
              {/* Timeline vine */}
              <div
                className="absolute left-4 top-2 h-full w-0.5"
                style={{
                  backgroundImage: "linear-gradient(to bottom, #d97706 0%, #92400e 100%)",
                  boxShadow: "0 0 8px rgba(217, 119, 6, 0.5)",
                }}
              >
              </div>

              <ul className="space-y-10">
                {history.map((entry: any) => (
                  <li key={entry.id} className="relative timeline-entry">
                    {/* Timeline dot */}
                    <div className="absolute -left-8 top-0 h-5 w-5 rounded-full bg-amber-100 border-2 border-amber-500 flex items-center justify-center timeline-dot">
                      <div className="h-2 w-2 rounded-full bg-amber-600 timeline-dot-inner"></div>
                    </div>

                    <div className="bg-amber-50 p-4 rounded-lg shadow-sm border border-amber-200">
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-amber-800 text-lg tracking-wide">{entry.person}</span>
                          {(() => {
                            const chore = getChoreById(entry.chore_id);
                            return chore ? (
                              <span className="text-sm bg-amber-200 px-2 py-0.5 rounded flex items-center gap-1">
                                <span>{chore.icon}</span>
                                <span>{chore.name}</span>
                              </span>
                            ) : null;
                          })()}
                        </div>

                        {/* Clickable timestamp */}
                        <button
                          onClick={() => toggleExactTime(entry.id)}
                          className={`text-left text-sm text-amber-600 hover:text-amber-800 mt-1 transition-colors duration-200`}
                        >
                          {showExactTimes[entry.id]
                            ? new Date(entry.timestamp).toLocaleString()
                            : formatRelativeTime(entry.timestamp)}
                        </button>

                        {/* Display notes if they exist */}
                        {entry.notes && (
                          <div className="mt-2 p-2 bg-yellow-100 rounded text-sm text-amber-800 border border-yellow-200">
                            <div className="font-medium mb-1">Notes:</div>
                            <p className="whitespace-pre-wrap">{entry.notes}</p>
                          </div>
                        )}
                      </div>

                      <div className="mt-3 flex justify-end">
                        <button
                          onClick={() => handleDeleteHistoryEntry(entry.id)}
                          className="text-sm text-red-400 hover:text-red-600 transition-colors duration-200"
                          disabled={isProcessing}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
      </section>
    </div>
  );
}

// --- SYNC SETTINGS COMPONENTS ---

function SyncSettingsView({ updateAvailable, onUpdate, currentClientVersion }: {
  updateAvailable: boolean;
  onUpdate: () => void;
  currentClientVersion: string | null;
}) {
  const syncId = useSyncId();
  if (!syncId) return <div>Loading sync information...</div>;
  return (
    <div className="space-y-6 w-full max-w-lg p-4">
      <section className="bg-white rounded-lg shadow p-4">
        <UpdatesComponent updateAvailable={updateAvailable} onUpdate={onUpdate} currentClientVersion={currentClientVersion} />
      </section>
      <section className="bg-white rounded-lg shadow p-4">
        <ManageChoresComponent />
      </section>
      <section className="bg-white rounded-lg shadow p-4">
        <ManageTendersComponent />
      </section>
      <section className="bg-white rounded-lg shadow p-4">
        <SyncSettingsComponent currentSyncId={syncId} />
      </section>
    </div>
  );
}

function UpdatesComponent({ updateAvailable, onUpdate, currentClientVersion }: {
  updateAvailable: boolean;
  onUpdate: () => void;
  currentClientVersion: string | null;
}) {
  const [latestServerVersion, setLatestServerVersion] = useState<string | null>(null);
  const [isLoadingLatestVersion, setIsLoadingLatestVersion] = useState(false);

  useEffect(() => {
    if (updateAvailable) {
      setIsLoadingLatestVersion(true);
      fetch("/api/app-version") // Assuming syncId is not needed for this global app version
        .then(res => {
          if (!res.ok) throw new Error("Failed to fetch latest version");
          return res.json();
        })
        .then(data => {
          setLatestServerVersion(data.version);
        })
        .catch(error => {
          console.error("Error fetching latest app version:", error);
          setLatestServerVersion(null); // Clear or set error state
        })
        .finally(() => {
          setIsLoadingLatestVersion(false);
        });
    }
  }, [updateAvailable]);

  return (
    <section className="p-4 bg-white rounded-lg shadow">
      <h3 className="text-xl mb-3 font-semibold text-amber-700">App Updates</h3>

      {updateAvailable
        ? (
          <div className="bg-amber-100 p-4 rounded-md border border-amber-300">
            <div className="flex flex-col">
              <div className="flex items-center mb-2">
                <div className="text-amber-800 flex-grow">
                  <p className="font-medium">A new version is available!</p>
                  {currentClientVersion && <p className="text-sm mt-1">Current version: {currentClientVersion}</p>}
                  {isLoadingLatestVersion && <p className="text-sm mt-1">Checking for latest version...</p>}
                  {latestServerVersion && !isLoadingLatestVersion && (
                    <p className="text-sm mt-1">New version: {latestServerVersion}</p>
                  )}
                </div>
                <button
                  onClick={onUpdate}
                  className="bg-amber-600 text-white px-4 py-2 rounded-md text-sm hover:bg-amber-700 transition-colors duration-150 ml-4"
                >
                  Update Now
                </button>
              </div>
              {latestServerVersion && currentClientVersion && latestServerVersion === currentClientVersion
                && !isLoadingLatestVersion && (
                <p className="text-xs text-amber-600 mt-1">
                  You appear to have the latest code, but a service worker update is pending. Clicking update will
                  refresh.
                </p>
              )}
            </div>
          </div>
        )
        : (
          <div className="bg-green-50 p-4 rounded-md border border-green-200">
            <div className="flex items-center">
              <div className="text-green-800">
                <p className="font-medium">You're using the latest version</p>
                {currentClientVersion && <p className="text-sm mt-1">Version: {currentClientVersion}</p>}
                {!currentClientVersion && <p className="text-sm mt-1">Shitty is up to date!</p>}
              </div>
              <svg
                className="h-5 w-5 text-green-600 ml-auto"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
          </div>
        )}
    </section>
  );
}

function ManageChoresComponent() {
  const syncId = useSyncId();
  const [chores, setChores] = useState<Chore[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newChoreName, setNewChoreName] = useState("");
  const [newChoreIcon, setNewChoreIcon] = useState("");
  const [newCycleDuration, setNewCycleDuration] = useState<number>(24);
  const [newPoints, setNewPoints] = useState<number>(10);
  const [isProcessing, setIsProcessing] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  async function fetchChoresInternal() {
    if (!syncId) return;
    setIsLoading(true);
    setIsProcessing(true);
    try {
      const choresResponse = await fetch(`/api/${syncId}/chores`);
      console.log('[DEBUG] Fetched choresResponse:', choresResponse);
      if (!choresResponse.ok) throw new Error(`Chores fetch error! status: ${choresResponse.status}`);
      const choresData = await choresResponse.json();
      console.log('[DEBUG] choresData:', choresData);
      setChores(Array.isArray(choresData) ? choresData : []);
    } catch (error) {
      console.error('[ERROR] Error fetching chores:', error);
      setChores([]);
    }
    setIsLoading(false);
    setIsProcessing(false);
  }

  useEffect(() => {
    fetchChoresInternal();
  }, [syncId]);

  async function handleAddChore() {
    if (!syncId || !newChoreName.trim() || !newChoreIcon.trim()) return;
    setIsProcessing(true);
    try {
      const response = await fetch(`/api/${syncId}/chores`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          name: newChoreName.trim(), 
          icon: newChoreIcon.trim(),
          cycleDuration: newCycleDuration,
          points: newPoints
        }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }
      setNewChoreName("");
      setNewChoreIcon("");
      setNewCycleDuration(24);
      setNewPoints(10);
      fetchChoresInternal(); // Refresh chores
    } catch (error) {
      console.error("Error adding chore:", error);
    } finally {
      setIsProcessing(false);
    }
  }

  async function handleRenameChore(choreId: string, currentName: string, currentIcon: string) {
    if (!syncId || !choreId) return;
    const newName = prompt("Enter new name for " + currentName + ":", currentName);
    if (newName && newName.trim() && newName.trim() !== currentName) {
      setIsProcessing(true);
      try {
        await fetch(`/api/${syncId}/chores/${choreId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: newName.trim(), icon: currentIcon }),
        });
        fetchChoresInternal(); // Refresh
      } catch (error) {
        console.error("Error renaming chore:", error);
      } finally {
        setIsProcessing(false);
      }
    }
  }

  async function handleChangeIcon(choreId: string, currentName: string, currentIcon: string) {
    if (!syncId || !choreId) return;
    const newIcon = prompt("Enter new icon for " + currentName + ":", currentIcon);
    if (newIcon && newIcon.trim() && newIcon.trim() !== currentIcon) {
      setIsProcessing(true);
      try {
        await fetch(`/api/${syncId}/chores/${choreId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: currentName, icon: newIcon.trim() }),
        });
        fetchChoresInternal(); // Refresh
      } catch (error) {
        console.error("Error changing chore icon:", error);
      } finally {
        setIsProcessing(false);
      }
    }
  }

  async function handleEditCycle(choreId: string, currentCycleDuration: number) {
    if (!syncId || !choreId) return;
    const newCycleStr = prompt(`Enter new cycle duration in hours for this chore:`, currentCycleDuration.toString());
    if (newCycleStr) {
      const newCycle = parseInt(newCycleStr);
      if (!isNaN(newCycle) && newCycle > 0 && newCycle !== currentCycleDuration) {
        setIsProcessing(true);
        try {
          await fetch(`/api/${syncId}/chores/${choreId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ cycleDuration: newCycle }),
          });
          fetchChoresInternal(); // Refresh
        } catch (error) {
          console.error("Error updating cycle duration:", error);
        } finally {
          setIsProcessing(false);
        }
      }
    }
  }

  async function handleEditPoints(choreId: string, currentPoints: number) {
    if (!syncId || !choreId) return;
    const newPointsStr = prompt(`Enter new points value for this chore:`, currentPoints.toString());
    if (newPointsStr) {
      const newPoints = parseInt(newPointsStr);
      if (!isNaN(newPoints) && newPoints > 0 && newPoints !== currentPoints) {
        setIsProcessing(true);
        try {
          await fetch(`/api/${syncId}/chores/${choreId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ points: newPoints }),
          });
          fetchChoresInternal(); // Refresh
        } catch (error) {
          console.error("Error updating points:", error);
        } finally {
          setIsProcessing(false);
        }
      }
    }
  }

  async function handleDeleteChore(choreId: string, choreName: string) {
    if (!syncId || !choreId) return;
    if (!confirm(`Are you sure you want to delete the chore "${choreName}"? This will also delete all tending history for this chore.`)) return;
    setIsProcessing(true);
    try {
      await fetch(`/api/${syncId}/chores/${choreId}`, { method: "DELETE" });
      fetchChoresInternal(); // Refresh
    } catch (error) {
      console.error("Error deleting chore:", error);
    } finally {
      setIsProcessing(false);
    }
  }

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = async (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    
    if (draggedIndex === null || draggedIndex === dropIndex) {
      setDraggedIndex(null);
      return;
    }

    setIsProcessing(true);
    
    try {
      // Create a new array with reordered chores
      const newChores = [...chores];
      const draggedChore = newChores[draggedIndex];
      
      // Remove the dragged item
      newChores.splice(draggedIndex, 1);
      
      // Insert it at the new position
      newChores.splice(dropIndex, 0, draggedChore);
      
      // Update the local state immediately for responsive UI
      setChores(newChores);
      
      // Send all chores in new order to the server
      await fetch(`/api/${syncId}/chores/reorder`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chores: newChores }),
      });
      
    } catch (error) {
      console.error("Error reordering chores:", error);
      // Revert on error
      fetchChoresInternal();
    } finally {
      setIsProcessing(false);
      setDraggedIndex(null);
    }
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  if (isLoading) {
    return (
      <div className="text-2xl mt-6 text-amber-700">
        Loading chores...
        <span>.</span>
        <span>.</span>
        <span>.</span>
      </div>
    );
  }

  return (
    <div className={`mt-6 ${isProcessing ? "opacity-50 pointer-events-none" : ""}`}>
      <section className="p-4 bg-gradient-to-br from-yellow-50 to-amber-50 rounded-lg shadow-lg border-2 border-amber-200">
        <h3 className="text-xl mb-3 font-semibold text-amber-700">🎯 Manage Chores</h3>
        {chores.length === 0 && !isLoading
          ? <p className="text-amber-600">No chores added yet.</p>
          : null}
        <div className="mb-4 text-sm text-amber-600 bg-amber-50 p-2 rounded border">
          💡 <strong>Tip:</strong> Drag and drop chores to reorder them. The order here determines how they appear on the main page.
        </div>
        <ul className="space-y-2">
          {chores.map((chore: any, index: number) => (
            <li
              key={chore.id}
              draggable={!isProcessing}
              onDragStart={(e) => handleDragStart(e, index)}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, index)}
              onDragEnd={handleDragEnd}
              className={`flex items-center justify-between p-3 bg-amber-50 rounded border border-amber-200 transition-all duration-200 ${
                draggedIndex === index 
                  ? "opacity-50 scale-95 border-amber-400 shadow-lg" 
                  : "hover:shadow-md hover:border-amber-300 cursor-move"
              } ${isProcessing ? "pointer-events-none opacity-60" : ""}`}
            >
              <div className="flex items-center gap-3">
                <div className="flex flex-col items-center text-amber-400">
                  <span className="text-xs leading-none">⋮⋮</span>
                  <span className="text-xs leading-none">⋮⋮</span>
                </div>
                <span className="text-2xl">{chore.icon}</span>
                <div className="flex flex-col">
                  <span className="text-amber-800 font-medium">{chore.name}</span>
                  <div className="flex gap-4 text-xs text-amber-600">
                    <span>🔄 {chore.cycleDuration || 24}h cycle</span>
                    <span>⭐ {chore.points || 10} points</span>
                  </div>
                </div>
              </div>
              <div className="space-x-2">
                <button
                  onClick={() => handleEditCycle(chore.id, chore.cycleDuration || 24)}
                  className="text-sm text-green-500 hover:text-green-700"
                  disabled={isProcessing}
                >
                  🕐 Cycle
                </button>
                <button
                  onClick={() => handleEditPoints(chore.id, chore.points || 10)}
                  className="text-sm text-purple-500 hover:text-purple-700"
                  disabled={isProcessing}
                >
                  ⭐ Points
                </button>
                <button
                  onClick={() => handleChangeIcon(chore.id, chore.name, chore.icon)}
                  className="text-sm text-blue-500 hover:text-blue-700"
                  disabled={isProcessing}
                >
                  🎨 Icon
                </button>
                <button
                  onClick={() => handleRenameChore(chore.id, chore.name, chore.icon)}
                  className="text-sm text-blue-500 hover:text-blue-700"
                  disabled={isProcessing}
                >
                  ✏️ Rename
                </button>
                <button
                  onClick={() => handleDeleteChore(chore.id, chore.name)}
                  className="text-sm text-red-500 hover:text-red-700"
                  disabled={isProcessing}
                >
                  ❌ Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
        <div className="mt-4 space-y-2">
          <div className="flex gap-2">
            <input
              type="text"
              value={newChoreIcon}
              onChange={(e) => setNewChoreIcon(e.target.value)}
              placeholder="Icon"
              className="w-20 border border-amber-300 rounded px-2 py-1 focus:ring-amber-500 focus:border-amber-500 bg-yellow-50 text-center text-2xl"
              disabled={isProcessing}
              maxLength={2}
            />
            <input
              type="text"
              value={newChoreName}
              onChange={(e) => setNewChoreName(e.target.value)}
              placeholder="New chore name"
              className="flex-grow border border-amber-300 rounded px-2 py-1 focus:ring-amber-500 focus:border-amber-500 bg-yellow-50"
              disabled={isProcessing}
            />
          </div>
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="block text-xs text-amber-700 mb-1">Cycle Duration (hours)</label>
              <input
                type="number"
                value={newCycleDuration}
                onChange={(e) => setNewCycleDuration(Math.max(1, parseInt(e.target.value) || 1))}
                placeholder="24"
                min="1"
                max="8760"
                className="w-full border border-amber-300 rounded px-2 py-1 focus:ring-amber-500 focus:border-amber-500 bg-yellow-50"
                disabled={isProcessing}
              />
            </div>
            <div className="flex-1">
              <label className="block text-xs text-amber-700 mb-1">Points</label>
              <input
                type="number"
                value={newPoints}
                onChange={(e) => setNewPoints(Math.max(1, parseInt(e.target.value) || 1))}
                placeholder="10"
                min="1"
                max="1000"
                className="w-full border border-amber-300 rounded px-2 py-1 focus:ring-amber-500 focus:border-amber-500 bg-yellow-50"
                disabled={isProcessing}
              />
            </div>
            <div className="flex-1 flex items-end">
              <button
                onClick={handleAddChore}
                className="w-full bg-amber-500 hover:bg-amber-600 text-white px-4 py-1 rounded disabled:opacity-50 font-semibold"
                disabled={isProcessing || !newChoreName.trim() || !newChoreIcon.trim()}
              >
                {isProcessing ? "Adding..." : "Add Chore"}
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function ManageTendersComponent() {
  const syncId = useSyncId();
  const [tenders, setTenders] = useState<Tender[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newTenderName, setNewTenderName] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  async function fetchTendersInternal() {
    if (!syncId) return;
    setIsLoading(true);
    setIsProcessing(true);
    try {
      const tendersResponse = await fetch(`/api/${syncId}/tenders`);
      if (!tendersResponse.ok) throw new Error(`Tenders fetch error! status: ${tendersResponse.status}`);

      const tendersData = await tendersResponse.json();
      setTenders(Array.isArray(tendersData) ? tendersData : []);
    } catch (error) {
      console.error("Error fetching tenders:", error);
      setTenders([]);
    }
    setIsLoading(false);
    setIsProcessing(false);
  }

  useEffect(() => {
    fetchTendersInternal();
  }, [syncId]);

  async function handleAddTender() {
    if (!syncId || !newTenderName.trim()) return;
    setIsProcessing(true);
    try {
      const response = await fetch(`/api/${syncId}/tenders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newTenderName.trim() }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }
      setNewTenderName("");
      fetchTendersInternal(); // Refresh tenders
    } catch (error) {
      console.error("Error adding tender:", error);
    } finally {
      setIsProcessing(false);
    }
  }

  async function handleRenameTender(tenderId: string, currentName: string) {
    if (!syncId || !tenderId) return;
    const newName = prompt("Enter new name for " + currentName + ":", currentName);
    if (newName && newName.trim() && newName.trim() !== currentName) {
      setIsProcessing(true);
      try {
        await fetch(`/api/${syncId}/tenders/${tenderId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: newName.trim() }),
        });
        fetchTendersInternal(); // Refresh
      } catch (error) {
        console.error("Error renaming tender:", error);
      } finally {
        setIsProcessing(false);
      }
    }
  }

  async function handleDeleteTender(tenderId: string, tenderName: string) {
    if (!syncId || !tenderId) return;
    if (!confirm(`Are you sure you want to delete tender "${tenderName}"? This cannot be undone.`)) return;
    setIsProcessing(true);
    try {
      await fetch(`/api/${syncId}/tenders/${tenderId}`, { method: "DELETE" });
      fetchTendersInternal(); // Refresh
    } catch (error) {
      console.error("Error deleting tender:", error);
    } finally {
      setIsProcessing(false);
    }
  }

  if (isLoading) {
    return (
      <div className="text-2xl mt-6 text-amber-700">
        Loading tenders...
        <span>.</span>
        <span>.</span>
        <span>.</span>
      </div>
    );
  }

  return (
    <div className={`mt-6 ${isProcessing ? "opacity-50 pointer-events-none" : ""}`}>
      <section className="p-4 bg-gradient-to-br from-yellow-50 to-amber-50 rounded-lg shadow-lg border-2 border-amber-200">
        <h3 className="text-xl mb-3 font-semibold text-amber-700">👥 Manage Tenders</h3>
        {tenders.length === 0 && !isLoading
          ? <p className="text-amber-600">No tenders added yet.</p>
          : null}
        <ul className="space-y-2">
          {tenders.map((tender: any) => (
            <li
              key={tender.id}
              className="flex items-center justify-between p-2 bg-amber-50 rounded border border-amber-200"
            >
              <span className="text-amber-800">{tender.name}</span>
              <div className="space-x-2">
                <button
                  onClick={() => handleRenameTender(tender.id, tender.name)}
                  className="text-sm text-blue-500 hover:text-blue-700"
                  disabled={isProcessing}
                >
                  ✏️ Rename
                </button>
                <button
                  onClick={() => handleDeleteTender(tender.id, tender.name)}
                  className="text-sm text-red-500 hover:text-red-700"
                  disabled={isProcessing}
                >
                  ❌ Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
        <div className="flex mt-4">
          <input
            type="text"
            value={newTenderName}
            onChange={(e) => setNewTenderName(e.target.value)}
            placeholder="New tender name"
            className="flex-grow border border-amber-300 rounded-l px-2 py-1 focus:ring-amber-500 focus:border-amber-500 bg-yellow-50"
            disabled={isProcessing}
          />
          <button
            onClick={handleAddTender}
            className="bg-amber-500 hover:bg-amber-600 text-white px-4 py-1 rounded-r disabled:opacity-50 font-semibold"
            disabled={isProcessing || !newTenderName.trim()}
          >
            {isProcessing ? "Adding..." : "Add Tender"}
          </button>
        </div>
      </section>
    </div>
  );
}

function SyncSettingsComponent({ currentSyncId }: { currentSyncId: string }) {
  const [newCodeInput, setNewCodeInput] = useState("");
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const [isApplying, setIsApplying] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(currentSyncId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleApplyNewCode = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const trimmedCode = newCodeInput.trim();

    if (!trimmedCode) {
      setError("Sync code cannot be empty.");
      return;
    }
    if (trimmedCode.length < 6) {
      setError("Sync code should be at least 6 characters long.");
      return;
    }
    if (trimmedCode === currentSyncId) {
      setError("This is already your current sync code.");
      return;
    }

    setIsApplying(true);
    setSyncIdInLocalStorage(trimmedCode);

    setTimeout(() => {
      window.location.reload();
    }, 500);
  };

  const handleGenerateNew = () => {
    if (
      window.confirm(
        "Generating a new code will create a new sync instance. Your current data will remain but will no longer be associated with this view until you re-enter the old code. Continue?",
      )
    ) {
      setIsApplying(true);
      const newGeneratedSyncId = generateNewSyncIdInternal();
      setSyncIdInLocalStorage(newGeneratedSyncId);
      setTimeout(() => {
        window.location.reload();
      }, 500);
    }
  };

  if (isApplying) {
    return (
      <div className="text-center p-8">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-amber-500 mb-4">
        </div>
        <p>Applying new sync code...</p>
        <p className="text-sm text-gray-500 mt-2">The view will reload with the new instance.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6 max-w-lg mx-auto">
      <div className="mb-6">
        <p className="text-gray-700 mb-2 font-semibold">Your Current Sync Code:</p>
        <div className="flex items-center">
          <div className="bg-gray-100 p-3 rounded-md flex-1 font-mono text-sm overflow-x-auto shadow-inner">
            {currentSyncId}
          </div>
          <button
            onClick={handleCopy}
            className="ml-3 p-2 bg-amber-100 hover:bg-amber-200 rounded-md text-amber-800 transition-colors duration-150 ease-in-out"
            title="Copy sync code"
          >
            {copied ? "Copied!" : "📋 Copy"}
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          This code links your browser to a specific Shitty data instance.
        </p>
      </div>

      <div className="bg-amber-50 p-4 rounded-md mb-6 border border-amber-200">
        <h3 className="font-medium text-amber-800 mb-2">How Syncing Works Here:</h3>
        <ul className="list-disc pl-5 space-y-1 text-sm text-amber-700">
          <li>The Sync Code is stored in your browser's local storage.</li>
          <li>Changing the code switches to a different data set.</li>
          <li>To use Shitty on another device with the SAME data, enter this exact Sync Code there.</li>
          <li>Generating a new code effectively creates a fresh, empty Shitty instance for this browser.</li>
        </ul>
      </div>

      <form onSubmit={handleApplyNewCode} className="space-y-4 mb-6">
        <div>
          <label htmlFor="newCode" className="block text-sm font-medium text-gray-700 mb-1">
            Enter an Existing or New Sync Code:
          </label>
          <input
            id="newCode"
            type="text"
            value={newCodeInput}
            onChange={(e) => {
              setNewCodeInput(e.target.value);
              setError("");
            }}
            placeholder="e.g., my-living-room-display"
            className={`w-full p-2 border rounded-md shadow-sm focus:ring-amber-500 focus:border-amber-500 ${
              error ? "border-red-500" : "border-gray-300"
            }`}
          />
          {error && <p className="text-red-600 text-sm mt-1">{error}</p>}
        </div>
        <button
          type="submit"
          className="w-full p-2 bg-amber-500 hover:bg-amber-600 text-white rounded-md transition-colors duration-150 ease-in-out disabled:opacity-70"
          disabled={!newCodeInput.trim() || newCodeInput.trim() === currentSyncId || isApplying}
        >
          Apply & Switch Instance
        </button>
      </form>

      <div>
        <button
          onClick={handleGenerateNew}
          className="w-full p-2 bg-orange-500 hover:bg-orange-600 text-white rounded-md transition-colors duration-150 ease-in-out"
        >
          Generate New Unique Code (New Instance)
        </button>
        <p className="text-xs text-gray-500 mt-2 text-center">
          This will start a fresh Shitty instance on this device.
        </p>
      </div>
    </div>
  );
}

// --- END SYNC SETTINGS COMPONENTS ---

function client() {
  const rootElement = document.getElementById("root");
  if (rootElement) {
    createRoot(rootElement).render(<RoutedApp />);
  } else {
    console.error("Root element not found!");
  }
}

if (typeof document !== "undefined") { 
  // Wait for DOM to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', client);
  } else {
    client();
  }
}

// --- Countdown Calculation Service ---
class CountdownService {
  static calculateCountdownState(chore: Chore, config: ChoreConfig): CountdownState {
    const now = Date.now();
    
    // If no last completion, show as good (new chore)
    if (!chore.lastCompleted || !chore.dueDate) {
      return {
        progress: 0,
        status: 'good',
        timeRemaining: chore.cycleDuration
      };
    }
    
    const timeSinceCompletion = now - chore.lastCompleted;
    const cycleDurationMs = chore.cycleDuration * 60 * 60 * 1000; // Convert hours to ms
    const progress = timeSinceCompletion / cycleDurationMs;
    
    // Calculate hours remaining (can be negative if overdue)
    const timeRemainingMs = chore.dueDate - now;
    const timeRemainingHours = timeRemainingMs / (60 * 60 * 1000);
    
    let status: CountdownState['status'];
    if (progress >= 1) {
      status = 'overdue';
    } else if (progress >= (config.urgentThreshold / 100)) {
      status = 'urgent';
    } else if (progress >= (config.warningThreshold / 100)) {
      status = 'warning';
    } else {
      status = 'good';
    }
    
    return {
      progress: Math.max(0, progress), // Ensure progress is at least 0
      status,
      timeRemaining: timeRemainingHours
    };
  }
  
  static formatTimeRemaining(hours: number): string {
    if (hours < 0) {
      const overdue = Math.abs(hours);
      if (overdue < 1) return 'overdue';
      if (overdue < 24) return `${Math.round(overdue)}h overdue`;
      const days = Math.floor(overdue / 24);
      const remainingHours = Math.round(overdue % 24);
      if (remainingHours === 0) return `${days}d overdue`;
      return `${days}d ${remainingHours}h overdue`;
    }
    
    if (hours < 1) return 'due soon';
    if (hours < 24) return `${Math.round(hours)}h left`;
    const days = Math.floor(hours / 24);
    const remainingHours = Math.round(hours % 24);
    if (remainingHours === 0) return `${days}d left`;
    return `${days}d ${remainingHours}h left`;
  }
  
  static getStatusColor(status: CountdownState['status']): string {
    switch (status) {
      case 'good': return '#22c55e'; // green-500
      case 'warning': return '#eab308'; // yellow-500
      case 'urgent': return '#f97316'; // orange-500
      case 'overdue': return '#ef4444'; // red-500
      default: return '#22c55e';
    }
  }
  
  static interpolateColor(fromColor: string, toColor: string, factor: number): string {
    // Simple RGB interpolation
    const fromRgb = fromColor.match(/\w\w/g)?.map(x => parseInt(x, 16)) || [0, 0, 0];
    const toRgb = toColor.match(/\w\w/g)?.map(x => parseInt(x, 16)) || [0, 0, 0];
    
    const r = Math.round(fromRgb[0] + (toRgb[0] - fromRgb[0]) * factor);
    const g = Math.round(fromRgb[1] + (toRgb[1] - fromRgb[1]) * factor);
    const b = Math.round(fromRgb[2] + (toRgb[2] - fromRgb[2]) * factor);
    
    return `rgb(${r}, ${g}, ${b})`;
  }
}

// --- Progress Ring Component ---
interface ProgressRingProps {
  progress: number; // 0-1
  status: CountdownState['status'];
  size: number; // Diameter in pixels
  strokeWidth?: number;
  children?: React.ReactNode;
}

function ProgressRing({ progress, status, size, strokeWidth = 4, children }: ProgressRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progress * circumference);
  
  const statusColor = CountdownService.getStatusColor(status);
  
  // Filled circle background based on status
  const fillColor = status === 'good' ? '#dcfce7' : 
                    status === 'warning' ? '#fef3c7' :
                    status === 'urgent' ? '#fed7aa' : '#fecaca';
  
  // Light gray background for the progress ring
  const ringBgColor = '#e5e7eb';
  
  // Inner circle radius (slightly smaller to leave room for the ring)
  const innerRadius = radius - strokeWidth - 2;
  
  // Add pulse animation for urgent and overdue states
  const ringClasses = `transform -rotate-90 ${
    status === 'overdue' ? 'animate-pulse' : 
    status === 'urgent' ? 'animate-pulse' : ''
  }`;
  
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg 
        width={size} 
        height={size} 
        className={ringClasses}
        style={{ position: 'absolute', top: 0, left: 0 }}
      >
        {/* Filled status circle in the center */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={innerRadius}
          fill={fillColor}
          stroke={statusColor}
          strokeWidth={2}
          style={{ 
            transition: 'fill 0.3s ease-in-out, stroke 0.3s ease-in-out'
          }}
        />
        
        {/* Background ring for progress */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={ringBgColor}
          strokeWidth={strokeWidth}
          fill="none"
        />
        
        {/* Progress ring */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={statusColor}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          style={{ 
            transition: 'stroke-dashoffset 0.5s ease-in-out, stroke 0.3s ease-in-out'
          }}
        />
        
        {/* Additional glow effect for overdue items */}
        {status === 'overdue' && (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius + 2}
            stroke={statusColor}
            strokeWidth={1}
            fill="none"
            opacity="0.3"
            className="animate-ping"
          />
        )}
      </svg>
      {/* Content in center */}
      <div 
        className="absolute inset-0 flex items-center justify-center"
        style={{ 
          width: size - strokeWidth * 4, 
          height: size - strokeWidth * 4,
          margin: strokeWidth * 2
        }}
      >
        {children}
      </div>
    </div>
  );
}

// --- Time Display Component ---
interface TimeDisplayProps {
  countdownState: CountdownState;
  format?: 'compact' | 'full';
}

function TimeDisplay({ countdownState, format = 'compact' }: TimeDisplayProps) {
  const timeText = CountdownService.formatTimeRemaining(countdownState.timeRemaining);
  const color = CountdownService.getStatusColor(countdownState.status);
  
  if (format === 'compact') {
    return (
      <div 
        className="text-xs font-medium text-center leading-tight"
        style={{ color }}
      >
        {timeText}
      </div>
    );
  }
  
  return (
    <div className="text-center">
      <div 
        className="text-sm font-semibold"
        style={{ color }}
      >
        {timeText}
      </div>
      <div className="text-xs text-amber-600 capitalize">
        {countdownState.status}
      </div>
    </div>
  );
}