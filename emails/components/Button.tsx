import * as React from 'react';
import { Button as EmailButton } from '@react-email/components';

interface ButtonProps {
  href: string;
  children: React.ReactNode;
}

export default function Button({ href, children }: ButtonProps) {
  return (
    <EmailButton href={href} style={button}>
      {children}
    </EmailButton>
  );
}

const button = {
  backgroundColor: '#059669',
  borderRadius: '8px',
  color: '#ffffff',
  fontSize: '16px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'block',
  padding: '16px 24px',
  margin: '24px 0',
};
