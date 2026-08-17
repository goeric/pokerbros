import * as React from 'react';
import { Text, Heading, Link } from '@react-email/components';
import EmailLayout from '../components/EmailLayout';
import GameDetails from '../components/GameDetails';
import Button from '../components/Button';

interface GameUpdatedProps {
  gameId: string;
  playerName: string;
  changes: string; // e.g., "Time changed: 7:00 PM → 8:00 PM"
  date: string;
  time: string;
  location: string;
  address: string;
  buyIn: number;
  notes?: string;
  cancelRsvpUrl?: string;
  /**
   * True when the recipient holds a waitlist spot rather than a seat. Required,
   * not optional: it must stay in lockstep with whether `sendEmail` attached an
   * .ics (see `sendGameUpdatedNotifications`), and a forgotten prop would promise
   * a calendar update that never happened.
   */
  waitlisted: boolean;
}

export default function GameUpdated({
  gameId,
  playerName,
  changes,
  date,
  time,
  location,
  address,
  buyIn,
  notes,
  cancelRsvpUrl,
  waitlisted,
}: GameUpdatedProps) {
  const gameUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/game/${gameId}`;

  return (
    <EmailLayout preview={`Game Update: ${date} poker night has changed`}>
      <Heading style={h1}>Game Update 🔄</Heading>

      <Text style={paragraph}>Hi {playerName},</Text>

      <Text style={paragraph}>The game details have been updated:</Text>

      <Text style={changesBox}>{changes}</Text>

      <Text style={paragraph}>
        <strong>Updated details:</strong>
      </Text>

      <GameDetails
        date={date}
        time={time}
        location={location}
        address={address}
        buyIn={buyIn}
        notes={notes}
      />

      {/* Waitlisted players were never sent an invite, so there is no calendar
          event of theirs to update — promise them one only if a seat opens. */}
      <Text style={paragraph}>
        {waitlisted
          ? "You're still on the waitlist for this game. We'll send you a calendar invite if a seat opens up."
          : 'Your calendar has been updated automatically.'}
      </Text>

      {cancelRsvpUrl && (
        <Button href={cancelRsvpUrl}>
          {waitlisted ? 'Leave the waitlist' : 'Cancel my RSVP'}
        </Button>
      )}

      {!cancelRsvpUrl && (
        <Text style={paragraph}>
          <Link href={gameUrl} style={link}>
            View Game Details
          </Link>
        </Text>
      )}
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

const changesBox = {
  backgroundColor: '#fef3c7',
  borderLeft: '4px solid #f59e0b',
  padding: '16px',
  color: '#92400e',
  fontSize: '16px',
  lineHeight: '24px',
  margin: '24px 0',
  fontWeight: '500',
};

const link = {
  color: '#059669',
  textDecoration: 'underline',
};
