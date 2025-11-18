import * as React from 'react';
import { Section, Text } from '@react-email/components';

interface GameDetailsProps {
  date: string;
  time: string;
  location: string;
  address?: string;
  buyIn: number;
  notes?: string;
}

export default function GameDetails({
  date,
  time,
  location,
  address,
  buyIn,
  notes,
}: GameDetailsProps) {
  return (
    <Section style={detailsBox}>
      <Text style={detailRow}>
        <span style={icon}>📅</span>
        <span style={label}>{date}</span>
      </Text>
      <Text style={detailRow}>
        <span style={icon}>🕖</span>
        <span style={label}>{time}</span>
      </Text>
      <Text style={detailRow}>
        <span style={icon}>📍</span>
        <span style={label}>
          {location}
          {address && (
            <>
              <br />
              <span style={subtext}>{address}</span>
            </>
          )}
        </span>
      </Text>
      <Text style={detailRow}>
        <span style={icon}>💵</span>
        <span style={label}>${buyIn} buy-in</span>
      </Text>
      {notes && (
        <Text style={notesText}>
          <strong>Notes:</strong> {notes}
        </Text>
      )}
    </Section>
  );
}

// Styles
const detailsBox = {
  backgroundColor: '#f6f9fc',
  borderRadius: '8px',
  padding: '24px',
  margin: '24px 0',
};

const detailRow = {
  fontSize: '16px',
  lineHeight: '24px',
  margin: '8px 0',
  color: '#1f2937',
};

const icon = {
  marginRight: '12px',
  fontSize: '20px',
};

const label = {
  fontWeight: '500',
};

const subtext = {
  fontSize: '14px',
  color: '#6b7280',
  fontWeight: 'normal',
};

const notesText = {
  fontSize: '14px',
  lineHeight: '20px',
  margin: '16px 0 0 0',
  color: '#374151',
  borderTop: '1px solid #e5e7eb',
  paddingTop: '16px',
};
