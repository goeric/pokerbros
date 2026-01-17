import { Text, Heading, Link } from '@react-email/components';
import EmailLayout from '../components/EmailLayout';
import GameDetails from '../components/GameDetails';
import Button from '../components/Button';

interface RsvpConfirmationProps {
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

export default function RsvpConfirmation({
  gameId,
  playerName,
  date,
  time,
  location,
  address,
  buyIn,
  notes,
  cancelRsvpUrl,
}: RsvpConfirmationProps) {
  const gameUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/game/${gameId}`;

  return (
    <EmailLayout preview={`You&apos;re confirmed for Poker Night - ${date}`}>
      <Heading style={h1}>You&apos;re all set! 🎴</Heading>

      <Text style={paragraph}>Hi {playerName},</Text>

      <Text style={paragraph}>
        Your spot is confirmed for poker night! We've added this event to your
        calendar.
      </Text>

      <GameDetails
        date={date}
        time={time}
        location={location}
        address={address}
        buyIn={buyIn}
        notes={notes}
      />

      {cancelRsvpUrl && (
        <Button href={cancelRsvpUrl}>Cancel my RSVP</Button>
      )}

      {!cancelRsvpUrl && (
        <Text style={paragraph}>
          Need to cancel?{' '}
          <Link href={gameUrl} style={link}>
            Cancel my RSVP
          </Link>
        </Text>
      )}

      <Text style={seeYou}>See you at the felt! 🃏</Text>
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

const link = {
  color: '#059669',
  textDecoration: 'underline',
};

const seeYou = {
  color: '#059669',
  fontSize: '18px',
  fontWeight: 'bold',
  margin: '32px 0',
  textAlign: 'center' as const,
};
