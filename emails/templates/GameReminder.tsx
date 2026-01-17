import * as React from 'react';
import { Text, Heading } from '@react-email/components';
import EmailLayout from '../components/EmailLayout';
import GameDetails from '../components/GameDetails';
import Button from '../components/Button';

interface GameReminderProps {
  gameId: string;
  playerName: string;
  date: string;
  time: string;
  location: string;
  address: string;
  buyIn: number;
  notes?: string;
  timing: '24h' | '3h'; // Determines the message tone
}

export default function GameReminder({
  gameId,
  playerName,
  date,
  time,
  location,
  address,
  buyIn,
  notes,
  timing,
}: GameReminderProps) {
  const gameUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/game/${gameId}`;

  const is24Hour = timing === '24h';

  return (
    <EmailLayout preview={is24Hour ? `Reminder: Poker night tomorrow at ${time}` : `Game starts soon! See you at ${time}`}>
      <Heading style={h1}>
        {is24Hour ? 'Game on tomorrow! 🎴' : 'Game starts soon! 🃏'}
      </Heading>

      <Text style={paragraph}>Hi {playerName},</Text>

      <Text style={paragraph}>
        {is24Hour
          ? `Just a friendly reminder that poker night is tomorrow!`
          : `Final reminder - the game starts in just 3 hours!`
        }
      </Text>

      <GameDetails
        date={date}
        time={time}
        location={location}
        address={address}
        buyIn={buyIn}
        notes={notes}
      />

      {is24Hour && (
        <Text style={bringCash}>
          💵 Don&apos;t forget to bring cash for the ${buyIn} buy-in!
        </Text>
      )}

      <Button href={gameUrl}>View Game Details</Button>

      <Text style={seeYou}>
        {is24Hour ? 'See you at the felt!' : 'Shuffle up and deal!'}
      </Text>
    </EmailLayout>
  );
}

// Styles
const h1 = {
  color: '#1f2937',
  fontSize: '28px',
  fontWeight: 'bold',
  margin: '32px 0 24px',
  textAlign: 'center' as const,
};

const paragraph = {
  color: '#374151',
  fontSize: '16px',
  lineHeight: '24px',
  margin: '16px 0',
};

const bringCash = {
  color: '#059669',
  fontSize: '16px',
  fontWeight: '600',
  margin: '24px 0',
  padding: '16px',
  backgroundColor: '#f0fdf4',
  borderRadius: '8px',
  textAlign: 'center' as const,
};

const seeYou = {
  color: '#059669',
  fontSize: '18px',
  fontWeight: 'bold',
  margin: '32px 0',
  textAlign: 'center' as const,
};
