import * as React from 'react';
import { Text, Heading, Link } from '@react-email/components';
import EmailLayout from '../components/EmailLayout';

interface RsvpCancellationProps {
  gameId: string;
  playerName: string;
  date: string;
  time: string;
  location: string;
}

export default function RsvpCancellation({
  gameId,
  playerName,
  date,
  time,
  location,
}: RsvpCancellationProps) {
  const gameUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/game/${gameId}`;

  return (
    <EmailLayout preview={`You've cancelled your RSVP - ${date}`}>
      <Heading style={h1}>RSVP Cancelled</Heading>

      <Text style={paragraph}>Hi {playerName},</Text>

      <Text style={paragraph}>
        Your spot has been released and the event has been removed from your
        calendar.
      </Text>

      <Text style={gameInfo}>
        📅 {date}
        <br />
        🕖 {time}
        <br />
        📍 {location}
      </Text>

      <Text style={paragraph}>
        If you change your mind, you can RSVP again:{' '}
        <Link href={gameUrl} style={link}>
          RSVP Again
        </Link>
      </Text>

      <Text style={smallText}>Hope to see you at the next one!</Text>
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

const gameInfo = {
  backgroundColor: '#f6f9fc',
  borderRadius: '8px',
  padding: '24px',
  margin: '24px 0',
  fontSize: '16px',
  lineHeight: '28px',
  color: '#1f2937',
};

const link = {
  color: '#059669',
  textDecoration: 'underline',
};

const smallText = {
  color: '#6b7280',
  fontSize: '14px',
  lineHeight: '20px',
  margin: '24px 0',
  textAlign: 'center' as const,
};
