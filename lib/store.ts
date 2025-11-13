import { Player, Game, GamePlayer, RSVP } from '@/types';
import { seedPlayers, seedGames, seedGamePlayers, seedRSVPs } from './seed-data';

// In-memory store for local development (falls back when Supabase not configured)
class LocalStore {
  private players: Player[] = [];
  private games: Game[] = [];
  private gamePlayers: GamePlayer[] = [];
  private rsvps: RSVP[] = [];
  private listeners: Map<string, Set<() => void>> = new Map();
  private isClient = typeof window !== 'undefined';

  constructor() {
    this.initializeData();
  }

  private initializeData() {
    if (this.isClient) {
      // Try to load from localStorage first
      const stored = localStorage.getItem('pokerbros_data');
      if (stored) {
        try {
          const data = JSON.parse(stored);
          this.players = data.players || [...seedPlayers];
          this.games = data.games || [...seedGames];
          this.gamePlayers = data.gamePlayers || [...seedGamePlayers];
          this.rsvps = data.rsvps || [...seedRSVPs];
          return;
        } catch (e) {
          console.error('Failed to parse stored data:', e);
        }
      }
    }

    // Fall back to seed data
    this.players = [...seedPlayers];
    this.games = [...seedGames];
    this.gamePlayers = [...seedGamePlayers];
    this.rsvps = [...seedRSVPs];
    this.persist();
  }

  private persist() {
    if (this.isClient) {
      try {
        localStorage.setItem('pokerbros_data', JSON.stringify({
          players: this.players,
          games: this.games,
          gamePlayers: this.gamePlayers,
          rsvps: this.rsvps,
        }));
      } catch (e) {
        console.error('Failed to persist data:', e);
      }
    }
  }

  // Generic subscribe method
  subscribe(table: string, callback: () => void) {
    if (!this.listeners.has(table)) {
      this.listeners.set(table, new Set());
    }
    this.listeners.get(table)!.add(callback);
    return () => {
      this.listeners.get(table)?.delete(callback);
    };
  }

  private notify(table: string) {
    this.listeners.get(table)?.forEach(callback => callback());
  }

  // Players
  getPlayers() {
    return [...this.players];
  }

  getPlayer(id: string) {
    return this.players.find(p => p.id === id);
  }

  addPlayer(player: Player) {
    this.players.push(player);
    this.persist();
    this.notify('players');
  }

  updatePlayer(id: string, updates: Partial<Player>) {
    const index = this.players.findIndex(p => p.id === id);
    if (index !== -1) {
      this.players[index] = { ...this.players[index], ...updates };
      this.persist();
      this.notify('players');
    }
  }

  // Games
  getGames() {
    return [...this.games].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  getGame(id: string) {
    return this.games.find(g => g.id === id);
  }

  addGame(game: Game) {
    this.games.push(game);
    this.persist();
    this.notify('games');
  }

  updateGame(id: string, updates: Partial<Game>) {
    const index = this.games.findIndex(g => g.id === id);
    if (index !== -1) {
      this.games[index] = { ...this.games[index], ...updates };
      this.persist();
      this.notify('games');
    }
  }

  deleteGame(id: string) {
    this.games = this.games.filter(g => g.id !== id);
    this.gamePlayers = this.gamePlayers.filter(gp => gp.gameId !== id);
    this.rsvps = this.rsvps.filter(r => r.gameId !== id);
    this.persist();
    this.notify('games');
    this.notify('game_players');
    this.notify('rsvps');
  }

  // Game Players
  getGamePlayers(gameId: string) {
    return this.gamePlayers.filter(gp => gp.gameId === gameId);
  }

  getGamePlayer(gameId: string, playerId: string) {
    return this.gamePlayers.find(gp => gp.gameId === gameId && gp.playerId === playerId);
  }

  addGamePlayer(gamePlayer: GamePlayer) {
    this.gamePlayers.push(gamePlayer);
    this.persist();
    this.notify('game_players');
  }

  updateGamePlayer(id: string, updates: Partial<GamePlayer>) {
    const index = this.gamePlayers.findIndex(gp => gp.id === id);
    if (index !== -1) {
      this.gamePlayers[index] = { ...this.gamePlayers[index], ...updates };
      this.persist();
      this.notify('game_players');
    }
  }

  // RSVPs
  getRSVPs(gameId: string) {
    return this.rsvps.filter(r => r.gameId === gameId);
  }

  getRSVP(gameId: string, playerId: string) {
    return this.rsvps.find(r => r.gameId === gameId && r.playerId === playerId);
  }

  addRSVP(rsvp: RSVP) {
    this.rsvps.push(rsvp);
    this.persist();
    this.notify('rsvps');
  }

  updateRSVP(id: string, updates: Partial<RSVP>) {
    const index = this.rsvps.findIndex(r => r.id === id);
    if (index !== -1) {
      this.rsvps[index] = { ...this.rsvps[index], ...updates };
      this.persist();
      this.notify('rsvps');
    }
  }

  deleteRSVP(id: string) {
    this.rsvps = this.rsvps.filter(r => r.id !== id);
    this.persist();
    this.notify('rsvps');
  }

  // Reset for demo mode
  reset() {
    if (this.isClient) {
      localStorage.removeItem('pokerbros_data');
    }
    this.players = [...seedPlayers];
    this.games = [...seedGames];
    this.gamePlayers = [...seedGamePlayers];
    this.rsvps = [...seedRSVPs];
    this.persist();
    this.notify('players');
    this.notify('games');
    this.notify('game_players');
    this.notify('rsvps');
  }
}

export const localStore = new LocalStore();
