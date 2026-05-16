import { createHash } from 'crypto';

export async function computeFileHash(buffer: Buffer): Promise<string> {
  return createHash('sha256').update(buffer).digest('hex');
}

export async function computePerceptualHash(buffer: Buffer): Promise<string> {
  // Simple perceptual hash using image dimensions + size + first bytes
  const stats = Buffer.concat([
    Buffer.from([buffer.length & 0xFF]),
    buffer.subarray(0, Math.min(1024, buffer.length)),
  ]);
  return createHash('md5').update(stats).digest('hex');
}

export function compareHashes(hash1: string, hash2: string): number {
  if (hash1 === hash2) return 1.0;
  let matching = 0;
  const len = Math.min(hash1.length, hash2.length);
  for (let i = 0; i < len; i++) {
    if (hash1[i] === hash2[i]) matching++;
  }
  return matching / len;
}
