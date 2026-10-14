export const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export async function get(path) {
  const res = await fetch(API + path, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Request failed (${res.status})`);
  return res.json();
}
