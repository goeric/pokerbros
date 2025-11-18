import * as React from 'react';
import { Text, Heading } from '@react-email/components';
import EmailLayout from '../components/EmailLayout';
import GameDetails from '../components/GameDetails';
import Button from '../components/Button';

interface GameCreatedProps {
  gameId: string;
  date: string; // e.g., "Friday, January 17, 2025"
  time: string; // e.g., "7:00 PM"
  location: string;
  address: string;
  buyIn: number;
  notes?: string;
}

export default function GameCreated({
  gameId,
  date,
  time,
  location,
  address,
  buyIn,
  notes,
}: GameCreatedProps) {
  const gameUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/game/${gameId}`;

  return (
    <EmailLayout preview={`New Poker Night: ${date} at ${time}`}>
      <Heading style={h1}>🎴 New Poker Night Scheduled!</Heading>

      <Text style={paragraph}>A new poker night has been scheduled!</Text>

      <GameDetails
        date={date}
        time={time}
        location={location}
        address={address}
        buyIn={buyIn}
        notes={notes}
      />

      <Text style={paragraph}>
        Seats are limited - RSVP now to secure your spot!
      </Text>

      <Button href={gameUrl}>RSVP Now</Button>

      <Text style={smallText}>
        Can't make it? No problem - we'll see you at the next one!
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

const smallText = {
  color: '#6b7280',
  fontSize: '14px',
  lineHeight: '20px',
  margin: '16px 0',
  textAlign: 'center' as const,
};
