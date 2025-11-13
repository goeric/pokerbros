import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'PokerBros - Never Miss a Full Table';
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = 'image/png';

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #047857 0%, #065f46 100%)',
          position: 'relative',
        }}
      >
        {/* Poker table felt pattern */}
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '900px',
            height: '500px',
            borderRadius: '50%',
            background: '#059669',
            opacity: 0.5,
          }}
        />

        {/* Main content card */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            width: '900px',
            height: '350px',
            background: '#1F2937',
            borderRadius: '20px',
            border: '3px solid #FBBF24',
            padding: '60px',
          }}
        >
          {/* Poker chip icon */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '140px',
              height: '140px',
              borderRadius: '50%',
              background: '#059669',
              border: '5px solid #FBBF24',
              marginRight: '60px',
              position: 'relative',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '100px',
                height: '100px',
                borderRadius: '50%',
                background: '#047857',
                border: '2px solid #FBBF24',
                fontSize: '48px',
              }}
            >
              ♠
            </div>
          </div>

          {/* Text content */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              flex: 1,
            }}
          >
            <h1
              style={{
                fontSize: '72px',
                fontWeight: 800,
                color: '#FFFFFF',
                margin: 0,
                marginBottom: '20px',
                lineHeight: 1,
              }}
            >
              PokerBros
            </h1>
            <p
              style={{
                fontSize: '36px',
                fontWeight: 400,
                color: '#FBBF24',
                margin: 0,
                marginBottom: '30px',
                lineHeight: 1.2,
              }}
            >
              Never Miss a Full Table
            </p>
            <p
              style={{
                fontSize: '28px',
                fontWeight: 300,
                color: '#D1D5DB',
                margin: 0,
                lineHeight: 1.4,
              }}
            >
              Manage your home poker games with
              <br />
              real-time tracking and player statistics
            </p>
          </div>

          {/* Decorative cards */}
          <div
            style={{
              display: 'flex',
              gap: '10px',
              position: 'absolute',
              bottom: '30px',
              right: '30px',
            }}
          >
            {/* Card 1 - Ace of Spades */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                width: '60px',
                height: '90px',
                background: '#FFFFFF',
                borderRadius: '5px',
                border: '2px solid #D1D5DB',
                padding: '8px',
                fontSize: '24px',
                fontWeight: 'bold',
              }}
            >
              <span style={{ color: '#000000' }}>A</span>
              <span style={{ color: '#000000', fontSize: '20px' }}>♠</span>
            </div>
            {/* Card 2 - King of Hearts */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                width: '60px',
                height: '90px',
                background: '#FFFFFF',
                borderRadius: '5px',
                border: '2px solid #D1D5DB',
                padding: '8px',
                fontSize: '24px',
                fontWeight: 'bold',
              }}
            >
              <span style={{ color: '#EF4444' }}>K</span>
              <span style={{ color: '#EF4444', fontSize: '20px' }}>♥</span>
            </div>
          </div>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
