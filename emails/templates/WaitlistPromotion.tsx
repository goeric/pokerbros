import * as React from 'react';
import { Text, Heading } from '@react-email/components';
import EmailLayout from '../components/EmailLayout';
import GameDetails from '../components/GameDetails';
import Button from '../components/Button';

interface WaitlistPromotionProps {
  gameId: string;
  playerName: string;
  date: string;
  time: string;
  location: string;
  address: string;
  buyIn: number;
  notes?: string;
  cancelRsvpUrl?: string;
}

export default function WaitlistPromotion({
  gameId,
  playerName,
  date,
  time,
  location,
  address,
  buyIn,
  notes,
  cancelRsvpUrl,
}: WaitlistPromotionProps) {
  const gameUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/game/${gameId}`;

  return (
    <EmailLayout preview={`Spot opened! Confirm your RSVP for ${date}`}>
      <Heading style={h1}>Good news! 🎉</Heading>

      <Text style={paragraph}>Hi {playerName},</Text>

      <Text style={paragraph}>
        A spot just opened up for poker night!
      </Text>

      <Text style={highlight}>
        You&apos;ve been promoted from the waitlist. Your spot is now confirmed!
      </Text>

      <GameDetails
        date={date}
        time={time}
        location={location}
        address={address}
        buyIn={buyIn}
        notes={notes}
      />

      <Button href={gameUrl}>View Game Details</Button>

      {cancelRsvpUrl && (
        <Text style={paragraph}>
          Can&apos;t make it?{' '}
          <a href={cancelRsvpUrl} style={link}>
            Cancel my RSVP
          </a>
        </Text>
      )}

      <Text style={paragraph}>
        Your calendar has been updated. See you at the felt!
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

const highlight = {
  backgroundColor: '#d1fae5',
  borderLeft: '4px solid #059669',
  padding: '16px',
  color: '#065f46',
  fontSize: '16px',
  lineHeight: '24px',
  margin: '24px 0',
  fontWeight: '500',
};

const link = {
  color: '#059669',
  textDecoration: 'underline',
};
