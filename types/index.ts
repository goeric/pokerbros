export interface NotificationPreferences {
  game_created: boolean;
  game_updated: boolean;
  game_cancelled: boolean;
  rsvp_confirmed: boolean;
  rsvp_cancelled: boolean;
  waitlist_promoted: boolean;
  game_reminder_24h: boolean;
  game_reminder_3h: boolean;
}

export interface Player {
  id: string;
  first_name: string;
  last_name: string;
  nickname?: string;
  email: string;
  avatar: string;
  notification_preferences: NotificationPreferences;
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

export interface Location {
  id: string;
  name: string;
  address: string;
  created_at: string;
  updated_at: string;
}

export interface Game {
  id: string;
  date: string;
  time: string;
  buyIn: number;
  venue: string;  // Deprecated - use location_id instead
  location_id?: string;  // Reference to Location
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
