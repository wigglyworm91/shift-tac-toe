import type { WebSocket } from 'ws';

export interface Room {
  code: string;
  redSocket: WebSocket | null;
  blackSocket: WebSocket | null;
  creatorName: string;
}

const rooms = new Map<string, Room>();
const socketToRoom = new Map<WebSocket, Room>();

// Separate preview cache for OG tags — persists after the room closes so
// Discord's crawler (which arrives seconds after the link is shared) can still
// read the creator's name even if the game has already started/ended.
const PREVIEW_TTL_MS = 60 * 60 * 1000; // 1 hour
const previews = new Map<string, { creatorName: string; expiresAt: number }>();

export function getPreview(code: string): { creatorName: string } | null {
  const p = previews.get(code);
  if (!p) return null;
  if (Date.now() > p.expiresAt) { previews.delete(code); return null; }
  return { creatorName: p.creatorName };
}

function generateCode(): string {
  // 6-char alphanumeric, uppercase
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

export function createRoom(socket: WebSocket, creatorName: string): string {
  let code = generateCode();
  // Extremely unlikely collision, but be safe
  while (rooms.has(code)) code = generateCode();

  const room: Room = { code, redSocket: socket, blackSocket: null, creatorName };
  rooms.set(code, room);
  socketToRoom.set(socket, room);

  // Store preview for OG tag generation (survives room closure)
  previews.set(code, { creatorName, expiresAt: Date.now() + PREVIEW_TTL_MS });

  return code;
}

export function joinRoom(code: string, socket: WebSocket): Room | null {
  const room = rooms.get(code);
  if (!room) return null;
  if (room.blackSocket !== null) return null; // already full

  room.blackSocket = socket;
  socketToRoom.set(socket, room);
  return room;
}

export function getRoomForSocket(socket: WebSocket): Room | null {
  return socketToRoom.get(socket) ?? null;
}

export function removeRoom(code: string): void {
  const room = rooms.get(code);
  if (!room) return;
  if (room.redSocket) socketToRoom.delete(room.redSocket);
  if (room.blackSocket) socketToRoom.delete(room.blackSocket);
  rooms.delete(code);
}
