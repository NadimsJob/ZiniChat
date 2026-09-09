import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export const alt = 'ZiniChat | AI Chatbot & WhatsApp Automation Platform';
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
          backgroundColor: '#090d16',
          backgroundImage: 'radial-gradient(circle at 50% 0%, #1f824a 0%, #090d16 70%)',
          fontFamily: 'sans-serif',
          color: 'white',
          padding: '40px 60px',
          textAlign: 'center',
          position: 'relative',
        }}
      >
        {/* Brand Badge */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            backgroundColor: 'rgba(31, 130, 74, 0.2)',
            border: '1px solid rgba(31, 130, 74, 0.4)',
            borderRadius: '50px',
            padding: '8px 24px',
            fontSize: '18px',
            fontWeight: 700,
            color: '#22c55e',
            marginBottom: '30px',
          }}
        >
          <span>🚀 AI-POWERED BUSINESS AUTOMATION</span>
        </div>

        {/* Title */}
        <div
          style={{
            fontSize: '56px',
            fontWeight: 900,
            letterSpacing: '-1px',
            lineHeight: '1.1',
            marginBottom: '20px',
            maxWidth: '950px',
          }}
        >
          Omnichannel AI Chatbot & WhatsApp Automation
        </div>

        {/* Subtitle */}
        <div
          style={{
            fontSize: '24px',
            color: '#94a3b8',
            maxWidth: '800px',
            lineHeight: '1.4',
            marginBottom: '40px',
          }}
        >
          Automate customer support 24/7 on WhatsApp, Messenger & Instagram. Setup in 5 minutes.
        </div>

        {/* Footer brand */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            fontSize: '28px',
            fontWeight: 800,
            color: '#ee8d27',
          }}
        >
          <span>ZiniChat</span>
          <span style={{ color: '#475569' }}>|</span>
          <span style={{ color: '#cbd5e1', fontSize: '20px', fontWeight: 500 }}>
            zinichat.com
          </span>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
