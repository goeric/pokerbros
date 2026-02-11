import { Player, Game } from '@/types';

export function formatCurrency(amount: number): string {
  return `$${amount.toFixed(2)}`;
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

export function isToday(dateString: string): boolean {
  const date = new Date(dateString);
  const today = new Date();
  return date.toDateString() === today.toDateString();
}

export function formatPlayerName(player: Player, includeNickname: boolean = true): string {
  if (!includeNickname || !player.nickname) {
    return `${player.first_name} ${player.last_name}`;
  }
  return `${player.first_name} "${player.nickname}" ${player.last_name}`.trim().replace(/\s+/g, ' ');
}

/**
 * Determines if a game should be displayed as "live" based on its status and scheduled time.
 * A game is live if:
 * - Status is 'in_progress', OR
 * - Status is 'upcoming' but the scheduled date/time has passed
 */
export function isGameLive(game: Game): boolean {
  if (game.status === 'in_progress') return true;
  if (game.status === 'completed') return false;

  const gameDateTime = new Date(`${game.date}T${game.time}`);
  const now = new Date();
  return gameDateTime <= now;
}
