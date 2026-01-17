'use client';

import { useState, useTransition } from 'react';
import { Player, GamePlayer, Game, NotificationPreferences } from '@/types';
import { formatCurrency, formatDate, formatPlayerName } from '@/lib/utils';
import BackButton from '@/components/BackButton';
import { updateProfile, updateAvatar, updateNotificationPreferences } from './actions';
import { IdentificationCard, ChartLineUp, Camera, UserSwitch, Check, X } from '@phosphor-icons/react';
import Image from 'next/image';

interface ProfileClientProps {
  player: Player;
  gameHistory: Array<{ gamePlayer: GamePlayer; game: Game }>;
}

export default function ProfileClient({ player, gameHistory }: ProfileClientProps) {
  const [isPending, startTransition] = useTransition();
  const [showAvatarDrawer, setShowAvatarDrawer] = useState(false);
  const [selectedAvatar, setSelectedAvatar] = useState(player.avatar);
  const [nickname, setNickname] = useState(player.nickname || '');
  const [notifications, setNotifications] = useState<NotificationPreferences>(
    player.notification_preferences
  );
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);

  // Generate avatar options (1-50)
  const avatarOptions = Array.from({ length: 50 }, (_, i) => `avatar${i + 1}.svg`);

  // Calculate stats
  const totalGames = player.gamesPlayed;
  const netProfit = player.totalOut - player.totalIn;
  const winRate = totalGames > 0 ? ((gameHistory.filter(gh => gh.gamePlayer.profit > 0).length / totalGames) * 100).toFixed(0) : '0';
  const biggestPot = Math.max(player.biggestWin, Math.abs(player.biggestLoss));

  const handleSaveChanges = () => {
    startTransition(async () => {
      // Update avatar if changed
      if (selectedAvatar !== player.avatar) {
        await updateAvatar(player.id, selectedAvatar);
      }

      // Update nickname if changed
      if (nickname !== player.nickname) {
        await updateProfile(player.id, { nickname });
      }

      // Update notification preferences
      await updateNotificationPreferences(player.id, notifications);

      setShowSuccessMessage(true);
      setTimeout(() => setShowSuccessMessage(false), 3000);
    });
  };

  const handleSelectAvatar = (avatar: string) => {
    setSelectedAvatar(avatar);
    setShowAvatarDrawer(false);
  };

  const toggleNotification = (key: keyof NotificationPreferences) => {
    setNotifications(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <>
      <BackButton />

      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
        <div>
          <h1 className="font-display text-3xl md:text-5xl font-bold text-white drop-shadow-lg mb-2">
            Grinder Profile
          </h1>
          <p className="text-gray-400">Manage your identity and view career stats</p>
        </div>
        <button
          onClick={handleSaveChanges}
          disabled={isPending}
          className="px-6 py-3 rounded-lg bg-gradient-to-b from-poker-gold to-yellow-600 hover:from-poker-goldlight hover:to-poker-gold text-black font-bold shadow-lg hover:scale-105 transition-transform disabled:opacity-50 disabled:cursor-not-allowed border border-yellow-200"
        >
          {isPending ? 'Saving...' : 'Save Changes'}
        </button>
      </header>

      {/* Success Message */}
      {showSuccessMessage && (
        <div className="fixed bottom-5 right-5 px-6 py-4 rounded-xl font-bold text-sm z-[60] bg-poker-dark border border-poker-gold text-poker-gold shadow-2xl animate-slide-in">
          <div className="flex items-center gap-3">
            <Check weight="bold" size={20} />
            Profile Updated Successfully!
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Identity Card */}
        <div className="glass-panel rounded-3xl p-8 flex flex-col items-center text-center border-t-4 border-t-poker-gold lg:col-span-1 h-fit">
          <div
            className="relative group cursor-pointer"
            onClick={() => setShowAvatarDrawer(true)}
          >
            <div className="w-40 h-40 rounded-full border-4 border-poker-gold p-1 bg-black shadow-[0_0_30px_rgba(212,175,55,0.2)] overflow-hidden">
              <Image
                src={`/avatars/${selectedAvatar}`}
                alt="Avatar"
                width={160}
                height={160}
                unoptimized
                className="w-full h-full rounded-full transition-transform duration-500 group-hover:scale-110"
              />
            </div>
            <div className="absolute bottom-2 right-2 w-10 h-10 bg-poker-gold rounded-full flex items-center justify-center text-black shadow-lg border-2 border-black group-hover:scale-110 transition-transform">
              <Camera weight="bold" size={20} />
            </div>
          </div>

          <h2 className="font-display text-3xl font-bold text-white mt-6">
            {formatPlayerName(player, false)}
          </h2>
          {player.nickname && (
            <p className="text-poker-gold font-medium mb-6">&quot;{player.nickname}&quot;</p>
          )}

          <div className="w-full space-y-3 mt-4">
            <div className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/5">
              <span className="text-sm text-gray-400">Email</span>
              <span className="text-sm font-bold text-white truncate ml-2">{player.email}</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/5">
              <span className="text-sm text-gray-400">Joined</span>
              <span className="text-sm font-bold text-white">
                {new Date(player.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
              </span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/5">
              <span className="text-sm text-gray-400">Status</span>
              <span className="text-sm font-bold text-green-400">Active</span>
            </div>
          </div>
        </div>

        {/* Right Column: Edit & Stats */}
        <div className="lg:col-span-2 space-y-8">
          {/* Personal Info Form */}
          <div className="glass-panel rounded-2xl p-6 md:p-8">
            <h3 className="font-display text-xl font-bold text-white mb-6 flex items-center gap-2">
              <IdentificationCard weight="fill" className="text-poker-gold" size={24} />
              Personal Details
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-wider text-gray-400 font-bold">
                  Display Name
                </label>
                <input
                  type="text"
                  value={`${player.first_name} ${player.last_name}`}
                  disabled
                  className="w-full px-4 py-3 rounded-lg bg-black/20 border border-white/10 text-gray-400 font-medium cursor-not-allowed"
                />
                <p className="text-xs text-gray-500">Contact admin to change</p>
              </div>
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-wider text-gray-400 font-bold">
                  Nickname / Handle
                </label>
                <input
                  type="text"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  placeholder="Enter a nickname"
                  className="w-full px-4 py-3 rounded-lg bg-black/20 border border-white/10 hover:border-poker-gold/30 focus:border-poker-gold focus:outline-none focus:ring-2 focus:ring-poker-gold/20 text-white font-medium transition-colors"
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <label className="text-xs uppercase tracking-wider text-gray-400 font-bold">
                  Email Address
                </label>
                <input
                  type="email"
                  value={player.email}
                  disabled
                  className="w-full px-4 py-3 rounded-lg bg-black/20 border border-white/10 text-gray-400 font-medium cursor-not-allowed"
                />
              </div>
            </div>
          </div>

          {/* Career Stats */}
          <div className="glass-panel rounded-2xl p-6 md:p-8">
            <h3 className="font-display text-xl font-bold text-white mb-6 flex items-center gap-2">
              <ChartLineUp weight="fill" className="text-poker-gold" size={24} />
              Career Statistics
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-black/20 p-4 rounded-xl border border-white/5 text-center">
                <p className="text-gray-400 text-xs uppercase mb-1">Games</p>
                <p className="text-2xl font-bold text-white font-display">{totalGames}</p>
              </div>
              <div className="bg-black/20 p-4 rounded-xl border border-white/5 text-center">
                <p className="text-gray-400 text-xs uppercase mb-1">Net Profit</p>
                <p className={`text-2xl font-bold font-display ${netProfit >= 0 ? 'text-green-400' : 'text-poker-red'}`}>
                  {netProfit >= 0 ? '+' : ''}{formatCurrency(netProfit)}
                </p>
              </div>
              <div className="bg-black/20 p-4 rounded-xl border border-white/5 text-center">
                <p className="text-gray-400 text-xs uppercase mb-1">Win Rate</p>
                <p className="text-2xl font-bold text-white font-display">{winRate}%</p>
              </div>
              <div className="bg-black/20 p-4 rounded-xl border border-white/5 text-center">
                <p className="text-gray-400 text-xs uppercase mb-1">Biggest Pot</p>
                <p className="text-2xl font-bold text-poker-gold font-display">{formatCurrency(biggestPot)}</p>
              </div>
            </div>
          </div>

          {/* Notification Preferences */}
          <div className="glass-panel rounded-2xl p-6 md:p-8">
            <h3 className="font-display text-xl font-bold text-white mb-6">
              Notification Preferences
            </h3>
            <div className="space-y-4">
              {Object.entries(notifications).map(([key, value]) => (
                <div
                  key={key}
                  className="flex items-center justify-between p-4 rounded-lg bg-black/20 border border-white/5 hover:bg-white/5 transition-colors"
                >
                  <div>
                    <p className="text-white font-medium">
                      {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </p>
                    <p className="text-xs text-gray-400">
                      {getNotificationDescription(key)}
                    </p>
                  </div>
                  <button
                    onClick={() => toggleNotification(key as keyof NotificationPreferences)}
                    className={`relative w-12 h-6 rounded-full transition-colors ${
                      value ? 'bg-poker-gold' : 'bg-gray-600'
                    }`}
                  >
                    <div
                      className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                        value ? 'translate-x-6' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Game History */}
          {gameHistory.length > 0 && (
            <div className="glass-panel rounded-2xl p-6 md:p-8">
              <h3 className="font-display text-xl font-bold text-white mb-6">
                Game History
              </h3>
              <div className="space-y-3">
                {gameHistory.slice(0, 10).map(({ gamePlayer, game }) => (
                  <div
                    key={gamePlayer.id}
                    className="flex items-center justify-between p-4 rounded-lg bg-black/20 border border-white/5 hover:bg-white/5 transition-colors"
                  >
                    <div>
                      <p className="text-white font-medium">{formatDate(game.date)}</p>
                      <p className="text-xs text-gray-400">{formatCurrency(game.buyIn)} Buy-in</p>
                    </div>
                    <div className="text-right">
                      <p className={`font-bold font-display ${gamePlayer.profit >= 0 ? 'text-green-400' : 'text-poker-red'}`}>
                        {gamePlayer.profit >= 0 ? '+' : ''}{formatCurrency(gamePlayer.profit)}
                      </p>
                      <p className="text-xs text-gray-400">
                        {gamePlayer.buyIns.length} buy-in{gamePlayer.buyIns.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Avatar Vault Drawer */}
      {showAvatarDrawer && (
        <>
          <div
            onClick={() => setShowAvatarDrawer(false)}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-40 transition-opacity"
          />
          <div className="fixed inset-x-0 bottom-0 transform transition-transform duration-300 z-50 bg-[#0a1612] border-t border-poker-gold/30 h-[70vh] md:h-[60vh] flex flex-col shadow-[0_-10px_40px_rgba(0,0,0,0.8)]">
            <div className="p-4 border-b border-white/10 flex items-center justify-between bg-black/20">
              <div className="flex items-center gap-3">
                <UserSwitch weight="fill" className="text-poker-gold" size={24} />
                <h3 className="font-display text-xl font-bold text-white">
                  Avatar Vault{' '}
                  <span className="text-sm font-normal text-gray-500 ml-2">
                    (Select to Apply)
                  </span>
                </h3>
              </div>
              <button
                onClick={() => setShowAvatarDrawer(false)}
                className="text-gray-400 hover:text-white p-2 hover:bg-white/10 rounded-full transition-colors"
              >
                <X size={24} weight="bold" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4">
                {avatarOptions.map((avatar) => (
                  <div
                    key={avatar}
                    onClick={() => handleSelectAvatar(avatar)}
                    className={`aspect-square bg-white/5 rounded-xl p-2 border cursor-pointer transition-all hover:scale-110 hover:border-poker-gold hover:bg-white/10 hover:z-10 ${
                      avatar === selectedAvatar
                        ? 'border-poker-gold bg-poker-gold/20 shadow-[0_0_15px_rgba(212,175,55,0.4)]'
                        : 'border-white/5'
                    }`}
                  >
                    <Image
                      src={`/avatars/${avatar}`}
                      alt={avatar}
                      width={80}
                      height={80}
                      unoptimized
                      className="w-full h-full rounded-full bg-black/20"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}

function getNotificationDescription(key: string): string {
  const descriptions: Record<string, string> = {
    game_created: 'Get notified when new games are scheduled',
    game_updated: 'Receive updates when game details change',
    game_cancelled: 'Be alerted if a game is cancelled',
    rsvp_confirmed: 'Confirmation when you secure a seat',
    rsvp_cancelled: 'Notification when you cancel your RSVP',
    waitlist_promoted: 'Alert when you move from waitlist to confirmed',
    game_reminder_24h: 'Reminder 24 hours before the game',
    game_reminder_3h: 'Final reminder 3 hours before shuffle up',
  };
  return descriptions[key] || '';
}
