import * as React from 'react';
import { Text, Heading } from '@react-email/components';
import EmailLayout from '../components/EmailLayout';

interface GameCancelledProps {
  playerName: string;
  date: string;
  time: string;
  location: string;
}

export default function GameCancelled({
  playerName,
  date,
  time,
  location,
}: GameCancelledProps) {
  return (
    <EmailLayout preview={`Game Cancelled: ${date} poker night`}>
      <Heading style={h1}>Game Cancelled 🚫</Heading>

      <Text style={paragraph}>Hi {playerName},</Text>

      <Text style={paragraph}>
        Unfortunately, poker night has been cancelled:
      </Text>

      <Text style={gameInfo}>
        📅 {date}
        <br />
        🕖 {time}
        <br />
        📍 {location}
      </Text>

      <Text style={cancelBox}>
        The event has been removed from your calendar.
      </Text>

      <Text style={paragraph}>
        We'll let you know when the next game is scheduled!
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

const gameInfo = {
  backgroundColor: '#f6f9fc',
  borderRadius: '8px',
  padding: '24px',
  margin: '24px 0',
  fontSize: '16px',
  lineHeight: '28px',
  color: '#1f2937',
};

const cancelBox = {
  backgroundColor: '#fee2e2',
  borderLeft: '4px solid #ef4444',
  padding: '16px',
  color: '#991b1b',
  fontSize: '16px',
  lineHeight: '24px',
  margin: '24px 0',
  fontWeight: '500',
};
