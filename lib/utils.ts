import { Player, Game, GamePlayer, RSVP, QuickStats, PlayerStats } from '@/types';
import { localStore } from './store';

export function generateId(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

export function formatCurrency(amount: number): string {
  return `$${amount.toFixed(0)}`;
}

export function formatDate(dateString: string): string {
  // Parse date as local time to avoid timezone issues
  const [year, month, day] = dateString.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}

export function formatDateWithDay(dateString: string): string {
  // Parse date as local time to avoid timezone issues
  const [year, month, day] = dateString.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric'
  });
}

export function formatTime(timeString: string): string {
  const [hours, minutes] = timeString.split(':');
  const hour = parseInt(hours, 10);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${minutes} ${ampm}`;
}

export function calculateProfit(buyIns: number[], cashOut: number): number {
  const totalBuyIn = buyIns.reduce((sum, amount) => sum + amount, 0);
  return cashOut - totalBuyIn;
}

export function calculateROI(buyIns: number[], cashOut: number): number {
  const totalBuyIn = buyIns.reduce((sum, amount) => sum + amount, 0);
  if (totalBuyIn === 0) return 0;
  return ((cashOut - totalBuyIn) / totalBuyIn) * 100;
}

export function getQuickStats(): QuickStats {
  const games = localStore.getGames();
  const players = localStore.getPlayers();

  const completedGames = games.filter(g => g.status === 'completed');
  const upcomingGames = games.filter(g => g.status === 'upcoming');

  let totalMoneyPlayed = 0;
  completedGames.forEach(game => {
    const gamePlayers = localStore.getGamePlayers(game.id);
    gamePlayers.forEach(gp => {
      totalMoneyPlayed += gp.buyIns.reduce((sum, amount) => sum + amount, 0);
    });
  });

  const chipLeader = players
    .filter(p => p.gamesPlayed > 0)
    .sort((a, b) => (b.totalOut - b.totalIn) - (a.totalOut - a.totalIn))[0];

  return {
    totalGamesHosted: completedGames.length,
    totalMoneyPlayed,
    chipLeader: chipLeader ? {
      name: chipLeader.name,
      profit: chipLeader.totalOut - chipLeader.totalIn
    } : null,
    nextGameDate: upcomingGames.length > 0 ? upcomingGames[0].date : null,
  };
}

export function getPlayerStats(): PlayerStats[] {
  const players = localStore.getPlayers();
  const games = localStore.getGames();

  const stats = players.map(player => {
    const allGamePlayers = games
      .filter(g => g.status === 'completed')
      .map(g => localStore.getGamePlayer(g.id, player.id))
      .filter(Boolean) as GamePlayer[];

    const profitableGames = allGamePlayers.filter(gp => gp.profit > 0).length;
    const winRate = allGamePlayers.length > 0
      ? (profitableGames / allGamePlayers.length) * 100
      : 0;

    const avgBuyIn = allGamePlayers.length > 0
      ? allGamePlayers.reduce((sum, gp) => sum + gp.buyIns.reduce((a, b) => a + b, 0), 0) / allGamePlayers.length
      : 0;

    // Check for streaks (last 3 games)
    const recentGames = allGamePlayers.slice(-3);
    const hotStreak = recentGames.length >= 3 && recentGames.every(gp => gp.profit > 0);
    const coldStreak = recentGames.length >= 3 && recentGames.every(gp => gp.profit < 0);

    return {
      ...player,
      winRate,
      avgBuyIn,
      hotStreak,
      coldStreak,
      rank: 0, // Will be set after sorting
    };
  });

  // Sort by total profit and assign ranks
  stats.sort((a, b) => (b.totalOut - b.totalIn) - (a.totalOut - a.totalIn));
  stats.forEach((stat, index) => {
    stat.rank = index + 1;
  });

  return stats;
}

export function getConfirmedCount(gameId: string): number {
  const rsvps = localStore.getRSVPs(gameId);
  return rsvps.filter(r => r.status === 'confirmed').length;
}

export function getWaitlistCount(gameId: string): number {
  const rsvps = localStore.getRSVPs(gameId);
  return rsvps.filter(r => r.status === 'waitlist').length;
}

export function canRSVP(gameId: string, playerId: string): boolean {
  const existingRSVP = localStore.getRSVP(gameId, playerId);
  return !existingRSVP;
}

export function addRSVP(gameId: string, playerId: string): void {
  const confirmedCount = getConfirmedCount(gameId);
  const MAX_SEATS = 8;

  const rsvp: RSVP = {
    id: generateId(),
    gameId,
    playerId,
    status: confirmedCount < MAX_SEATS ? 'confirmed' : 'waitlist',
    timestamp: new Date().toISOString(),
    waitlistPosition: confirmedCount < MAX_SEATS ? undefined : confirmedCount - MAX_SEATS + 1,
  };

  localStore.addRSVP(rsvp);
}

export function cancelRSVP(gameId: string, playerId: string): void {
  const rsvp = localStore.getRSVP(gameId, playerId);
  if (!rsvp) return;

  localStore.deleteRSVP(rsvp.id);

  // Auto-promote first waitlist player
  if (rsvp.status === 'confirmed') {
    const waitlistRSVPs = localStore.getRSVPs(gameId)
      .filter(r => r.status === 'waitlist')
      .sort((a, b) => (a.waitlistPosition || 0) - (b.waitlistPosition || 0));

    if (waitlistRSVPs.length > 0) {
      const firstWaitlist = waitlistRSVPs[0];
      localStore.updateRSVP(firstWaitlist.id, {
        status: 'confirmed',
        waitlistPosition: undefined
      });

      // Update remaining waitlist positions
      waitlistRSVPs.slice(1).forEach((r, index) => {
        localStore.updateRSVP(r.id, { waitlistPosition: index + 1 });
      });
    }
  }
}

export function getTotalPot(gameId: string): number {
  const gamePlayers = localStore.getGamePlayers(gameId);
  return gamePlayers.reduce((total, gp) => {
    return total + gp.buyIns.reduce((sum, amount) => sum + amount, 0);
  }, 0);
}

export function validateCashOut(gameId: string, cashOuts: { playerId: string; amount: number }[]): {
  valid: boolean;
  totalIn: number;
  totalOut: number;
  difference: number;
} {
  const totalIn = getTotalPot(gameId);
  const totalOut = cashOuts.reduce((sum, co) => sum + co.amount, 0);
  const difference = totalIn - totalOut;

  return {
    valid: Math.abs(difference) < 0.01, // Account for floating point
    totalIn,
    totalOut,
    difference,
  };
}

export function updatePlayerStats(playerId: string): void {
  const player = localStore.getPlayer(playerId);
  if (!player) return;

  const games = localStore.getGames().filter(g => g.status === 'completed');
  let totalIn = 0;
  let totalOut = 0;
  let gamesPlayed = 0;
  let biggestWin = 0;
  let biggestLoss = 0;

  games.forEach(game => {
    const gamePlayer = localStore.getGamePlayer(game.id, playerId);
    if (gamePlayer) {
      const buyInsTotal = gamePlayer.buyIns.reduce((sum, amount) => sum + amount, 0);
      totalIn += buyInsTotal;
      totalOut += gamePlayer.cashOut;
      gamesPlayed++;

      if (gamePlayer.profit > biggestWin) biggestWin = gamePlayer.profit;
      if (gamePlayer.profit < biggestLoss) biggestLoss = gamePlayer.profit;
    }
  });

  localStore.updatePlayer(playerId, {
    totalIn,
    totalOut,
    gamesPlayed,
    biggestWin,
    biggestLoss,
  });
}

export function isToday(dateString: string): boolean {
  const date = new Date(dateString);
  const today = new Date();
  return date.toDateString() === today.toDateString();
}

export function isPast(dateString: string): boolean {
  const date = new Date(dateString);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return date < today;
}

export function formatPlayerName(player: Player, includeNickname: boolean = true): string {
  if (!includeNickname || !player.nickname) {
    return `${player.first_name} ${player.last_name}`;
  }
  return `${player.first_name} "${player.nickname}" ${player.last_name}`.trim().replace(/\s+/g, ' ');
}
