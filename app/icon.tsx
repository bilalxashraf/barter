import { ImageResponse } from 'next/og';

export const size = { width: 32, height: 32 };
export const contentType = 'image/png';
export const runtime = 'edge';

export default function Icon() {
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
          fontSize: '18px',
          fontWeight: 700
        }}
      >
        B
      </div>
    ),
    {
      width: size.width,
      height: size.height
    }
  );
}
