import { ogSize, createOgImage } from './_lib/og-image';

export const runtime = 'edge';
export const size = ogSize;
export const contentType = 'image/png';

export default function TwitterImage() {
  return createOgImage();
}
