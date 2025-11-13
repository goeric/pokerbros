export interface Player {
  id: string;
  first_name: string;
  last_name: string;
  nickname?: string;
  email: string;
  totalIn: number;
  totalOut: number;
  gamesPlayed: number;
  biggestWin: number;
  biggestLoss: number;
  createdAt: string;
}

export interface AdminUser {
  id: string;
  email: string;
  is_superadmin: boolean;
  created_at: string;
}

export interface Game {
  id: string;
  date: string;
  time: string;
  buyIn: number;
  venue: string;
  status: 'upcoming' | 'in_progress' | 'completed';
  notes?: string;
  createdAt: string;
}

export interface GamePlayer {
  id: string;
  gameId: string;
  playerId: string;
  buyIns: number[];
  cashOut: number;
  profit: number;
  position?: number;
}

export interface RSVP {
  id: string;
  gameId: string;
  playerId: string;
  status: 'confirmed' | 'declined' | 'waitlist';
  timestamp: string;
  waitlistPosition?: number;
}

export interface QuickStats {
  totalGamesHosted: number;
  totalMoneyPlayed: number;
  chipLeader: { name: string; profit: number } | null;
  nextGameDate: string | null;
}

export interface PlayerStats extends Player {
  winRate: number;
  avgBuyIn: number;
  hotStreak: boolean;
  coldStreak: boolean;
  rank: number;
}
