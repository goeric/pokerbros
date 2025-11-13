# PokerBros

**Never Miss a Full Table** - A modern web application for managing home poker games with real-time tracking and player statistics.

![PokerBros](https://img.shields.io/badge/Built%20with-Next.js-black)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-38B2AC?logo=tailwind-css&logoColor=white)

## Features

- **🎴 Game Management**: Create and manage poker games with automatic RSVP tracking
- **📋 Smart Waitlist**: Automatic seat management with waitlist auto-promotion (8 seat limit)
- **💰 Live Tracking**: Real-time buy-in and rebuy tracking during games
- **📊 Cash-Out Validation**: Ensure balanced books with built-in validation
- **🏆 Player Statistics**: Comprehensive leaderboards and performance tracking
- **📱 Mobile-First**: Fully responsive design optimized for all devices
- **🎮 Demo Mode**: Pre-loaded with realistic seed data for testing

## Tech Stack

- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Database**: Supabase (optional - works with local state)
- **State Management**: React Hooks + Local Storage
- **Deployment**: Vercel-ready

## Getting Started

### Prerequisites

- Node.js 18+ and npm

### Installation

1. Clone the repository:
```bash
git clone <your-repo-url>
cd pokerbros
```

2. Install dependencies:
```bash
npm install
```

3. (Optional) Set up Supabase:
   - Create a `.env.local` file based on `.env.local.example`
   - Add your Supabase credentials:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```
   - **Note**: The app works without Supabase using local browser storage

4. Run the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser

## Usage

### Host a Game

1. Click the "+" button (bottom right) or "Host New Game" button
2. Fill in game details (date, time, buy-in, venue)
3. Create the game

### RSVP System

1. Players select their name from the dropdown
2. First 8 get confirmed seats
3. Additional players go to waitlist
4. Auto-promotion when someone cancels

### Live Game Tracking

1. Click "Start Game" on game day
2. Track buy-ins and rebuys in real-time
3. View total pot and player statistics
4. End game when ready to cash out

### Record Results

1. Enter each player's cash-out amount
2. Use quick buttons (Busted, Even) or manual entry
3. Validate totals match (Total In = Total Out)
4. Finalize to complete the game

### View Statistics

1. Navigate to Statistics page
2. View leaderboard ranked by profit
3. Filter by All Time, Last 5 Games, or This Month
4. See badges: Shark, ATM, Grinder, Hot Streak, etc.

## Project Structure

```
pokerbros/
├── app/                    # Next.js app router pages
│   ├── game/[id]/         # Game detail and nested pages
│   │   ├── page.tsx       # Game detail with RSVP
│   │   ├── live/          # Live game tracker
│   │   ├── cashout/       # Cash-out recording
│   │   └── results/       # Game results
│   ├── stats/             # Statistics dashboard
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Dashboard/homepage
├── components/            # Reusable UI components
├── lib/                   # Utilities and business logic
│   ├── store.ts           # Local storage management
│   ├── utils.ts           # Helper functions
│   ├── seed-data.ts       # Demo data
│   └── confetti.ts        # Celebration animations
└── types/                 # TypeScript type definitions
```

## Key Features Explained

### Automatic Waitlist Management

When a confirmed player cancels, the first person on the waitlist is automatically promoted and notified with an animated banner.

### Cash-Out Validation

The system ensures that the total amount cashed out equals the total pot, preventing accounting errors.

### Real-Time Updates

When configured with Supabase, all changes sync instantly across devices. Without Supabase, uses browser local storage.

### Demo Mode

The app comes pre-loaded with:
- 14 players with poker-themed names
- 5 completed historical games with realistic results
- 1 upcoming game with sample RSVPs

## Deployment

### Deploy to Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new)

1. Push your code to GitHub
2. Import the repository in Vercel
3. Add environment variables (if using Supabase)
4. Deploy!

## Development

### Commands

```bash
# Development
npm run dev

# Build
npm run build

# Start production server
npm start

# Lint
npm run lint

# Type check
npx tsc --noEmit
```

### Adding Supabase

To enable real-time features with Supabase:

1. Create a Supabase project at [supabase.com](https://supabase.com)
2. Run the following SQL to create tables:

```sql
-- Players table
CREATE TABLE players (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  total_in DECIMAL DEFAULT 0,
  total_out DECIMAL DEFAULT 0,
  games_played INT DEFAULT 0,
  biggest_win DECIMAL DEFAULT 0,
  biggest_loss DECIMAL DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Games table
CREATE TABLE games (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  date DATE NOT NULL,
  time TIME NOT NULL,
  buy_in DECIMAL NOT NULL,
  venue TEXT NOT NULL,
  status TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Enable real-time
ALTER PUBLICATION supabase_realtime ADD TABLE players;
ALTER PUBLICATION supabase_realtime ADD TABLE games;
```

3. Add environment variables
4. The app will automatically use Supabase instead of local storage

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT License - feel free to use this project for your own poker nights!

## Acknowledgments

Built with ❤️ for poker enthusiasts who want to focus on the game, not the logistics.
