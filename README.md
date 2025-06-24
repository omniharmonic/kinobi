# Kinobi 🎯

A sophisticated chore tracking application with time-cycle awareness, visual countdown indicators, and competitive scoring. Transform your household chores into an engaging, gamified experience.

![Kinobi Logo](kinobi_alpha.gif)

## Features ✨

### 🔄 Time Cycle Management
- **Configurable Cycles**: Set custom cycle durations for each chore (1-8760 hours)
- **Automatic Due Dates**: Smart calculation of when chores need attention
- **Real-time Countdowns**: Live updates showing time remaining until due

### 🎨 Visual Countdown System
- **Filled Status Circles**: Immediate visual status indication with color-coded backgrounds
- **Progress Rings**: Outer rings showing precise countdown progression
- **Status Colors**: Green (good) → Yellow (warning) → Orange (urgent) → Red (overdue)
- **Smooth Animations**: Pulse effects for urgent/overdue chores with gentle floating animations

### 🏆 Scoring & Leaderboards
- **Point System**: Configurable points per chore completion
- **Real-time Rankings**: Live leaderboard with filtering and sorting
- **Performance Tracking**: Completion counts, averages, and recent activity
- **Visual Indicators**: Medals and badges for top performers

### 📱 Modern PWA Experience
- **Progressive Web App**: Install on any device, works offline
- **Responsive Design**: Optimized for mobile, tablet, and desktop
- **Real-time Sync**: Multiple devices, single shared instance
- **Background Optimization**: Efficient updates when app is inactive

## Technology Stack 🛠️

- **Frontend**: React + TypeScript + Tailwind CSS
- **Backend**: Bun runtime with built-in SQLite
- **Architecture**: Single-file deployment, self-contained
- **Deployment**: Ready for val.town, Vercel, or any Node.js host

## Getting Started 🚀

### Prerequisites
- [Bun](https://bun.sh/) runtime installed

### Installation
```bash
# Clone the repository
git clone https://github.com/omniharmonic/kinobi.git
cd kinobi

# Install dependencies
bun install

# Start development server
bun run dev
```

The application will be available at `http://localhost:3000`

### Production Build
```bash
# Build for production
bun run build

# Start production server
bun run start
```

## Configuration ⚙️

### Chore Settings
- **Cycle Duration**: 1-8760 hours between completions
- **Points**: 1-1000 points awarded per completion
- **Icons**: Any emoji or Unicode character
- **Ordering**: Drag-and-drop reordering in settings

### Global Configuration
- **Default Cycle**: 24 hours (customizable)
- **Default Points**: 10 points (customizable)
- **Warning Threshold**: 75% (when to show yellow)
- **Urgent Threshold**: 90% (when to show red)

## Usage Guide 📖

### Adding Chores
1. Go to **Settings** → **Manage Chores**
2. Enter chore name, icon, cycle duration, and points
3. Click **Add Chore**

### Completing Chores
1. Click on any chore icon on the main dashboard
2. Select who completed the chore
3. Add optional notes
4. Click **Log Tending**

### Viewing Progress
- **Main Dashboard**: Visual countdown rings show status at a glance
- **History**: Complete log of all chore completions
- **Leaderboard**: Rankings with filtering and sorting options

### Sync Between Devices
1. Go to **Settings** → **Sync Settings**
2. Copy your sync code
3. Enter the same code on other devices
4. All devices will share the same chore data

## Visual Design System 🎨

### Status Indicators
- **🟢 Green Circle**: Chore is on track (0-75% of cycle elapsed)
- **🟡 Yellow Circle**: Warning zone (75-90% of cycle elapsed)
- **🟠 Orange Circle**: Urgent attention needed (90-100% of cycle elapsed)
- **🔴 Red Circle**: Overdue (past due date)

### Progress Rings
- **Outer Ring**: Shows countdown progression (fills as due date approaches)
- **Inner Circle**: Shows current status with appropriate color
- **Animations**: Pulse effects for urgent/overdue states

### Responsive Layout
- **Grid System**: Automatic layout adjustment based on number of chores
- **Maximum 4 per row**: Optimal viewing on all screen sizes
- **Touch-friendly**: Large tap targets for mobile devices

## API Endpoints 🔌

### Chores
- `GET /api/:syncId/chores` - List all chores
- `POST /api/:syncId/chores` - Create new chore
- `PUT /api/:syncId/chores/:id` - Update chore
- `DELETE /api/:syncId/chores/:id` - Delete chore
- `PUT /api/:syncId/chores/reorder` - Reorder chores

### Completions
- `POST /api/:syncId/tend` - Log chore completion
- `GET /api/:syncId/history` - Get completion history
- `DELETE /api/:syncId/history/:id` - Delete history entry

### Scoring
- `GET /api/:syncId/leaderboard` - Get current rankings

### Configuration
- `GET /api/:syncId/config` - Get configuration
- `PUT /api/:syncId/config` - Update configuration

## Database Schema 💾

### Chore Object
```typescript
interface Chore {
  id: string;                 // Unique identifier
  name: string;               // Display name
  icon: string;               // Emoji or Unicode icon
  cycleDuration: number;      // Hours between completions
  points: number;             // Points awarded for completion
  lastCompleted?: number;     // Timestamp of last completion
  dueDate?: number;          // Calculated due date timestamp
}
```

### Configuration Object
```typescript
interface ChoreConfig {
  defaultCycleDuration: number;  // Default 24 hours
  defaultPoints: number;         // Default 10 points
  warningThreshold: number;      // Warning at 75%
  urgentThreshold: number;       // Urgent at 90%
}
```

## Deployment 🚀

### val.town Deployment
```javascript
// Simply upload the built bundle to val.town
// The application is self-contained with embedded SQLite
```

### Docker Deployment
```dockerfile
FROM oven/bun:1

WORKDIR /app
COPY . .
RUN bun install
RUN bun run build

EXPOSE 3000
CMD ["bun", "run", "start"]
```

### Environment Variables
- `NODE_ENV`: Set to "production" for production builds
- `PORT`: Server port (default: 3000)
- `HOST`: Server host (default: 0.0.0.0)
- `DB_PATH`: SQLite database file path

## Contributing 🤝

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## License 📄

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments 🙏

- Built with ❤️ at The Life House
- Powered by [Bun](https://bun.sh/) runtime
- UI components with [Tailwind CSS](https://tailwindcss.com/)
- Icons from the amazing emoji community

---

**Kinobi** - Transform your chores into an engaging, competitive experience! 🎯✨