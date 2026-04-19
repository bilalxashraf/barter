import { ImageResponse } from 'next/og';

export const size = { width: 180, height: 180 };
export const contentType = 'image/png';
export const runtime = 'edge';

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #6D28D9, #A78BFA)',
          color: '#fff',
          fontSize: '72px',
          fontWeight: 700
        }}
      >
        I
      </div>
    ),
    {
      width: size.width,
      height: size.height
    }
  );
}
