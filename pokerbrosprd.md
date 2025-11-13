## Overview

Build a web application called "PokerBros" for managing monthly home poker games. This is a hackathon build focused on demonstrating core game management, real-time money tracking, and player statistics. No authentication or calendar integration needed for MVP.

## Tech Stack

- **Frontend**: React/Next.js with TypeScript
- **Styling**: Tailwind CSS with dark green poker/casino theme
- **Database**: Supabase (with real-time subscriptions)
- **State Management**: React hooks + Supabase real-time
- **Deployment**: Vercel

## Core Features Priority

1. Game creation and RSVP management with automatic waitlist
2. Live game tracking with buy-ins and rebuys
3. Cash-out recording with profit/loss calculations
4. Player statistics and leaderboard
5. Demo mode for hackathon presentation

## Data Model

```typescript
interface Player {
  id: string;
  name: string;
  email: string;
  totalIn: number;
  totalOut: number;
  gamesPlayed: number;
  biggestWin: number;
  biggestLoss: number;
}

interface Game {
  id: string;
  date: string;
  time: string;
  buyIn: number;
  venue: string;
  status: 'upcoming' | 'in_progress' | 'completed';
  notes?: string;
  createdAt: string;
}

interface GamePlayer {
  gameId: string;
  playerId: string;
  buyIns: number[]; // Array to track multiple buy-ins
  cashOut: number;
  profit: number; // Calculated: cashOut - sum(buyIns)
  position?: number; // Final position in game
}

interface RSVP {
  gameId: string;
  playerId: string;
  status: 'confirmed' | 'declined' | 'waitlist';
  timestamp: string;
  waitlistPosition?: number;
}
```

## Page Structure

### 1. Landing/Dashboard (`/`)

- **Hero Section**: "PokerBros - Never Miss a Full Table" with quick stats
- **Quick Stats Cards**:
    - Total Games Hosted
    - Total Money Played
    - Current Chip Leader
    - Next Game Date
- **Game Sections**:
    - Tonight's Game (if exists)
    - Upcoming Games (sorted by date)
    - Past Games (last 5, with "View All" link)
- **Floating Action Button**: "Host New Game" (bottom right on mobile)
- **Each Game Card Shows**:
    - Date & Time
    - Buy-in amount
    - Player count (e.g., "6/8 Confirmed")
    - Waitlist count if applicable
    - Status badge (Upcoming/In Progress/Completed)
    - Action button based on status

### 2. Game Creation Modal

- **Fields**:
    - Date (date picker, Fridays highlighted)
    - Time (time picker, default 7:00 PM)
    - Buy-in Amount (number input, default $20)
    - Venue/Location (text input)
    - Notes (textarea, optional)
- **Live Preview Card**: Updates as fields are filled
- **Create Game**: Saves and redirects to game detail page

### 3. Game Detail Page (`/game/[id]`)

- **Game Info Header**:
    - Date, time, buy-in, venue
    - Status badge
    - Edit button (if upcoming)
    - Start Game button (if today and not started)
- **RSVP Section** (if upcoming):
    - Player selector dropdown (all players)
    - "I Want to Play!" button
    - Visual seat indicators (8 circles, green=filled, gray=empty)
    - Confirmed Players list with timestamps
    - Waitlist queue with positions
    - "Cancel My Spot" option for confirmed players
- **Auto-promotion Logic**:
    - When someone cancels, first waitlist person auto-promoted
    - Green notification banner: "You've been promoted from the waitlist!"
    - Celebration animation on promotion

### 4. Live Game Tracker (`/game/[id]/live`)

- **Activated when**: Game status changes to "in_progress"
- **Pot Total Display**: Large, prominent, real-time updating
- **Player Grid** (2 columns on mobile, 4 on desktop):
    - Player name
    - Current buy-in total
    - Number of rebuys
    - "Add Rebuy +$20" button (with coin animation)
    - Running total highlighted
- **Game Stats Bar**:
    - Biggest pot contributor
    - Most rebuys
    - Game duration timer
- **End Game Button**: Navigates to cash-out page

### 5. Cash-Out Recording (`/game/[id]/cashout`)

- **Pot Total Reminder**: Shows total amount to distribute
- **Player List**:
    - Name and total buy-in amount
    - Cash-out input field
    - Quick adjust buttons (-$5, +$5)
    - Preset buttons: "Busted" ($0), "Even" (equals buy-in)
    - Real-time profit/loss display (green/red)
- **Validation Section**:
    - Total In: $XXX
    - Total Out: $XXX
    - Difference: $X (highlighted red if not zero)
    - "Totals must match!" warning if unbalanced
- **Finalize Results**: Saves and redirects to results page

### 6. Game Results Page (`/game/[id]/results`)

- **Winner/Loser Highlight**:
    - Biggest Winner (crown icon, gold background)
    - Biggest Loser (animated sad face)
- **Results Table**:
    - Player name
    - Buy-in total
    - Cash-out amount
    - Profit/Loss (colored)
    - ROI percentage
- **Game Statistics**:
    - Total pot
    - Number of players
    - Total rebuys
    - Average buy-in
    - Game duration
- **Actions**:
    - "Share Results" (copies formatted text)
    - "Schedule Rematch" (pre-fills next Friday)

### 7. Statistics Dashboard (`/stats`)

- **Leaderboard View**:
    - Rank (1, 2, 3 with medal icons)
    - Player name
    - Games played
    - Total profit/loss (colored)
    - Win rate (% of profitable games)
    - Average buy-in
    - Biggest win
    - Biggest loss
    - Hot/cold streak indicator
- **Filter Options**:
    - "All Time" (default)
    - "Last 5 Games"
    - "This Month"
- **Fun Badges**:
    - 🦈 "Shark" (highest win rate)
    - 💰 "ATM" (biggest loser)
    - 🎰 "Grinder" (most games)
    - 💎 "High Roller" (highest avg buy-in)
- **Player Detail Modal**: Click name for game-by-game history with chart

## Key User Flows

### Flow 1: Create and Fill a Game

1. Host clicks "Host New Game"
2. Fills in date (next Friday), time (7 PM), buy-in ($20)
3. Game created, redirects to game page
4. Players select their name and click "I Want to Play!"
5. First 8 get confirmed (shown in order)
6. 9th+ automatically go to waitlist
7. If someone cancels, first waitlist promoted instantly

### Flow 2: Run Live Game

1. Host clicks "Start Game" on game day
2. All confirmed players shown in grid
3. Host taps "Add Rebuy" as players rebuy
4. Pot total updates in real-time
5. Host clicks "End Game" when complete
6. Records each player's cash-out amount
7. System calculates profits/losses
8. Results page shows winner/loser

### Flow 3: View Statistics

1. Navigate to /stats
2. See leaderboard sorted by total profit
3. Click player for detailed history
4. Toggle time filters
5. See fun badges and achievements

## Seed Data Requirements

Create 14 players with poker-themed names:

- Mix of skill levels (some consistently win, some lose)
- Varied buy-in patterns (some rebuy often, some never)
- 5 historical games with realistic results
- Total ins must equal total outs for each game
- Include some dramatic wins/losses for demo appeal

Example players:

- "Alex 'All-in' Chen"
- "Sarah 'The Shark' Johnson"
- "Mike 'ATM' Williams"
- "Lisa 'Lucky' Rodriguez"
- "Tom 'Tight' Anderson"
- "Jennifer 'Jinx' Davis"
- "Carlos 'Cooler' Martinez"
- "Rachel 'River' Brown"
- "David 'Donkey' Lee"
- "Emma 'Eagle Eye' Taylor"
- "Kevin 'King' Wilson"
- "Nicole 'Nit' Garcia"
- "James 'Juice' Miller"
- "Amy 'Ace' Thompson"

## Demo Mode Features

- **Demo Banner**: "Demo Mode - Click to Reset Data"
- **Simulate Game Button**:
    - Auto-adds 8-10 RSVPs over 5 seconds
    - Triggers waitlist for late arrivals
    - Simulates realistic rebuys during "game"
    - Generates believable cash-out distribution
- **Speed Controls**: 1x, 2x, 5x animation speed
- **Floating Labels**: Explain features as they happen
- **Presenter Mode**: Larger text and highlighted changes

## Mobile Optimization Requirements

- **Responsive Design**: Mobile-first approach
- **Touch Targets**: Minimum 44x44px for all buttons
- **Swipe Gestures**: Navigate between players in live game
- **PWA Support**:
    - Manifest file for home screen install
    - Offline queue for actions
    - Splash screen with logo
- **Landscape Mode**: Optimized table view for tablets

## Visual Design Requirements

- **Theme**: Dark green poker table background
- **Colors**:
    - Primary: Green (#059669)
    - Accent: Gold (#F59E0B)
    - Profit: Green (#10B981)
    - Loss: Red (#EF4444)
    - Background: Dark gray (#111827)
    - Card Background: Gray (#1F2937)
- **Components**:
    - Card-style containers with subtle shadows
    - Chip icons for money amounts
    - Seat indicators (circles) for capacity
    - Casino-style fonts for headers
- **Animations**:
    - Coin drop for rebuys
    - Confetti for game winner
    - Slide-in for waitlist promotion
    - Pulse for real-time updates
    - Card flip for revealing results

## Real-time Features (Supabase)

- **RSVP Updates**: All viewers see confirmations instantly
- **Waitlist Changes**: Auto-promotion visible to all
- **Live Buy-ins**: Pot total syncs across devices
- **Game Status**: Updates propagate immediately
- **Connection Indicator**: Show when offline/reconnecting

## Success Metrics for Demo

- Create game in < 30 seconds
- RSVP and trigger waitlist seamlessly
- Track live game with instant updates
- Balance cash-outs correctly
- View compelling statistics
- Full mobile functionality

## Implementation Order

1. **Phase 1 - Core Structure**:
    
    - Set up Next.js with TypeScript and Tailwind
    - Create basic routing and page structure
    - Implement casino theme and styling
2. **Phase 2 - Game Management**:
    
    - Build dashboard with game cards
    - Implement game creation modal
    - Create game detail page with RSVP
3. **Phase 3 - Player System**:
    
    - Add player dropdown selection (no auth)
    - Implement RSVP with waitlist logic
    - Add auto-promotion on cancellation
4. **Phase 4 - Live Game**:
    
    - Build live game tracker
    - Add rebuy functionality
    - Implement pot tracking
5. **Phase 5 - Results**:
    
    - Create cash-out recording page
    - Add validation for balanced books
    - Build results summary page
6. **Phase 6 - Statistics**:
    
    - Implement leaderboard
    - Add player statistics
    - Create badges and achievements
7. **Phase 7 - Supabase Integration**:
    
    - Set up database schema
    - Add real-time subscriptions
    - Implement data persistence
8. **Phase 8 - Demo Polish**:
    
    - Add demo mode with simulation
    - Implement seed data
    - Create reset functionality

## Error Handling Requirements

- **Network Errors**: Show toast notifications with retry
- **Validation Errors**: Inline field validation messages
- **Empty States**: Clear CTAs for next actions
- **Loading States**: Skeleton screens for data fetching
- **Offline Mode**: Queue actions and sync when online

## Accessibility Requirements

- **ARIA Labels**: All interactive elements
- **Keyboard Navigation**: Full support
- **Focus Management**: Logical tab order
- **Screen Reader**: Descriptive text for visual elements
- **Color Contrast**: WCAG AA compliant

## Performance Requirements

- **Initial Load**: < 3 seconds
- **Interactions**: < 100ms response
- **Animations**: 60fps smooth
- **Bundle Size**: < 500KB initial
- **Image Optimization**: WebP with fallbacks

## What Success Looks Like

A hackathon judge should be able to:

1. Create a game for tonight in seconds
2. Watch as players RSVP in real-time
3. See the waitlist work automatically
4. Track buy-ins during a "live" game
5. Record results and see instant profit/loss
6. View compelling statistics and leaderboards
7. Do everything smoothly from their phone

## Critical Implementation Notes

- **No Authentication**: Players simply select their name from dropdown
- **No External APIs**: Everything self-contained except Supabase
- **Mobile-First**: Every feature must work perfectly on phone
- **Real-time Focus**: Changes should appear instantly for all viewers
- **Visual Feedback**: Every action should have immediate visual response
- **Demo Ready**: Include plenty of seed data for impressive presentation

Build this incrementally, starting with game creation and RSVP flow, then adding live tracking, then statistics. Prioritize visual feedback and real-time updates to make the demo impressive. The goal is to show a complete, polished experience that solves real problems for home poker game organizers.